import { expect, test } from '@playwright/test'

// Şoför uygulamasının web önizlemesi (Expo export) üzerinde uçtan uca akış.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, geolocation: { latitude: 40.1, longitude: 29.0 }, permissions: ['geolocation'] })

test('şoför uygulaması: giriş → sefer → yükü aldım → fotoğraf', async ({ page, playwright }) => {
  page.on('dialog', (d) => d.accept())
  // Ofisten şoföre yeni bir sefer ata
  const office = await playwright.request.newContext({ baseURL: 'http://localhost:5080' })
  expect((await office.post('/api/auth/login', { data: { email: 'admin@yeslojistik.com', password: 'Admin123!' } })).ok()).toBeTruthy()
  const driver = (await (await office.get('/api/drivers?search=Mehmet')).json()).items[0]
  const vehicle = (await (await office.get('/api/vehicles?search=34 VES 01')).json()).items[0]
  const customer = (await (await office.get('/api/customers?search=Martur')).json()).items[0]
  const target = `Test Deposu ${Date.now().toString().slice(-5)}`
  const created = await office.post('/api/trips', { data: {
    customerId: customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'Bursa / Nilüfer',
    deliveryAddress: target, loadingDate: new Date().toISOString().slice(0, 10), vehicleCost: 1000, salePrice: 2000 } })
  expect(created.ok()).toBeTruthy()

  await page.goto('http://localhost:8082/')
  await page.getByText('Sunucu ayarı').click()
  await page.getByLabel('Sunucu adresi').fill('http://localhost:5080')
  await page.getByLabel('E-posta').fill('sofor@yeslojistik.com')
  await page.getByLabel('Şifre', { exact: true }).fill('Sofor123!')
  await page.screenshot({ path: 'e2e/screenshots/app-login.png' })
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await expect(page.getByText('Merhaba, Mehmet Yılmaz')).toBeVisible()
  await expect(page.getByText('Aracınız: 34 VES 01')).toBeVisible()
  await expect(page.getByText(target)).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/app-trips.png' })

  // Yeni sefer → detay → Yükü Aldım → Yola Çıktım → Teslim Ettim
  await page.getByText(target).click()
  await expect(page.getByText('Durum Güncelle')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/app-trip.png' })
  for (const action of ['Yükü Aldım', 'Yola Çıktım', 'Teslim Ettim']) {
    await page.getByRole('button', { name: action }).click()
    await expect(page.getByRole('button', { name: action })).toHaveCount(0)
  }
  await expect(page.getByText('Teslim Edildi').first()).toBeVisible()
  await expect(page.getByText('Durum Güncelle')).toHaveCount(0)

  // Yakıt masrafı (Türkçe ondalık yazımıyla)
  await page.getByLabel('Tutar').fill('4.450,50')
  await page.getByLabel('Litre').fill('100')
  await page.getByLabel('Araç kilometresi').fill('250000')
  await page.getByRole('button', { name: 'Masrafı Kaydet' }).click()
  await expect(page.getByText(/Yakıt · 4\.450,50 TL · 100 L · 250\.000 km/)).toBeVisible()

  // Galeriden fotoğraf (web'de dosya seçici)
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Galeriden' }).click()
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9])
  await (await chooser).setFiles({ name: 'teslim.jpg', mimeType: 'image/jpeg', buffer: jpeg })
  await expect(page.getByText(/teslim.*\.jpg/).first()).toBeVisible({ timeout: 10000 })
  await page.screenshot({ path: 'e2e/screenshots/app-trip-done.png' })

  // Ofis tarafında fotoğraf görünüyor
  const trips = (await (await office.get(`/api/trips?search=${encodeURIComponent(target)}`)).json()).items
  expect(trips[0].status).toBe('Delivered')
  const files = await (await office.get(`/api/trips/${trips[0].id}/attachments`)).json()
  expect(files).toHaveLength(1)
  const expenses = (await (await office.get(`/api/expenses?tripId=${trips[0].id}`)).json()).items
  expect(expenses).toEqual([expect.objectContaining({ category: 'Fuel', amount: 4450.5, liters: 100, odometer: 250000, driverName: 'Mehmet Yılmaz' })])
  await office.dispose()
})
