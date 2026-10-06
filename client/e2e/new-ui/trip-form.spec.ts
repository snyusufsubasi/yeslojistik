import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import { login, unique, useNewUi } from '../helpers'

/** Testin kendi müşterisi, şoförü ve aracı (API üzerinden, oturum çereziyle). */
async function fixtures(request: APIRequestContext, id: string) {
  const ok = async <T>(res: Promise<APIResponse>) => {
    const r = await res
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const customer = await ok<{ customer: { id: number } }>(request.post('/api/customers', { data: { title: `E2E Form ${id}` } }))
  const driver = await ok<{ id: number }>(request.post('/api/drivers', { data: { fullName: `E2E Form Şoför ${id}`, isActive: true } }))
  const plate = `34 FM ${id.slice(-4)}`
  await ok(request.post('/api/vehicles', { data: { plate, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own', defaultDriverId: driver.id } }))
  return { customerTitle: `E2E Form ${id}`, plate }
}

const dialogOf = (page: Page) => page.getByRole('dialog', { name: 'Sevkiyat Oluştur' })

/** Arama kutusu: tıklanır, klavyeyle yazılır (gerçek kullanıcı gibi; doldurma olayı değil), liste açılır. */
async function typeSelect(input: ReturnType<Page['locator']>, text: string, option: string) {
  await input.click()
  await input.pressSequentially(text, { delay: 10 })
  await expect(input.page().getByRole('option', { name: option, exact: true })).toBeVisible()
}

/** Açık seçenek listesini kapatır; Esc varsayılanı engellenir, pencere kapanmaz (SearchSelect.tsx:89-92). */
async function closeList(input: ReturnType<Page['locator']>) {
  await input.press('Escape')
}

test('Sevkiyat formu: yeni görünümde tek sayfa iki sütun, klasik görünümde bugünkü düzen', async ({ page }) => {
  const id = unique()
  await login(page)
  const { customerTitle, plate } = await fixtures(page.request, id)

  // --- Yeni görünüm: bölüm numarası yok; müşteri (sol) ile araç (sağ) aynı hizada ---
  await useNewUi(page)
  await page.goto('/seferler?new=1')
  const dialog = dialogOf(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('h3', { hasText: 'Müşteri ve güzergâh' })).toHaveCount(0)
  await expect(dialog.getByText('Müşteri ve güzergâh')).toBeVisible()
  await expect(dialog.getByText('Araç, şoför ve fiyat')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Kaydet' })).toBeVisible()

  const customerInput = dialog.locator('input[name=customerId]')
  const vehicleInput = dialog.locator('input[name=vehicleId]')
  await typeSelect(customerInput, customerTitle, customerTitle)
  await closeList(customerInput)
  await typeSelect(vehicleInput, plate, `${plate} - Kamyon`)
  await closeList(vehicleInput)

  const customerBox = await customerInput.boundingBox()
  const vehicleBox = await vehicleInput.boundingBox()
  expect(customerBox).not.toBeNull()
  expect(vehicleBox).not.toBeNull()
  // İki sütun: kutular aynı hizada (y eşit) ve araç kutusu müşterinin sağında.
  expect(Math.abs(vehicleBox!.y - customerBox!.y)).toBeLessThanOrEqual(2)
  expect(vehicleBox!.x).toBeGreaterThan(customerBox!.x)

  // Yazılmış alan varken Esc sorar (Modal koruması; ui.tsx:163-167, 192-194, 225-231).
  // "Vazgeç" bilinçli olarak sormaz (kaydetmeden kapatma yolu); soran yollar Esc, dışarı tıklama ve X'tir.
  await page.keyboard.press('Escape')
  await expect(dialog.getByText('Kaydedilmemiş değişiklikler var. Kapatılsın mı?')).toBeVisible()
  await dialog.getByRole('button', { name: 'Forma dön' }).click()
  await expect(dialog).toBeVisible()
  // Forma dönünce yazılan korunur.
  await expect(customerInput).toHaveValue(customerTitle)
  await dialog.getByRole('button', { name: 'Vazgeç' }).click()
  await expect(dialog).toBeHidden()

  // --- Klasik görünüm: aynı form bugünkü üç bölümlü düzeniyle açılır ---
  await page.getByRole('button', { name: 'Hesabım' }).click()
  await page.getByRole('radio', { name: 'Klasik' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'classic')
  await page.goto('/seferler?new=1')
  const classic = dialogOf(page)
  await expect(classic).toBeVisible()
  // Bölüm başlıkları metni değişmedi (bkz. docs/plan/04-SEVKIYAT-FORMU.md §6).
  await expect(classic.locator('h3', { hasText: 'Müşteri ve güzergâh' })).toHaveText('Müşteri ve güzergâh')
  await expect(classic.locator('h3', { hasText: 'Araç ve şoför' })).toHaveText('Araç ve şoför')
  await expect(classic.locator('h3', { hasText: 'Fiyat' })).toHaveText('Fiyat')
  // Tek sütun akış: araç kutusu müşterinin çok altında.
  await typeSelect(classic.locator('input[name=customerId]'), customerTitle, customerTitle)
  await closeList(classic.locator('input[name=customerId]'))
  const classicCustomer = await classic.locator('input[name=customerId]').boundingBox()
  const classicVehicle = await classic.locator('input[name=vehicleId]').boundingBox()
  expect(classicCustomer).not.toBeNull()
  expect(classicVehicle).not.toBeNull()
  expect(classicVehicle!.y).toBeGreaterThan(classicCustomer!.y + 100)
  // Klasik görünümde de yazılmışsa Esc sorar (koruma davranışı iki düzende de aynı; ui.tsx:163-167).
  await page.keyboard.press('Escape')
  await expect(classic.getByText('Kaydedilmemiş değişiklikler var. Kapatılsın mı?')).toBeVisible()
  await classic.getByRole('button', { name: 'Kaydetmeden kapat' }).click()
  await expect(classic).toBeHidden()
})
