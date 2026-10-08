import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { login, unique } from './helpers'

const iso = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Testin kendi kaydı: yükleme günü çok önce geçmiş, hâlâ "Planlandı" duran (geciken) bir sevkiyat. */
async function lateTrip(request: APIRequestContext, id: string) {
  const ok = async <T>(res: Promise<APIResponse>) => {
    const r = await res
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const title = `E2E Bugün ${id}`
  const customer = await ok<{ customer: { id: number } }>(request.post('/api/customers', { data: { title } }))
  const driver = await ok<{ id: number }>(request.post('/api/drivers', { data: { fullName: `E2E Bugün Şoför ${id}`, isActive: true } }))
  const vehicle = await ok<{ id: number }>(request.post('/api/vehicles', {
    data: { plate: `34 BGN ${id.slice(-3)}`, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own' },
  }))
  // Çok eski tarih: geciken listesi en eski gecikmeden başladığı için kart ilk sırada gösterir.
  const trip = await ok<{ id: number }>(request.post('/api/trips', {
    data: { customerId: customer.customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'Tuzla', deliveryAddress: 'Gebze',
      loadingDate: iso(-900), vehicleCost: 1000, salePrice: 2000, loadingCity: 'İstanbul', deliveryCity: 'Kocaeli' },
  }))
  return { title, tripId: trip.id }
}

test('Bugün: girişten sonra ilk ekran; geciken sevkiyat kartı kayda ve süzülmüş listeye götürür', async ({ page }) => {
  const id = unique()
  await login(page)
  const trip = await lateTrip(page.request, id)

  // Girişten sonra açılan ekran "Bugün"; rakam panosu "Genel Bakış" sekmesinde.
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bugün', exact: true, level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Bugün sekmeleri' }).getByRole('tab', { name: 'Genel Bakış' })).toBeVisible()

  const card = page.getByRole('region', { name: 'Geciken sevkiyatlar' })
  await expect(card).toBeVisible()
  const row = card.getByRole('link', { name: new RegExp(trip.title) })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Yükleme 900 gün gecikti')

  // Satır: kaydın kendi ekranı açılır.
  await row.click()
  await expect(page).toHaveURL(new RegExp(`/seferler\\?id=${trip.tripId}`))
  await page.goBack()

  // "Tümünü gör / Listede aç": Sevkiyatlar aynı süzgeçle açılır, süzgeç çip olarak görünür ve kaldırılabilir.
  await card.getByRole('link', { name: 'Geciken sevkiyatlar: tümünü gör' }).click()
  await expect(page).toHaveURL(/\/seferler\?.*bugun=late/)
  const chip = page.getByRole('button', { name: /Bugün: Gecikenler/ })
  await expect(chip).toBeVisible()
  await page.goto(`/seferler?bugun=late&q=${encodeURIComponent(trip.title)}`)
  await expect(page.getByRole('row', { name: new RegExp(trip.title) })).toBeVisible()
  await chip.click()
  await expect(page).not.toHaveURL(/bugun=/)

  // Genel Bakış (eski ana sayfa) hâlâ açılır.
  await page.goto('/pano')
  await expect(page.getByRole('button', { name: /Tahsilat Bekleyen/ })).toBeVisible()
})

test('Bugün: telefonda yatay taşma yok', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await expect(page.getByRole('heading', { name: 'Bugün', exact: true, level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Bugün sekmeleri' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
