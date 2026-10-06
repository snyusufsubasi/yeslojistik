import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { login, unique, useNewUi } from '../helpers'

/** Testin kendi kaydı: teslim edilmiş, teslim evrakı henüz onaylanmamış bir sevkiyat (API üzerinden, oturum çereziyle). */
async function deliveredTrip(request: APIRequestContext, id: string) {
  const ok = async <T>(res: Promise<APIResponse>) => {
    const r = await res
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const customer = await ok<{ customer: { id: number } }>(request.post('/api/customers', { data: { title: `E2E Onay ${id}` } }))
  const driver = await ok<{ id: number }>(request.post('/api/drivers', { data: { fullName: `E2E Onay Şoför ${id}`, isActive: true } }))
  const vehicle = await ok<{ id: number }>(request.post('/api/vehicles', {
    data: { plate: `34 ON ${id.slice(-4)}`, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own' },
  }))
  const trip = await ok<{ id: number }>(request.post('/api/trips', {
    data: { customerId: customer.customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'İstanbul',
      deliveryAddress: 'İzmir', loadingDate: new Date().toISOString().slice(0, 10), vehicleCost: 9000, salePrice: 14000 },
  }))
  // Yüklendi → Yolda → Teslim Edildi: teslim evrakı onayı bu aşamada bekler.
  for (const status of ['Loaded', 'OnRoad', 'Delivered']) await ok(request.post(`/api/trips/${trip.id}/status`, { data: { status } }))
  return { customerTitle: `E2E Onay ${id}`, tripId: trip.id }
}

/**
 * Bugün ekranının "Onay Bekleyenler" sekmesi (adres: `/?tab=approvals`).
 * Liste mevcut uçlarla kurulur — `/api/trips?pendingDeliveryDocument=true` (teslim evrakı onayı bekleyenler)
 * ve `/api/expenses?approvalStatus=Pending` (onay bekleyen şoför masrafları); yeni bir uç eklenmez.
 */
test('Bugün: "Onay Bekleyenler" sekmesi adresi değiştirir ve onay bekleyen teslim evrakını listeler', async ({ page }) => {
  const id = unique()
  await useNewUi(page)
  await login(page)
  const trip = await deliveredTrip(page.request, id)

  const tabs = page.getByRole('navigation', { name: 'Bugün sekmeleri' })
  const approvals = tabs.getByRole('tab', { name: /^Onay Bekleyenler/ })
  await expect(approvals).toBeVisible()
  await expect(tabs.getByRole('tab', { name: 'Bugün', exact: true })).toHaveAttribute('aria-selected', 'true')

  await approvals.click()
  await expect(page).toHaveURL(/\?tab=approvals$/)
  await expect(approvals).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Onay Bekleyenler', level: 1 })).toBeVisible()

  // Onay bekleyen kayıt listede: müşteri adı, "Onay bekliyor" rozeti ve onaylama ekranına giden yol.
  const docs = page.getByRole('region', { name: 'Teslim evrakları · onay bekliyor' })
  await expect(docs).toBeVisible()
  await expect(docs.getByText(trip.customerTitle)).toBeVisible()
  await expect(docs.getByText('Onay bekliyor').first()).toBeVisible()
  await expect(docs.getByRole('button', { name: 'Sevkiyatlarda onayla →' })).toBeVisible()
  // Satıra tıklayınca kaydın kendi ekranı açılır.
  await docs.getByText(trip.customerTitle).click()
  await expect(page).toHaveURL(new RegExp(`/seferler\\?id=${trip.tripId}`))
  await page.goBack()

  // Sekmeden geri dönünce Bugün ekranı gelir.
  await tabs.getByRole('tab', { name: 'Bugün', exact: true }).click()
  await expect(page).not.toHaveURL(/tab=approvals/)
  await expect(page.getByRole('button', { name: 'Sevkiyatlarda onayla →' })).toBeHidden()
})
