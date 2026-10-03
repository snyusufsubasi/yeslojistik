import { expect, test } from '@playwright/test'
import { login, pick, unique } from './helpers'

test('klavye: öneri düğmeleri Tab sırasında değil, aranabilir kutuda Tab vurgulananı seçer', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Sevkiyatlar', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Sefer' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sefer Oluştur' })

  // "mar" yazıp Tab: vurgulanan müşteri seçilir, odak sonraki alana geçer.
  const customer = dialog.locator('input[name=customerId]')
  await customer.click()
  await customer.pressSequentially('mar')
  await page.keyboard.press('Tab')
  await expect(customer).toHaveValue(/Martur/)
  await expect(customer).not.toBeFocused()

  // İl kutusu: "izm" + Tab → İzmir, odak adres kutusunda.
  const city = dialog.locator('input[name=deliveryCity]')
  await city.click()
  await city.pressSequentially('izm')
  await page.keyboard.press('Tab')
  await expect(city).toHaveValue('İzmir')
  await expect(dialog.getByLabel('Teslimat Adresi')).toBeFocused()

  // Yalnızca üzerinden geçmek seçimi değiştirmez.
  await city.focus()
  await page.keyboard.press('Tab')
  await expect(city).toHaveValue('İzmir')

  await dialog.getByRole('button', { name: /^Ayrıntılar/ }).click()
  // "Bugün / Dün / Yarın", "+1 gün" ve yük cinsi önerileri Tab sırasına girmez (fareyle tıklanır).
  for (const name of ['Bugün', 'Yarın', '+1 gün', 'Mobilya', 'palet']) {
    await expect(dialog.getByRole('button', { name, exact: true }).first()).toHaveAttribute('tabindex', '-1')
  }
  // Ayrıntılar tek bölüm: yük, belgeler, yetkililer ve konum aynı yerde.
  await expect(dialog.getByLabel('Teslim Evrak No')).toBeVisible()
  await expect(dialog.getByLabel('Yükleme Enlem')).toBeVisible()
})

test('sefer formu sade: KDV tek satır özet, komisyon/prim katlanır bölümde', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Sevkiyatlar', exact: true }).click()
  await page.getByRole('button', { name: 'Yeni Sefer' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sefer Oluştur' })

  // Fiyatlar zorunlu (yıldızlı); KDV ve tevkifat varsayılanda özet olarak görünür, "Değiştir" ile açılır.
  await dialog.getByLabel('Müşteri Satış Fiyatı (TL)').fill('10000')
  await expect(dialog.getByText('KDV %20 · tevkifat otomatik · Alınacak 12.000,00 TL')).toBeVisible()
  await expect(dialog.getByLabel('Satış KDV oranı')).toBeHidden()
  await dialog.getByRole('button', { name: 'Satış KDV ve tevkifatını değiştir' }).click()
  await expect(dialog.getByLabel('Satış KDV oranı')).toHaveValue('20')
  await expect(dialog.getByLabel('Maliyet KDV oranı')).toBeHidden()

  // Komisyon, şoför primi ve ek masraf kapalı bölümde.
  await expect(dialog.getByLabel('Komisyon (TL)')).toBeHidden()
  await dialog.getByRole('button', { name: /^Komisyon, şoför primi/ }).click()
  await expect(dialog.getByLabel('Komisyon (TL)')).toBeVisible()
  await expect(dialog.getByLabel('Şoför Primi (TL)')).toBeVisible()
})

test('pencere: ilk alana odak, yazılmışsa kapatmadan önce sorar, Ctrl+Enter kaydeder', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Müşteriler', exact: true }).first().click()
  await page.getByRole('button', { name: 'Yeni Müşteri' }).click()
  const dialog = page.getByRole('dialog', { name: 'Yeni Müşteri' })
  const title = dialog.getByLabel('Ünvan')
  await expect(title).toBeFocused()

  // Boş formu Esc hemen kapatır.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // Yazılmış formda Esc sorar; "Forma dön" yazılanı korur.
  await page.getByRole('button', { name: 'Yeni Müşteri' }).click()
  const name = `E2E Pencere ${unique()}`
  await title.fill(name)
  await page.keyboard.press('Escape')
  await expect(dialog.getByText('Kaydedilmemiş değişiklikler var. Kapatılsın mı?')).toBeVisible()
  await dialog.getByRole('button', { name: 'Forma dön' }).click()
  await expect(title).toHaveValue(name)

  // X da sorar; "Kaydetmeden kapat" kapatır.
  await dialog.getByRole('button', { name: 'Kapat' }).click()
  await dialog.getByRole('button', { name: 'Kaydetmeden kapat' }).click()
  await expect(dialog).toBeHidden()

  // Ctrl+Enter kaydeder.
  await page.getByRole('button', { name: 'Yeni Müşteri' }).click()
  await title.fill(name)
  await page.keyboard.press('Control+Enter')
  await expect(dialog).toBeHidden()
  await expect(page.getByText(name).first()).toBeVisible()
})

test('gider formu: sefer seçilince boş araç ve şoför seferden gelir; gider adı katlanır bölümde', async ({ page }) => {
  await login(page)
  await page.goto('/giderler')
  await page.getByRole('button', { name: 'Gider Ekle' }).click()
  const dlg = page.getByRole('dialog', { name: 'Gider Ekle' })
  await expect(dlg.getByLabel('Gider Adı')).toBeHidden()
  await dlg.getByRole('button', { name: /^Sefer, tedarikçi, ödeme/ }).click()
  await expect(dlg.getByLabel('Gider Adı')).toBeVisible()
  await pick(dlg.locator('input[name=tripId]'), { index: 1 })
  await expect(dlg.locator('input[name=vehicleId]')).not.toHaveValue('')
  await expect(dlg.locator('input[name=driverId]')).not.toHaveValue('')
})
