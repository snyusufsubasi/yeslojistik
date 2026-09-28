import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('harita, sefer dosyaları ve müşteri takip linki', async ({ page, context, playwright }) => {
  // Hazırlık: 34 VES 01 ile yola çıkmış bir sefer ve şoför uygulamasından gelen konumlar
  const office = await playwright.request.newContext({ baseURL: 'http://localhost:5080' })
  expect((await office.post('/api/auth/login', { data: { email: 'admin@yeslojistik.com', password: 'Admin123!' } })).ok()).toBeTruthy()
  const driver = (await (await office.get('/api/drivers?search=Mehmet')).json()).items[0]
  const vehicle = (await (await office.get('/api/vehicles?search=34 VES 01')).json()).items[0]
  const customer = (await (await office.get('/api/customers?search=Yıldız')).json()).items[0]
  const target = `Takip Testi ${Date.now().toString().slice(-5)}`
  const trip = await (await office.post('/api/trips', { data: {
    customerId: customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'İstanbul / Tuzla',
    deliveryAddress: target, loadingDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }), vehicleCost: 18000, salePrice: 25000 } })).json()
  for (const status of ['Loaded', 'OnRoad']) expect((await office.post(`/api/trips/${trip.id}/status`, { data: { status } })).ok()).toBeTruthy()
  const mobile = await playwright.request.newContext({ baseURL: 'http://localhost:5080' })
  const token = (await (await mobile.post('/api/auth/token', { data: { email: 'sofor@yeslojistik.com', password: 'Sofor123!' } })).json()).accessToken
  const now = Date.now()
  const pings = [0, 1, 2].map((i) => ({ latitude: 40.8 - i * 0.2, longitude: 29.3 - i * 0.2, speedKmh: 80, recordedAt: new Date(now - (3 - i) * 60_000).toISOString() }))
  expect((await mobile.post('/api/driver/location', { data: pings, headers: { Authorization: `Bearer ${token}` } })).ok()).toBeTruthy()
  await office.dispose()
  await mobile.dispose()

  await login(page)

  // Harita: örnek veride yoldaki araç konumu var
  await page.getByRole('link', { name: 'Araç Takip Haritası' }).click()
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await expect(page.locator('.leaflet-marker-pane').getByText('34 VES 01')).toBeVisible()
  await page.getByRole('button', { name: /^34 VES 01 Yolda/ }).click()
  await expect(page.locator('path.leaflet-interactive')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/desktop-map.png' })

  // Yoldaki seferi aç → Dosyalar sekmesi → PDF yükle
  await page.getByRole('link', { name: 'Seferler', exact: true }).click()
  await page.getByPlaceholder('Müşteri, plaka, şoför, adres...').fill(target)
  await page.getByRole('row', { name: new RegExp(target) }).click()
  const dialog = page.getByRole('dialog', { name: 'Sefer Düzenle' })
  await dialog.getByRole('button', { name: 'Dosyalar / Fotoğraflar' }).click()
  await dialog.getByLabel('Dosya seç').setInputFiles({ name: 'irsaliye.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%test\n') })
  await expect(page.getByText('Dosya yüklendi.')).toBeVisible()
  await expect(dialog.getByText('irsaliye.pdf').first()).toBeVisible()

  // Takip linki
  await dialog.getByRole('button', { name: 'Takip ve Rota' }).click()
  await expect(dialog.locator('.leaflet-container')).toBeVisible()
  await dialog.getByRole('button', { name: 'Takip Linki Oluştur' }).click()
  const url = await dialog.getByLabel('Takip linki').inputValue()
  expect(url).toMatch(/\/takip\/[\w-]+$/)
  await expect(dialog.getByRole('link', { name: 'WhatsApp ile Gönder' })).toHaveAttribute('href', /wa\.me/)

  // Giriş yapmamış müşteri gözüyle
  const anon = await context.browser()!.newContext()
  const p2 = await anon.newPage()
  await p2.goto(url.replace(/^https?:\/\/[^/]+/, 'http://localhost:5173'))
  await expect(p2.getByText('Araç yolda')).toBeVisible()
  await expect(p2.getByText('Yükünüz yolda')).toBeVisible()
  await expect(p2.getByRole('definition').filter({ hasText: '34 VES **' })).toBeVisible()
  await expect(p2.locator('.leaflet-container')).toBeVisible()
  await expect(p2.getByText('25.000')).toHaveCount(0)
  await p2.screenshot({ path: 'e2e/screenshots/public-tracking.png' })
  await anon.close()
})

test('şoför hesabı web panelinde mobil uygulamaya yönlendirilir', async ({ page }) => {
  await page.goto('/giris')
  await page.getByLabel('E-posta').fill('sofor@yeslojistik.com')
  await page.getByLabel('Şifre', { exact: true }).fill('Sofor123!')
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await expect(page.getByText('Şoför hesabı')).toBeVisible()
})
