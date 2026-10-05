import { expect, test, type APIResponse } from '@playwright/test'
import { login, pick, unique } from '../helpers'

test('Sevkiyat Ekle: kopya sayısı 3 → aynı işten 3 sevkiyat; "formu açık tut" müşteriyi bırakıp formu boşaltır', async ({ page }) => {
  const id = unique()
  await login(page)
  const ok = async <T>(res: Promise<APIResponse>) => { const r = await res; expect(r.ok(), await r.text()).toBeTruthy(); return (await r.json()) as T }
  const customer = `E2E Kopya ${id}`
  await ok(page.request.post('/api/customers', { data: { title: customer } }))
  const driver = await ok<{ id: number }>(page.request.post('/api/drivers', { data: { fullName: `E2E Kopya Şoför ${id}`, isActive: true } }))
  const plate = `34 KP ${id.slice(-4)}`
  await ok(page.request.post('/api/vehicles', { data: { plate, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own', defaultDriverId: driver.id } }))

  await page.goto('/seferler?new=1')
  const dialog = page.getByRole('dialog', { name: 'Sevkiyat Oluştur' })
  await pick(dialog.locator('input[name=customerId]'), customer)
  await pick(dialog.locator('input[name=vehicleId]'), `${plate} - Kamyon`)
  await expect(dialog.locator('input[name=driverId]')).not.toHaveValue('')
  await dialog.getByLabel('Yükleme Adresi').fill('Kocaeli')
  await dialog.getByLabel('Teslimat Adresi').fill('Bursa')
  await dialog.getByLabel('Araç Maliyeti (TL)').fill('1000')
  await dialog.getByLabel('Müşteri Satış Fiyatı (TL)').fill('1500')
  await dialog.getByLabel('Kaydettikten sonra formu açık tut').check()
  await dialog.getByLabel('Kopya sayısı').fill('3')
  await dialog.getByRole('button', { name: '3 sevkiyat kaydet' }).click()
  await expect(page.getByText('3 sevkiyat oluşturuldu.')).toBeVisible()

  // Form açık kaldı: müşteri seçili, adres boş.
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Yükleme Adresi')).toHaveValue('')
  await expect(dialog.getByLabel('Kopya sayısı')).toHaveValue('1')
  await dialog.getByLabel('Kaydettikten sonra formu açık tut').uncheck()
  await dialog.getByRole('button', { name: 'Vazgeç' }).click()
  const leave = page.getByRole('button', { name: 'Kaydetmeden kapat' })
  if (await leave.isVisible().catch(() => false)) await leave.click()

  const list = await ok<{ total: number }>(page.request.get(`/api/trips?search=${encodeURIComponent(customer)}`))
  expect(list.total).toBe(3)
})
