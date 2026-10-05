import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { login, unique } from './helpers'

/** Testin kendi müşterisi, aracı ve şoförüyle iki teslim edilmiş sefer (API üzerinden, oturum çereziyle). */
async function deliveredTrips(request: APIRequestContext, id: string) {
  const ok = async <T>(res: Promise<APIResponse>) => {
    const r = await res
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const customer = await ok<{ customer: { id: number } }>(request.post('/api/customers', { data: { title: `E2E Toplu ${id}` } }))
  const driver = await ok<{ id: number }>(request.post('/api/drivers', { data: { fullName: `E2E Toplu Şoför ${id}`, isActive: true } }))
  const vehicle = await ok<{ id: number }>(request.post('/api/vehicles', {
    data: { plate: `34 TB ${id.slice(-4)}`, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own' },
  }))
  const trips: number[] = []
  for (const to of ['Ankara', 'Bursa']) {
    const t = await ok<{ id: number }>(request.post('/api/trips', {
      data: { customerId: customer.customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'İstanbul', deliveryAddress: to,
        loadingDate: new Date().toISOString().slice(0, 10), vehicleCost: 10000, salePrice: 15000 },
    }))
    for (const status of ['Loaded', 'OnRoad', 'Delivered']) await ok(request.post(`/api/trips/${t.id}/status`, { data: { status } }))
    trips.push(t.id)
  }
  return { customerId: customer.customer.id, trips }
}

test('sevkiyatlarda 2 sevkiyat seçip teslim evrakını toplu onaylama', async ({ page }) => {
  const id = unique()
  await login(page)
  const { customerId } = await deliveredTrips(page.request, id)

  await page.getByRole('link', { name: 'Sevkiyatlar', exact: true }).click()
  await page.getByPlaceholder('Müşteri, plaka, şoför, adres...').fill(`E2E Toplu ${id}`)
  const boxes = page.getByRole('checkbox', { name: new RegExp(`^Seç: Sevkiyat \\d+, E2E Toplu ${id}`) })
  // Arama sunucuda süzülene kadar bekle: listede yalnız bu iki sefer kalmalı ("tümünü seç" sayfadakilerin hepsini seçer).
  await expect(page.getByRole('checkbox', { name: /^Seç: Sevkiyat / })).toHaveCount(2)
  await expect(boxes).toHaveCount(2)

  // Tek tek seçim → alt çubuk
  await boxes.nth(0).check()
  await boxes.nth(1).check()
  const bar = page.getByRole('region', { name: 'Seçilen kayıtlar' })
  await expect(bar).toContainText('2 kayıt seçildi')

  // Seçimi kaldır, sonra sayfadakilerin tümünü seç
  await bar.getByRole('button', { name: 'Seçimi kaldır' }).click()
  await expect(bar).toBeHidden()
  await page.getByRole('checkbox', { name: 'Bu sayfadaki tüm kayıtları seç' }).check()
  await expect(bar).toContainText('2 kayıt seçildi')

  await bar.getByRole('button', { name: 'Teslim evrakını onayla' }).click()
  await expect(page.getByText('2 sevkiyatın teslim evrakı onaylandı.')).toBeVisible()
  await expect(bar).toBeHidden()

  const pending = await page.request.get(`/api/trips?pendingDeliveryDocument=true&customerId=${customerId}`)
  expect((await pending.json()).total).toBe(0)

  // Aynı müşterinin seferleriyle "Fatura kes": fatura ekranı seçilen seferlerle açılır.
  await page.getByRole('checkbox', { name: 'Bu sayfadaki tüm kayıtları seç' }).check()
  await bar.getByRole('button', { name: 'Fatura kes' }).click()
  await expect(page.getByRole('heading', { name: 'Yeni Fatura' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /^Sevkiyat \d+$/ })).toHaveCount(2)
  for (const box of await page.getByRole('checkbox', { name: /^Sevkiyat \d+$/ }).all()) await expect(box).toBeChecked()
})
