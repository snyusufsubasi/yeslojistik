import { expect, test } from '@playwright/test'
import { API_URL, DRIVER_APP_URL } from './helpers'

// Mobil uygulamanın yönetici modu (web önizlemesi): özet → yeni sefer → durum → cari → tahsilat.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test('mobil yönetici: özet → yeni sefer → yüklendi → cari → tahsilat', async ({ page }) => {
  page.on('dialog', (d) => d.accept())
  const u = Date.now().toString().slice(-5)
  await page.goto(DRIVER_APP_URL + '/')
  await page.getByText('Sunucu ayarı').click()
  await page.getByLabel('Sunucu adresi').fill(API_URL)
  await page.getByLabel('E-posta').fill('admin@yeslojistik.com')
  await page.getByLabel('Şifre', { exact: true }).fill('Admin123!')
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await expect(page.getByText('Bu ay sefer')).toBeVisible()
  await expect(page.getByText('Taşerona ödenecek')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/office-summary.png' })

  // Yeni sefer
  await page.getByRole('tab', { name: /Seferler/ }).click()
  await page.getByRole('button', { name: '+ Yeni' }).click()
  const pick = async (label: string, option: string) => {
    await page.getByRole('button', { name: label, exact: true }).click()
    const dlg = page.getByRole('dialog')
    await dlg.getByLabel('Ara', { exact: true }).fill(option)
    await dlg.getByText(option).first().click()
  }
  await pick('Müşteri', 'Yıldız Mobilya')
  await pick('Araç', '34 VES 02')
  await pick('Şoför', 'Ali Demir')
  await page.getByLabel('Yükleme adresi').fill('Tuzla OSB')
  await page.getByLabel('Teslimat adresi').fill(`Mobil Test ${u}`)
  await page.getByLabel('Araç maliyeti').fill('9000')
  await page.getByLabel('Satış fiyatı').fill('14.500')
  await page.screenshot({ path: 'e2e/screenshots/office-new-trip.png' })
  await page.getByRole('button', { name: 'Seferi Oluştur' }).click()
  await expect(page.getByText(`Mobil Test ${u}`).last()).toBeVisible()
  await expect(page.getByText('14.500,00 TL / 9.000,00 TL')).toBeVisible()
  await page.getByRole('button', { name: 'Yüklendi yap' }).click()
  await expect(page.getByRole('button', { name: 'Yolda yap' })).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/office-trip.png' })

  // Cari → tahsilat
  await page.goBack()
  await page.getByRole('tab', { name: /Cariler/ }).click()
  await page.getByLabel('Cari ara').fill('Yıldız')
  await page.getByRole('button', { name: /Yıldız Mobilya.*0216/ }).filter({ visible: true }).last().click()
  await expect(page.getByText('Alacak bakiyesi')).toBeVisible()
  await page.getByRole('button', { name: 'Tahsilat Ekle' }).click()
  await page.getByLabel('Tutar').fill('1.250')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText(/−1\.250,00 TL/).filter({ visible: true }).first()).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/office-account.png' })
})
