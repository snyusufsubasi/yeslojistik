import { expect, test, type APIRequestContext, type APIResponse, type Locator } from '@playwright/test'
import { login, unique } from './helpers'

/**
 * "Akıllı alan" (components/SmartField.tsx): hem şıklı hem yazılı.
 * Çiple tek dokunuşla seçilir, listede olmayan değer "Diğer…" / yazarak aynen kaydedilir,
 * kaydedilen değer bir sonraki açılışta firmanın "sık kullandıkları" arasına girer (GET /api/options/{alan}).
 */

async function ok<T>(res: Promise<APIResponse>) {
  const r = await res
  expect(r.ok(), await r.text()).toBeTruthy()
  return (await r.json()) as T
}

async function fixtures(request: APIRequestContext, id: string) {
  await ok(request.post('/api/customers', { data: { title: `E2E Akıllı ${id}` } }))
  const driver = await ok<{ id: number }>(request.post('/api/drivers', { data: { fullName: `E2E Akıllı Şoför ${id}`, isActive: true } }))
  const plate = `34 AK ${id.slice(-4)}`
  await ok(request.post('/api/vehicles', { data: { plate, type: 'Kamyon', km: 0, status: 'Available', ownership: 'Own', defaultDriverId: driver.id } }))
  return { customerTitle: `E2E Akıllı ${id}`, plate }
}

async function typeSelect(input: Locator, text: string, option: string) {
  await input.click()
  await input.pressSequentially(text, { delay: 10 })
  const choice = input.page().getByRole('option', { name: option, exact: true })
  await choice.click()
  await expect(choice).toBeHidden()
}

const chipsOf = (field: Locator) => field.getByRole('group', { name: 'Hızlı seçim' }).getByRole('button')

test('akıllı alan: araç tipi çiple seçilir, listede olmayan tip aynen kaydedilir ve sonra önerilir', async ({ page }) => {
  const u = unique()
  await login(page)
  await page.goto('/araclar')
  await page.getByRole('button', { name: 'Yeni Araç' }).click()
  const dlg = page.getByRole('dialog', { name: 'Yeni Araç' })
  const typeField = dlg.locator('[data-smart-field=vehicleType]')
  const typeInput = dlg.getByLabel(/^Araç Tipi/)

  // 1) Çip: tek dokunuşla seçer, kutuya yazar; aynı çipe tekrar basınca seçim kalkar.
  const firstChip = chipsOf(typeField).first()
  const chipText = (await firstChip.innerText()).trim()
  await firstChip.click()
  await expect(typeInput).toHaveValue(chipText)
  await expect(firstChip).toHaveAttribute('aria-pressed', 'true')
  await firstChip.click()
  await expect(typeInput).toHaveValue('')

  // 2) Liste: kutuya odaklanınca bütün seçenekler aranabilir listede; sektör listesi de içinde.
  await typeInput.click()
  const list = page.getByRole('listbox', { name: 'Seçenekler' })
  await expect(list).toBeVisible()
  await expect(list.getByText('Sektörde yaygın')).toBeVisible()
  await typeInput.pressSequentially('lowb', { delay: 10 })
  await expect(list.getByRole('option', { name: /^Lowbed/ })).toBeVisible()
  await list.getByRole('option', { name: /^Lowbed/ }).click()
  await expect(typeInput).toHaveValue('Lowbed')

  // Kısmi eşleşmede liste açık kalır; yazılan metin "yazdığım gibi kullan" ile de seçilebilir.
  await typeInput.fill('')
  await typeInput.pressSequentially('kasa', { delay: 10 })
  await expect(list.getByRole('option', { name: /^Kapalı kasa/ })).toBeVisible()
  await list.getByRole('option', { name: '“kasa” yazdığım gibi kullan' }).click()
  await expect(typeInput).toHaveValue('kasa')

  // 3) Diğer…: listede olmayan değer yazıldığı gibi kullanılır.
  const custom = `Özel Kasa ${u}`
  await typeInput.fill('')
  await chipsOf(typeField).filter({ hasText: 'Diğer…' }).click()
  await expect(typeInput).toBeFocused()
  await typeInput.pressSequentially('Özel', { delay: 5 })
  await typeInput.pressSequentially(custom.slice('Özel'.length), { delay: 5 })
  // Eşleşen seçenek yoksa liste kapanır (alttaki alanları örtmez); Enter yazılanı aynen kabul eder.
  await page.keyboard.press('Enter')
  await expect(typeInput).toHaveValue(custom)
  await expect(dlg).toBeVisible()
  // Özel değer çip olarak seçili görünür.
  await expect(chipsOf(typeField).filter({ hasText: custom })).toHaveAttribute('aria-pressed', 'true')

  const plate = `35 AK ${u.slice(-4)}`
  await dlg.getByLabel(/^Plaka/).fill(plate)
  await dlg.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Araç eklendi.')).toBeVisible()

  // Kayıtta yazılan tip aynen durur ve artık "sık kullandıklarınız" arasında önerilir.
  const vehicles = await ok<{ items: { plate: string; type: string }[] }>(page.request.get(`/api/vehicles?search=${encodeURIComponent(plate)}`))
  expect(vehicles.items.find((v) => v.plate === plate)?.type).toBe(custom)
  const usage = await ok<{ value: string; count: number }[]>(page.request.get('/api/options/vehicleType'))
  expect(usage.find((o) => o.value === custom)?.count).toBe(1)

  await page.getByRole('button', { name: 'Yeni Araç' }).click()
  const again = page.getByRole('dialog', { name: 'Yeni Araç' })
  await again.getByLabel(/^Araç Tipi/).click()
  await again.getByLabel(/^Araç Tipi/).pressSequentially('Özel Kas', { delay: 5 })
  const suggested = page.getByRole('listbox', { name: 'Seçenekler' })
  await expect(suggested.getByText('Sık kullandıklarınız')).toBeVisible()
  await expect(suggested.getByRole('option', { name: new RegExp(`^${custom}.*1 kez`) })).toBeVisible()
  await page.keyboard.press('Escape')
  await again.getByRole('button', { name: 'Vazgeç' }).click()
})

test('akıllı alan: sevkiyatta yük cinsi çiple, birim elle yazılıp Enter ile kaydedilir', async ({ page }) => {
  const u = unique()
  await login(page)
  const { customerTitle, plate } = await fixtures(page.request, u)
  await page.goto('/seferler')
  await page.getByRole('button', { name: 'Yeni Sevkiyat' }).click()
  const td = page.getByRole('dialog', { name: 'Sevkiyat Oluştur' })
  await typeSelect(td.locator('input[name=customerId]'), customerTitle, customerTitle)
  await typeSelect(td.locator('input[name=vehicleId]'), plate, `${plate} - Kamyon`)
  await td.getByLabel(/^Yükleme Adresi/).fill('Akıllı Depo')
  await td.getByLabel(/^Teslimat Adresi/).fill('Akıllı Mağaza')
  await td.getByLabel('Taşerona Ödenecek (TL)').or(td.getByLabel('Araç Maliyeti (TL)')).first().fill('1000')
  await td.getByLabel('Müşteri Satış Fiyatı (TL)').fill('1500')

  await td.getByRole('button', { name: /^Ayrıntılar/ }).click()
  const cargo = td.locator('[data-smart-field=cargoType]')
  const chip = chipsOf(cargo).nth(1)
  const cargoText = (await chip.innerText()).trim()
  await chip.click()
  await expect(td.getByLabel('Yük Cinsi')).toHaveValue(cargoText)

  // Birim: listede olmayan kısa birim yazılır, Enter yazıldığı gibi kabul eder (formu göndermez).
  const unit = `sepet${u.slice(-3)}`
  const unitInput = td.getByLabel(/^Birim/)
  await unitInput.click()
  await unitInput.pressSequentially(unit, { delay: 5 })
  await page.keyboard.press('Enter')
  await expect(unitInput).toHaveValue(unit)
  await expect(page.getByRole('listbox', { name: 'Seçenekler' })).toBeHidden()
  await expect(td).toBeVisible()

  await td.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Sevkiyat oluşturuldu.')).toBeVisible()

  const trips = await ok<{ items: { customerTitle: string; cargoType: string | null; cargoUnit: string | null }[] }>(
    page.request.get(`/api/trips?search=${encodeURIComponent(customerTitle)}`))
  const saved = trips.items.find((t) => t.customerTitle === customerTitle)
  expect(saved?.cargoType).toBe(cargoText)
  expect(saved?.cargoUnit).toBe(unit)
})
