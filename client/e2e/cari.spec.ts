import { expect, test } from '@playwright/test'
import { expectPdfOpens, login } from './helpers'

test('cari tabloları ve sevkiyat kazanç tablosu (eski panele benzeyen düzen)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'masaüstü menüsü')
  await login(page)

  await page.getByRole('link', { name: 'Müşteriler Cari', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Müşteriler Cari' })).toBeVisible()
  await page.getByRole('radio', { name: 'Hepsi' }).click()
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
  await expectPdfOpens(page, () => firstRow.getByRole('button', { name: 'Ekstre' }).click(), /\/api\/customers\/\d+\/statement/)
  await firstRow.click()
  await expect(page).toHaveURL(/\/musteriler\/\d+$/)

  await page.getByRole('link', { name: 'Tedarikçiler Cari', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tedarikçiler Cari' })).toBeVisible()
  await page.getByRole('radio', { name: 'Hepsi' }).click()
  await expect(page.locator('tbody tr').first()).toBeVisible()

  await page.getByRole('link', { name: 'Sevkiyatlar', exact: true }).click()
  await page.getByRole('radio', { name: 'Hepsi' }).click()
  const strip = page.getByLabel('Kazanç tablosu')
  await expect(strip).toContainText('Kazanç')
  await expect(strip).toContainText('Satış')
  await page.getByRole('radio', { name: 'Bugün' }).click()
  await expect(page.getByRole('radio', { name: 'Bugün' })).toHaveAttribute('aria-checked', 'true')
})

test('cari tablosunda sıralama, Excel/PDF çıktısı ve faturalarda icmal', async ({ page, isMobile }) => {
  test.skip(isMobile, 'masaüstü tablo')
  await login(page)

  await page.getByRole('link', { name: 'Müşteriler Cari', exact: true }).click()
  await page.getByRole('radio', { name: 'Hepsi' }).click()
  await expect(page.getByRole('columnheader', { name: 'Faturasız Sevkiyatlar' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'İptal Fatura' })).toBeVisible()
  const titles = page.locator('tbody tr td:first-child span.font-medium')
  await expect(titles.first()).toBeVisible()
  const sortBy = page.getByRole('columnheader', { name: 'Müşteri' }).getByRole('button')
  const az = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b, 'tr'))
  await sortBy.click()
  await expect.poll(async () => { const t = await titles.allTextContents(); return t.join('|') === az(t).join('|') }).toBe(true)
  await sortBy.click()
  await expect.poll(async () => { const t = await titles.allTextContents(); return t.join('|') === az(t).reverse().join('|') }).toBe(true)

  // Çıktılar ekrandaki süzgeç ve sıralamayla iner.
  const [excel] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel', exact: true }).click()])
  expect(excel.suggestedFilename()).toMatch(/^musteriler-cari.*\.xlsx$/)
  await expectPdfOpens(page, () => page.getByRole('button', { name: 'PDF', exact: true }).click(),
    /\/api\/cari\/customers\/export\?(?=.*format=pdf)(?=.*filter=all)(?=.*sort=title)(?=.*desc=true)/)

  await page.getByRole('link', { name: 'Tedarikçiler Cari', exact: true }).click()
  await expect(page.getByRole('columnheader', { name: 'Alınan Fatura' })).toBeVisible()
  await expectPdfOpens(page, () => page.getByRole('button', { name: 'PDF', exact: true }).click(), /\/api\/cari\/suppliers\/export\?.*format=pdf/)

  await page.getByRole('link', { name: 'Faturalar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Faturalar' })).toBeVisible()
  await expect(page.getByLabel('Filtre toplamı')).toContainText('Genel toplam')
  await expectPdfOpens(page, () => page.getByRole('button', { name: 'Fatura İcmali' }).click(), /\/api\/invoices\/summary-pdf/)
  await page.getByLabel('Sevkiyat no').fill('999999999')
  await expect(page.getByText('Bu filtrelere uyan fatura yok.')).toBeVisible()
})

test('personeller ve sabit ödemeler', async ({ page, isMobile }) => {
  test.skip(isMobile, 'masaüstü menüsü')
  await login(page)
  const u = Date.now().toString().slice(-6)

  await page.getByRole('link', { name: 'Personeller', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Personeller' })).toBeVisible()
  await page.getByRole('button', { name: 'Personel Ekle' }).click()
  await page.getByLabel('Ad soyad').fill(`Arif Test ${u}`)
  await page.getByLabel('Aylık maaş').fill('50000')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  const row = page.locator('tbody tr', { hasText: `Arif Test ${u}` })
  await expect(row).toContainText('50.000,00 TL')
  await row.click()
  await page.getByRole('radio', { name: /Avans/ }).click()
  await page.getByLabel('Tutar').fill('5000')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('dialog').getByText('Avans', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(row).toContainText('45.000,00 TL')

  await page.getByRole('link', { name: 'Sabit Ödemeler', exact: true }).click()
  await page.getByRole('button', { name: 'Sabit Ödeme Ekle' }).click()
  await page.getByLabel('Başlık').fill(`Ofis kirası ${u}`)
  await page.getByLabel('Aylık tutar').fill('25000')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  const r = page.locator('tbody tr', { hasText: `Ofis kirası ${u}` })
  await r.getByRole('button', { name: 'Ödendi' }).click()
  await page.getByRole('button', { name: 'Ödendi olarak kaydet' }).click()
  await expect(r).toContainText('Ödendi ·')
})
