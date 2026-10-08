import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { login, unique } from './helpers'

const iso = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const tr = (isoDate: string) => isoDate.split('-').reverse().join('.')

/** Testin kendi kayıtları: iki araç (biri şoförlü), bugün çakışan iki sevkiyat, yarın için bekleyen bir iş talebi. */
async function seed(request: APIRequestContext, id: string) {
  const ok = async <T>(res: Promise<APIResponse>) => {
    const r = await res
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const customer = (await ok<{ customer: { id: number; title: string } }>(request.post('/api/customers', { data: { title: `E2E Plan ${id}` } }))).customer
  const ali = await ok<{ id: number; fullName: string }>(request.post('/api/drivers', { data: { fullName: `E2E Plan Ali ${id}`, isActive: true } }))
  const veli = await ok<{ id: number; fullName: string }>(request.post('/api/drivers', {
    data: { fullName: `E2E Plan Veli ${id}`, isActive: true, srcExpiry: iso(3) },
  }))
  const vehicle = (plate: string, defaultDriverId: number | null) => ok<{ id: number; plate: string }>(request.post('/api/vehicles', {
    data: { plate, type: 'Tır', km: 0, status: 'Available', ownership: 'Own', defaultDriverId },
  }))
  const v1 = await vehicle(`34 PL ${id.slice(-4)}`, ali.id)
  const v2 = await vehicle(`34 PM ${id.slice(-4)}`, veli.id)
  const trip = (cust: string, days: number) => ok<{ id: number }>(request.post('/api/trips', {
    data: { customerId: customer.id, vehicleId: v1.id, driverId: ali.id, loadingAddress: `${cust} Tuzla`, deliveryAddress: 'Gebze depo',
      loadingDate: iso(days), vehicleCost: 1000, salePrice: 2000, loadingCity: 'İstanbul', deliveryCity: 'Kocaeli' },
  }))
  const a = await trip('A', 0)
  const b = await trip('B', 0)
  const req = await ok<{ id: number }>(request.post('/api/job-requests', {
    data: { customerId: customer.id, date: iso(1), loadingAddress: 'İstanbul / Tuzla', deliveryAddress: 'İzmir / Bornova', vehicleType: 'Tır',
      cargoType: 'Mobilya', salePrice: 25000, carrierPrice: 17000, customerPays: false },
  }))
  return { customer, ali, veli, v1, v2, a, b, req }
}

test('Planlama panosu: çakışma uyarısı, iş talebini sürükleyip araca atama, sevkiyatı taşıma', async ({ page }) => {
  const id = unique()
  await login(page)
  const s = await seed(page.request, id)

  // Menüden açılır.
  await page.getByRole('link', { name: 'Planlama' }).first().click()
  await expect(page).toHaveURL(/\/planlama/)
  await expect(page.getByRole('heading', { name: 'Planlama', level: 1 })).toBeVisible()
  const board = page.getByRole('region', { name: 'Araç × gün panosu' })
  await expect(board.getByRole('columnheader', { name: /Bugün/ })).toBeVisible()
  await expect(board.getByRole('columnheader', { name: /Yarın/ })).toBeVisible()

  // Aynı araçta aynı gün iki yükleme: iki kartta da "Araç çakışması".
  const row1 = board.getByRole('row', { name: s.v1.plate })
  await expect(row1.getByRole('article', { name: `Sevkiyat ${s.customer.title}` })).toHaveCount(2)
  await expect(row1.getByText('Çakışma', { exact: true })).toHaveCount(2)

  // Atanmamış iş talebi sağ/üst panelde; v2'nin yarın hücresine sürüklenince sevkiyat açılır (şoför: aracın şoförü).
  const unassigned = page.getByRole('region', { name: 'Atanmamış işler' })
  const card = unassigned.getByRole('listitem', { name: `İş talebi ${s.customer.title}` })
  await expect(card).toBeVisible()
  // Şerit panonun üstünde yapışkan: önce hedef satıra kaydır, sonra kartı hücreye bırak.
  const target = board.getByRole('gridcell', { name: `${s.v2.plate} ${tr(iso(1))}` })
  await target.scrollIntoViewIfNeeded()
  await card.dragTo(target)
  await expect(page.getByText('Sevkiyat açıldı ve araca atandı.')).toBeVisible()
  await expect(card).toHaveCount(0)
  const row2 = board.getByRole('row', { name: s.v2.plate })
  await expect(row2.getByRole('article', { name: `Sevkiyat ${s.customer.title}` })).toHaveCount(1)
  // Veli'nin SRC belgesi 3 gün sonra doluyor: şoför panelinde uyarı.
  await expect(page.getByRole('region', { name: 'Şoför müsaitliği' }).getByRole('listitem').filter({ hasText: s.veli.fullName }).getByText(/SRC belgesi: 3 gün kaldı/)).toBeVisible()

  // Çakışan b sevkiyatını "Taşı" penceresiyle v2'ye, iki gün sonraya taşı → çakışma kalkar.
  const bCard = row1.getByRole('article', { name: `Sevkiyat ${s.customer.title}` }).filter({ has: page.locator(`a[href$="?id=${s.b.id}"]`) })
  await bCard.hover()
  await bCard.getByRole('button', { name: /Sevkiyatı taşı/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Sevkiyatı taşı' })
  await dialog.getByLabel('Yükleme günü').fill(tr(iso(2)))
  await dialog.getByLabel('Yükleme günü').press('Tab')
  await dialog.getByRole('combobox', { name: 'Araç' }).selectOption(String(s.v2.id))
  await dialog.getByRole('button', { name: 'Taşı', exact: true }).click()
  await expect(page.getByText('Atama kaydedildi.')).toBeVisible()
  await expect(row1.getByText('Çakışma', { exact: true })).toHaveCount(0)
  await expect(row2.getByRole('article', { name: `Sevkiyat ${s.customer.title}` })).toHaveCount(2)

  // Sevkiyatın zaman çizelgesine "Araç atandı" yazıldı.
  const events = await (await page.request.get(`/api/trips/${s.b.id}/events`)).json() as { note?: string }[]
  expect(events.some((e) => e.note?.startsWith('Araç atandı') && e.note.includes(s.v2.plate))).toBeTruthy()
})
