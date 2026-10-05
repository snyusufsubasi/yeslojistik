import { expect, test, type APIResponse } from '@playwright/test'
import { login, unique } from '../helpers'

test('Müşteriler Cari satırından "Tahsilat Ekle" müşteri seçili tahsilat formunu açar', async ({ page }) => {
  await login(page)
  await page.goto('/cari/musteriler')
  await page.getByRole('radio', { name: 'Hepsi' }).click()
  const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Tahsilat Ekle' }) }).first()
  await row.getByRole('button', { name: 'Tahsilat Ekle' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('input[name=customerId]')).not.toHaveValue('')
})

test('Fatura kesme: KDV oranı farklı sevkiyatlar seçilince uyarı hemen çıkar, "Faturayı Kes" pasif', async ({ page }) => {
  const id = unique()
  await login(page)
  const ok = async <T>(res: Promise<APIResponse>) => { const r = await res; expect(r.ok(), await r.text()).toBeTruthy(); return (await r.json()) as T }
  const customer = await ok<{ customer: { id: number } }>(page.request.post('/api/customers', { data: { title: `E2E KDV ${id}` } }))
  const driver = await ok<{ id: number }>(page.request.post('/api/drivers', { data: { fullName: `E2E KDV Şoför ${id}`, isActive: true } }))
  const vehicle = await ok<{ id: number }>(page.request.post('/api/vehicles', { data: { plate: `34 KD ${id.slice(-4)}`, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own' } }))
  const ids: number[] = []
  for (const rate of [0, 20]) {
    const t = await ok<{ id: number }>(page.request.post('/api/trips', { data: {
      customerId: customer.customer.id, vehicleId: vehicle.id, driverId: driver.id, loadingAddress: 'İstanbul', deliveryAddress: 'Ankara',
      loadingDate: new Date().toISOString().slice(0, 10), vehicleCost: 1000, salePrice: 1500, terms: { saleVatRate: rate } } }))
    for (const status of ['Loaded', 'OnRoad', 'Delivered']) await ok(page.request.post(`/api/trips/${t.id}/status`, { data: { status } }))
    ids.push(t.id)
  }
  await page.goto(`/faturalar/yeni?customerId=${customer.customer.id}&tripIds=${ids.join(',')}`)
  await expect(page.getByRole('alert').filter({ hasText: 'KDV oranları farklı' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Faturayı Kes' })).toBeDisabled()
  await page.getByRole('checkbox', { name: `Sevkiyat ${ids[0]}` }).uncheck()
  await expect(page.getByRole('alert').filter({ hasText: 'KDV oranları farklı' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Faturayı Kes' })).toBeEnabled()
})
