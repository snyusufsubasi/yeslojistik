import { expect, test } from '@playwright/test'
import { login, unique } from './helpers'

test('müşteri → araç → şoför → sefer → fatura → PDF → kısmi tahsilat → bakiye', async ({ page }) => {
  const id = unique()
  const customer = `E2E Mobilya ${id}`
  const plate = `34 E ${id.slice(-4)}`

  await login(page)
  const receivableBefore = await page.getByRole('button', { name: /Tahsilat Bekleyen/ }).innerText()

  // Müşteri
  await page.getByRole('link', { name: 'Müşteriler / Cari' }).click()
  await page.getByRole('button', { name: 'Yeni Müşteri' }).click()
  const custDialog = page.getByRole('dialog', { name: 'Yeni Müşteri' })
  await custDialog.getByLabel('Ünvan').fill(customer)
  await custDialog.getByLabel('VKN / TCKN').fill('123')
  await custDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(custDialog.getByText('VKN 10, TCKN 11 haneli olmalı.')).toBeVisible()
  await custDialog.getByLabel('VKN / TCKN').fill('1234567890')
  await custDialog.getByLabel('Telefon').fill('02165554433')
  await custDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('heading', { name: customer })).toBeVisible()

  // Şoför
  await page.getByRole('link', { name: 'Şoförler' }).click()
  await page.getByRole('button', { name: 'Yeni Şoför' }).click()
  const drvDialog = page.getByRole('dialog', { name: 'Yeni Şoför' })
  await drvDialog.getByLabel('Ad Soyad').fill(`E2E Şoför ${id}`)
  await drvDialog.getByLabel('Telefon').fill('05321234567')
  await drvDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Şoför eklendi.')).toBeVisible()

  // Araç
  await page.getByRole('link', { name: 'Araçlar' }).click()
  await page.getByRole('button', { name: 'Yeni Araç' }).click()
  const vehDialog = page.getByRole('dialog', { name: 'Yeni Araç' })
  await vehDialog.getByLabel('Plaka').fill(plate)
  await vehDialog.getByLabel('Araç Tipi').fill('Kamyon')
  await vehDialog.locator('select[name=defaultDriverId]').selectOption({ label: `E2E Şoför ${id}` })
  await vehDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Araç eklendi.')).toBeVisible()

  // Sefer
  await page.getByRole('link', { name: 'Seferler' }).click()
  await page.getByRole('button', { name: 'Yeni Sefer' }).click()
  const tripDialog = page.getByRole('dialog', { name: 'Sefer Oluştur' })
  await tripDialog.locator('select[name=customerId]').selectOption({ label: customer })
  await tripDialog.locator('select[name=vehicleId]').selectOption({ label: `${plate} - Kamyon` })
  await expect(tripDialog.locator('select[name=driverId]')).toHaveValue(/\d+/)
  await tripDialog.getByLabel('Yükleme Adresi').fill('İstanbul / Sultanbeyli')
  await tripDialog.getByLabel('Teslimat Adresi').fill('İzmir / Balçova')
  await tripDialog.getByLabel('Araç Maliyeti (TL)').fill('18000')
  await tripDialog.getByLabel('Müşteri Satış Fiyatı (TL)').fill('25000')
  await expect(tripDialog.getByText('7.000 TL')).toBeVisible()
  await tripDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Sefer oluşturuldu.')).toBeVisible()

  // Durumları ilerlet: Yüklendi → Yola Çıktı → Teslim Edildi
  await page.getByPlaceholder('Müşteri, plaka, şoför, adres...').fill(customer)
  const row = page.getByRole('row', { name: new RegExp(customer) })
  await expect(row).toHaveCount(1)
  for (const action of ['Yüklendi', 'Yola Çıktı', 'Teslim Edildi']) {
    await row.getByRole('button', { name: action }).click()
    await expect(page.getByText('Sefer durumu güncellendi.').first()).toBeVisible()
  }
  await expect(row.getByText('Teslim Edildi')).toBeVisible()

  // Fatura
  await page.getByRole('link', { name: 'Faturalar' }).click()
  await page.getByRole('button', { name: 'Yeni Fatura' }).click()
  await expect(page.getByRole('heading', { name: 'Yeni Fatura' })).toBeVisible()
  await page.getByRole('combobox').first().selectOption({ label: customer })
  await expect(page.getByRole('checkbox', { name: /Sefer \d+/ })).toBeChecked()
  // Varsayılan: %20 KDV, 2/10 tevkifat → 25.000 + 5.000 − 1.000 = 29.000
  await expect(page.getByText('29.000,00 TL')).toBeVisible()
  await page.getByRole('button', { name: 'Faturayı Kes' }).click()
  const invDialog = page.getByRole('dialog', { name: /Fatura F-\d{6}/ })
  await expect(invDialog).toBeVisible()
  await expect(invDialog.getByText('Açık', { exact: true })).toBeVisible()

  // PDF yeni sekmede açılır
  const popup = page.waitForEvent('popup')
  await invDialog.getByRole('button', { name: 'PDF' }).click()
  await (await popup).close()

  // Kısmi tahsilat
  await invDialog.getByRole('button', { name: 'Tahsilat Ekle' }).click()
  const payDialog = page.getByRole('dialog', { name: 'Tahsilat Ekle' })
  await payDialog.getByLabel('Tutar (TL)').fill('10000')
  await payDialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Tahsilat kaydedildi.')).toBeVisible()
  await expect(invDialog.getByText('Kısmi Ödendi', { exact: true })).toBeVisible()
  await expect(invDialog.getByText('19.000,00 TL')).toBeVisible()
  await invDialog.getByRole('button', { name: 'Kapat' }).click()

  // Cari kartı
  await page.getByRole('link', { name: 'Müşteriler / Cari' }).click()
  await page.getByPlaceholder('Ünvan, VKN, telefon...').fill(customer)
  await page.getByRole('row', { name: new RegExp(customer) }).click()
  await expect(page.getByText('29.000,00 TL').first()).toBeVisible()
  await expect(page.getByText('10.000,00 TL').first()).toBeVisible()
  await expect(page.getByText('19.000,00 TL').first()).toBeVisible()

  // Dashboard'daki tahsilat bekleyen tutarı değişmiş olmalı
  await page.getByRole('link', { name: 'Ana Sayfa' }).click()
  await expect(page.getByRole('button', { name: /Tahsilat Bekleyen/ })).not.toHaveText(receivableBefore)
})

test('raporlar ve Excel dışa aktarma', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Raporlar' }).click()
  await expect(page.getByText('Sefer cirosu')).toBeVisible()
  for (const tab of ['Sefer Kârlılığı', 'Araç Bazlı', 'Şoför Bazlı', 'Alacak Yaşlandırma', 'Gider Dağılımı']) {
    await page.getByRole('button', { name: tab }).click()
    await expect(page.locator('table').first()).toBeVisible()
  }
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: "Excel'e Aktar" }).click()
  expect((await dl).suggestedFilename()).toMatch(/\.xlsx$/)
})

test('bildirimler açılır', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Bildirimler' }).click()
  await expect(page.getByText('Bildirimler', { exact: true })).toBeVisible()
})

test('var olan seferin formu araç ve şoförü dolu açılır', async ({ page }) => {
  await login(page)
  await page.goto('/seferler')
  await page.getByRole('row').nth(1).click()
  const dialog = page.getByRole('dialog', { name: 'Sefer Düzenle' })
  for (const name of ['customerId', 'vehicleId', 'driverId']) {
    await expect(dialog.locator(`select[name=${name}]`)).not.toHaveValue('')
  }
})

test('yardım sayfası ve kontrol listesi bağlantıları', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Yardım' }).click()
  await expect(page.getByRole('heading', { name: 'Yardım' })).toBeVisible()
  await page.getByText('Sık sorulanlar').click()
  await expect(page.getByText('Şifremi unuttum.')).toBeVisible()
  await page.getByRole('link', { name: 'Seferler → Yeni Sefer' }).click()
  await expect(page.getByRole('dialog', { name: 'Sefer Oluştur' })).toBeVisible()
})

test('sefer kopyalanır, sevk belgesi ve hesap ekstresi PDF açılır', async ({ page, context }) => {
  await login(page)
  await page.goto('/seferler')
  await page.getByRole('row').nth(1).click()
  const edit = page.getByRole('dialog', { name: 'Sefer Düzenle' })
  const from = await edit.getByLabel('Yükleme Adresi').inputValue()

  const [waybill] = await Promise.all([context.waitForEvent('page'), edit.getByRole('button', { name: 'Sevk Belgesi' }).click()])
  await expect.poll(() => waybill.url()).toMatch(/^blob:/)
  await waybill.close()

  await edit.getByRole('button', { name: 'Kopyala' }).click()
  const copy = page.getByRole('dialog', { name: 'Sefer Oluştur (kopya)' })
  await expect(copy.getByLabel('Yükleme Adresi')).toHaveValue(from)
  await expect(copy.locator('select[name=customerId]')).not.toHaveValue('')
  await copy.getByRole('button', { name: 'Vazgeç' }).click()

  await page.goto('/musteriler')
  await page.locator('tbody tr').first().click()
  await page.getByRole('button', { name: 'Hesap Ekstresi' }).click()
  const dlg = page.getByRole('dialog', { name: /Hesap Ekstresi/ })
  const [statement] = await Promise.all([context.waitForEvent('page'), dlg.getByRole('button', { name: 'PDF Aç' }).click()])
  await expect.poll(() => statement.url()).toMatch(/^blob:/)
})
