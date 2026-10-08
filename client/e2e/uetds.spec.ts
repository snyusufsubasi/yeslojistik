import { expect, test } from '@playwright/test'
import { API_URL, login, unique } from './helpers'

// Kimlik numaraları uydurmadır (algoritmaya uyan sahte örnekler); gerçek kişilere ait değildir.
const FAKE_TCKN = '12345678950'

test('U-ETDS hazırlığı: TCKN eksik şoförlü sevkiyat "eksik" görünür, şoför düzeltilince "Hazır" olur', async ({ page, playwright }) => {
  // Hazırlık (API): sefer, şoförün TCKN ve telefonu dışında tam.
  const u = unique()
  const office = await playwright.request.newContext({ baseURL: API_URL })
  expect((await office.post('/api/auth/login', { data: { email: 'admin@yeslojistik.com', password: 'Admin123!' } })).ok()).toBeTruthy()
  const customer = (await (await office.post('/api/customers', { data: { title: `UETDS Müşteri ${u}`, taxNumber: '1234567890' } })).json()).customer
  const driver = await (await office.post('/api/drivers', { data: { fullName: `UETDS Şoför ${u}`, isActive: true } })).json()
  const vehicle = await (await office.post('/api/vehicles', { data: { plate: `34 UT ${u.slice(-5)}`, type: 'Kamyon', km: 0, status: 'Available' } })).json()
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  const tripRes = await office.post('/api/trips', { data: {
    customerId: customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'Tuzla OSB', deliveryAddress: 'Bornova sanayi',
    loadingDate: today, vehicleCost: 1000, salePrice: 2000, cargoType: 'Mobilya', cargoWeightKg: 12000, loadingCity: 'İstanbul', deliveryCity: 'İzmir',
    uetds: { loadingDistrict: 'Tuzla', deliveryDistrict: 'Bornova', loadingTime: '08:30', consigneeTitle: 'Alıcı Ticaret A.Ş.', consigneeTaxNumber: '10000000146' } } })
  expect(tripRes.ok()).toBeTruthy()
  const trip = await tripRes.json()
  await office.dispose()

  await login(page)

  // Sevkiyatlar: ayrıntılı süzgeçte "U-ETDS eksik olanlar" bu seferi gösterir.
  await page.goto(`/seferler?q=${encodeURIComponent(`UETDS Müşteri ${u}`)}`)
  await page.locator('button[aria-controls=trip-filters]').click()
  await page.getByLabel('U-ETDS hazırlığı').selectOption({ label: 'U-ETDS eksik olanlar' })
  await expect(page).toHaveURL(/uetds=missing/)
  const row = page.locator('tbody tr').filter({ hasText: `UETDS Müşteri ${u}` })
  await expect(row).toHaveCount(1)
  await expect(row.getByText('UETDS 2 eksik')).toBeVisible()

  // Sefer: "U-ETDS hazırlığı" paneli 2 eksik gösterir ve nedenini yazar.
  await page.goto(`/seferler?id=${trip.id}`)
  const panel = page.getByRole('region', { name: 'U-ETDS hazırlığı' })
  await expect(panel.getByText('2 eksik')).toBeVisible()
  await expect(panel.getByText('Şoförün TC kimlik numarası girilmemiş.')).toBeVisible()
  await expect(panel.getByText('Şoförün telefonu girilmemiş.')).toBeVisible()
  await expect(panel.getByText('Bakanlığa bildirim göndermez')).toBeVisible()
  await expect(panel.getByRole('link', { name: /Şoförü düzenle/ }).first()).toHaveAttribute('href', `/soforler?id=${driver.id}`)

  // Düzeltme: şoför kartına TCKN ve telefon yazılır.
  await page.goto(`/soforler?id=${driver.id}`)
  await page.getByLabel('TC Kimlik No').fill(FAKE_TCKN)
  await page.getByLabel('Telefon', { exact: true }).fill('0532 123 45 67')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Şoför güncellendi.')).toBeVisible()

  // Sefer yeniden açılınca "Hazır"; süzgeçte de artık yok.
  await page.goto(`/seferler?id=${trip.id}`)
  await expect(page.getByRole('region', { name: 'U-ETDS hazırlığı' }).getByText('Hazır', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'U-ETDS hazırlığı' }).getByText('eksik', { exact: false })).toHaveCount(0)
  await page.goto(`/seferler?q=${encodeURIComponent(`UETDS Müşteri ${u}`)}&uetds=missing`)
  await expect(page.getByLabel('U-ETDS hazırlığı')).toHaveValue('missing')
  await expect(page.locator('tbody tr').filter({ hasText: `UETDS Müşteri ${u}` })).toHaveCount(0)
  await page.getByRole('button', { name: 'Süzgeci temizle' }).click()
  await expect(page.locator('tbody tr').filter({ hasText: `UETDS Müşteri ${u}` }).getByText('UETDS hazır')).toBeVisible()
})

test('U-ETDS hazırlığı: sevkiyat formundaki alanlar doldurulup kaydedilince panel güncellenir', async ({ page, playwright }) => {
  const u = unique()
  const office = await playwright.request.newContext({ baseURL: API_URL })
  expect((await office.post('/api/auth/login', { data: { email: 'admin@yeslojistik.com', password: 'Admin123!' } })).ok()).toBeTruthy()
  const customer = (await (await office.post('/api/customers', { data: { title: `UETDS Form ${u}`, taxNumber: '1234567890' } })).json()).customer
  const driver = await (await office.post('/api/drivers', { data: { fullName: `UETDS Form Şoför ${u}`, phone: '0532 123 45 67', nationalId: FAKE_TCKN, isActive: true } })).json()
  const vehicle = await (await office.post('/api/vehicles', { data: { plate: `34 UF ${u.slice(-5)}`, type: 'Kamyon', km: 0, status: 'Available' } })).json()
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  const trip = await (await office.post('/api/trips', { data: {
    customerId: customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'Tuzla OSB', deliveryAddress: 'Bornova sanayi',
    loadingDate: today, vehicleCost: 1000, salePrice: 2000, cargoType: 'Mobilya', cargoWeightKg: 12000, loadingCity: 'İstanbul', deliveryCity: 'İzmir' } })).json()
  await office.dispose()

  await login(page)
  await page.goto(`/seferler?id=${trip.id}`)
  const panel = page.getByRole('region', { name: 'U-ETDS hazırlığı' })
  await expect(panel.getByText('5 eksik')).toBeVisible()

  await page.getByLabel('Yükleme İlçesi').fill('Tuzla')
  await page.getByLabel('Teslim İlçesi').fill('Bornova')
  await page.getByLabel('Yükleme Saati').fill('08:30')
  await page.getByLabel('Alıcı Unvanı / Adı Soyadı').fill('Alıcı Ticaret A.Ş.')
  await page.getByLabel('Alıcı VKN / TCKN').fill('10000000146')
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click()
  await expect(page.getByText('Sevkiyat güncellendi.')).toBeVisible()

  await page.goto(`/seferler?id=${trip.id}`)
  await expect(page.getByRole('region', { name: 'U-ETDS hazırlığı' }).getByText('Hazır', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Yükleme Saati')).toHaveValue('08:30')
})
