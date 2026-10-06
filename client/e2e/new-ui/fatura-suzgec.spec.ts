import { expect, test, type APIResponse } from '@playwright/test'
import { login, unique, useNewUi } from '../helpers'

/**
 * e-Fatura sayaç kutuları ve süzgeç paneli.
 * Şartname: docs/plan/06-FATURALANDIRILACAKLAR.md §3 (üstteki sayaç satırı), §4 (süzgeç paneli, kutuya tıklayınca süzme),
 * §9 (sayaç sayısı liste uzunluğuyla birebir uyuşur). Sözleşme: docs/plan/30-VERI-API.md §10.2 (`GET /api/invoices/counters`).
 *
 * Sayaçlar sunucudan gelen gerçek kayıtlardan hesaplanır; istemci sayı uydurmaz. Test önce kendi müşterisini,
 * iki teslim edilmiş sevkiyatını ve bir taslak faturasını kurar (`cari-invoice.spec.ts` deseni).
 */
const ok = async <T>(res: Promise<APIResponse>) => { const r = await res; expect(r.ok(), await r.text()).toBeTruthy(); return (await r.json()) as T }
const today = () => new Date().toISOString().slice(0, 10)

test('e-Fatura sayaç kutuları gerçek kayıtlarla dolar; faturalandırılacak sayısı listeyle uyuşur', async ({ page }) => {
  const id = unique()
  await useNewUi(page)
  await login(page)

  const customer = await ok<{ customer: { id: number } }>(page.request.post('/api/customers', { data: { title: `E2E Sayaç ${id}` } }))
  const driver = await ok<{ id: number }>(page.request.post('/api/drivers', { data: { fullName: `E2E Sayaç Şoför ${id}`, isActive: true } }))
  const vehicle = await ok<{ id: number }>(page.request.post('/api/vehicles', { data: { plate: `34 SC ${id.slice(-4)}`, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own' } }))
  for (const price of [1500, 2500]) {
    const trip = await ok<{ id: number }>(page.request.post('/api/trips', { data: {
      customerId: customer.customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'İstanbul', deliveryAddress: 'Ankara',
      loadingDate: today(), vehicleCost: 500, salePrice: price } }))
    for (const status of ['Loaded', 'OnRoad', 'Delivered']) await ok(page.request.post(`/api/trips/${trip.id}/status`, { data: { status } }))
  }
  await ok(page.request.post('/api/invoices', { data: {
    customerId: customer.customer.id, date: today(), vatRate: 20, withholdingTenths: 0, asDraft: true, tripIds: [],
    extraLines: [{ tripId: null, description: `E2E taslak ${id}`, amount: 100 }] } }))

  // Sayaç ucu, sevkiyat listesinin "faturasız + teslim edildi" kümesini sayar (uydurma sayı yok).
  const counters = await ok<{ draft: number; todayIssued: number; overdue: number; uninvoicedTrips: number }>(page.request.get('/api/invoices/counters'))
  const pending = await ok<{ total: number }>(page.request.get('/api/trips?invoiced=false&status=Delivered&pageSize=1'))
  expect(counters.uninvoicedTrips).toBe(pending.total)
  expect(counters.draft).toBeGreaterThanOrEqual(1)

  await page.goto('/faturalar')
  const boxes = page.locator('[aria-label="Fatura sayaçları"]')
  await expect(boxes).toBeVisible()
  // Beş kutu: Faturalandırılacak · Taslak · Bugün kesilen · İptal · Vadesi geçen.
  for (const label of ['Faturalandırılacak', 'Taslak', 'Bugün kesilen', 'İptal', 'Vadesi geçen']) {
    await expect(boxes.getByText(label, { exact: true })).toBeVisible()
  }
  // Kutudaki sayı sunucunun döndürdüğü sayıdır.
  await expect(boxes.getByRole('button', { name: /Faturalandırılacak/ })).toContainText(new RegExp(`${counters.uninvoicedTrips}\\s*sevkiyat`))
  await expect(boxes.getByRole('button', { name: /^Taslak/ })).toContainText(String(counters.draft))

  // "Faturalandırılacak" kutusu bekleyen sekmesini açar ve sekmeyi listeyle aynı sayıyı yazar.
  await boxes.getByRole('button', { name: /Faturalandırılacak/ }).click()
  await expect(page).toHaveURL(/sekme=bekleyen/)
  const pendingFigures = page.locator('[aria-label="Faturalandırılacaklar"]')
  await expect(pendingFigures.getByText('Faturalanacak sevkiyat')).toBeVisible()
  await expect(pendingFigures.getByText('Faturalanacak sevkiyat').locator('..')).toContainText(String(counters.uninvoicedTrips))
  await expect(page.getByText(`E2E Sayaç ${id}`).first()).toBeVisible()
})

test('e-Fatura süzgeci panelden yönetilir ve değerler adreste kalır (?durum=, ?sevkiyat=)', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  await page.goto('/faturalar')

  // Süzgeç paneli: sevkiyat no, müşteri ve tarih aralığı burada (şartname 06 §4).
  await page.getByRole('button', { name: /^Süzgeç/ }).click()
  const panel = page.getByRole('dialog', { name: 'Süzgeç' })
  await expect(panel).toBeVisible()
  await panel.getByLabel('Sevkiyat no').fill('987654321')
  await panel.getByRole('button', { name: 'Listeyi göster' }).click()
  await expect(panel).toBeHidden()

  // Değer adreste durur ve sayfa yenilenince korunur.
  await expect(page).toHaveURL(/sevkiyat=987654321/)
  await page.reload()
  await expect(page.getByRole('button', { name: /Sevkiyat no: 987654321/ })).toBeVisible()
  await expect(page.getByText('Bu filtrelere uyan fatura yok.')).toBeVisible()

  // Çip süzgeci kaldırır, adres temizlenir.
  await page.getByRole('button', { name: /Sevkiyat no: 987654321/ }).click()
  await expect(page).not.toHaveURL(/sevkiyat=/)
  await expect(page.getByRole('button', { name: /Sevkiyat no: 987654321/ })).toHaveCount(0)

  // Durum süzgeci (çubuktaki hızlı kutu) adrese yazılır.
  await page.locator('select[aria-label="Durum"]').selectOption('Draft')
  await expect(page).toHaveURL(/durum=Draft/)
  await expect(page.getByRole('button', { name: /Durum: Taslak/ })).toBeVisible()
  await page.reload()
  await expect(page.locator('select[aria-label="Durum"]')).toHaveValue('Draft')

  // Sayaç kutusu da süzgeci adrese yazar: "Bugün kesilen" → durum + bugünün tarihi.
  await page.locator('[aria-label="Fatura sayaçları"]').getByRole('button', { name: /Bugün kesilen/ }).click()
  await expect(page).toHaveURL(/durum=Issued/)
  await expect(page).toHaveURL(new RegExp(`bas=${today()}`))
  await expect(page.getByRole('button', { name: /Durum: Kesildi/ })).toBeVisible()

  // "Süzgeci temizle" hepsini kaldırır.
  await page.getByRole('button', { name: 'Süzgeci temizle' }).first().click()
  await expect(page).not.toHaveURL(/durum=|bas=|bit=/)
  await expect(page.locator('select[aria-label="Durum"]')).toHaveValue('')
})

test('klasik görünümdeki e-Fatura listesi değişmedi (sayaç kutusu ve süzgeç paneli yok)', async ({ page }) => {
  await login(page)
  await page.goto('/faturalar')
  await expect(page.getByRole('heading', { name: 'Faturalar', level: 1 })).toBeVisible()
  // Klasikte düğmeler başlıkta durur (yeni görünümde "⋯ Diğer" menüsüne taşınır).
  await expect(page.getByRole('button', { name: 'Fatura İcmali' })).toBeVisible()
  await expect(page.getByRole('button', { name: "Excel'den Aktar" })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yeni Fatura' })).toBeVisible()
  // Sayaç kutuları ve süzgeç çubuğu YALNIZ yeni görünümde çizilir.
  await expect(page.locator('[aria-label="Fatura sayaçları"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Süzgeç/ })).toHaveCount(0)
  // Klasik süzgeç alanları kartın içinde kalır.
  await expect(page.getByLabel('Sevkiyat no')).toBeVisible()
  await expect(page.locator('select[aria-label="Durum"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fatura Listesi' })).toBeVisible()
})
