import { expect, test, type APIResponse } from '@playwright/test'
import { login, unique } from './helpers'

const iso = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('Planlama (telefon): gün gün liste, iş talebini "Ata" penceresiyle araca atama', async ({ page }) => {
  const id = unique()
  await login(page)
  const ok = async <T>(res: Promise<APIResponse>) => {
    const r = await res
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const rq = page.request
  const customer = (await ok<{ customer: { id: number; title: string } }>(rq.post('/api/customers', { data: { title: `E2E Mobil Plan ${id}` } }))).customer
  const driver = await ok<{ id: number }>(rq.post('/api/drivers', { data: { fullName: `E2E Mobil Şoför ${id}`, isActive: true } }))
  const vehicle = await ok<{ id: number; plate: string }>(rq.post('/api/vehicles', {
    data: { plate: `34 MP ${id.slice(-4)}`, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own', defaultDriverId: driver.id },
  }))
  await ok(rq.post('/api/trips', {
    data: { customerId: customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'Tuzla', deliveryAddress: 'Gebze',
      loadingDate: iso(0), vehicleCost: 1000, salePrice: 2000, loadingCity: 'İstanbul', deliveryCity: 'Kocaeli' },
  }))
  await ok(rq.post('/api/job-requests', {
    data: { customerId: customer.id, date: iso(0), loadingAddress: 'Tuzla', deliveryAddress: 'Bursa', customerPays: false, salePrice: 9000 },
  }))

  await page.goto('/planlama?gorunum=bugun')
  await expect(page.getByRole('heading', { name: 'Planlama', level: 1 })).toBeVisible()
  // Sayfa yana kaymaz.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  const today = page.getByRole('region', { name: /^Bugün / })
  await expect(today.getByRole('article', { name: `Sevkiyat ${customer.title}` })).toBeVisible()

  const unassigned = page.getByRole('region', { name: 'Atanmamış işler' })
  await unassigned.getByRole('button', { name: `Araca ata: ${customer.title}` }).click()
  const dialog = page.getByRole('dialog', { name: 'Araca ata' })
  await dialog.getByRole('combobox', { name: 'Araç' }).selectOption(String(vehicle.id))
  // Araç bugün dolu: uyarı gösterilir ama atama yapılabilir.
  await expect(dialog.getByRole('list', { name: 'Uyarılar' })).toContainText(`${vehicle.plate} bu gün dolu`)
  await dialog.getByRole('button', { name: 'Ata ve sevkiyat aç' }).click()
  await expect(page.getByText('Sevkiyat açıldı ve araca atandı.')).toBeVisible()
  await expect(today.getByRole('article', { name: `Sevkiyat ${customer.title}` })).toHaveCount(2)
  await expect(today.getByRole('article', { name: `Sevkiyat ${customer.title}` }).getByText('Çakışma', { exact: true })).toHaveCount(2)
})
