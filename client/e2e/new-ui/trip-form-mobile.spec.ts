import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { login, unique, useNewUi } from '../helpers'

/** Testin kendi müşterisi, şoförü ve aracı (API üzerinden, oturum çereziyle). */
async function fixtures(request: APIRequestContext, id: string) {
  const ok = async <T>(res: Promise<APIResponse>) => {
    const r = await res
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const customer = await ok<{ customer: { id: number } }>(request.post('/api/customers', { data: { title: `E2E Form T ${id}` } }))
  const driver = await ok<{ id: number }>(request.post('/api/drivers', { data: { fullName: `E2E Form T Şoför ${id}`, isActive: true } }))
  const plate = `34 FT ${id.slice(-4)}`
  await ok(request.post('/api/vehicles', { data: { plate, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own', defaultDriverId: driver.id } }))
  return { customerTitle: `E2E Form T ${id}`, plate }
}

/** Bu dosya `mobile` projesinde koşar (375×812); sevkiyat formu iki sütun ızgarasını bırakıp tek sütuna inmeli. */
test('Sevkiyat formu telefonda tek sütun; pencere içinde yatay kaydırma yok', async ({ page }) => {
  const id = unique()
  await login(page)
  const { customerTitle, plate } = await fixtures(page.request, id)
  await useNewUi(page)
  await page.goto('/seferler?new=1')
  const dialog = page.getByRole('dialog', { name: 'Sevkiyat Oluştur' })
  await expect(dialog).toBeVisible()

  const customerInput = dialog.locator('input[name=customerId]')
  const vehicleInput = dialog.locator('input[name=vehicleId]')
  await customerInput.click()
  await customerInput.fill(customerTitle)
  await expect(page.getByRole('option', { name: customerTitle, exact: true })).toBeVisible()
  await customerInput.press('Escape')
  await vehicleInput.click()
  await vehicleInput.fill(plate)
  await expect(page.getByRole('option', { name: `${plate} - Kamyon`, exact: true })).toBeVisible()
  await vehicleInput.press('Escape')

  const customerBox = await customerInput.boundingBox()
  const vehicleBox = await vehicleInput.boundingBox()
  expect(customerBox).not.toBeNull()
  expect(vehicleBox).not.toBeNull()
  // Tek sütun: araç kutusu müşterinin altında ve aynı sol kenarda.
  expect(vehicleBox!.y).toBeGreaterThan(customerBox!.y + 40)
  expect(Math.abs(vehicleBox!.x - customerBox!.x)).toBeLessThanOrEqual(2)

  // Yatay kaydırma yok (mevcut kural: client/e2e/mobile.spec.ts).
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const dialogOverflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(dialogOverflow).toBeLessThanOrEqual(0)
})
