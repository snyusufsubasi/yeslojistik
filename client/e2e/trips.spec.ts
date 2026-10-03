import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('Sevkiyatlar: Piyasa / Öz Araç ve yükleme yeri süzgeci adreste kalır; Detay görünümü hatırlanır', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Sevkiyatlar', exact: true }).click()
  await page.getByRole('radio', { name: 'Hepsi' }).click()
  const rows = page.locator('tbody tr')

  // Piyasa (kiralık araç): yalnızca taşeron aracıyla yapılan seferler.
  await page.getByLabel('Araç durumu').selectOption({ label: 'Piyasa (kiralık araç)' })
  await expect(page).toHaveURL(/ownership=Rented/)
  await expect(rows.filter({ hasText: '34 VES 01' })).toHaveCount(0)
  await expect(rows.filter({ hasText: '34 DMR 34' }).first()).toBeVisible()

  // Seyrek süzgeçler "Ayrıntılı süzgeç" altında: yükleme yeri il ya da adresle.
  await page.getByRole('button', { name: /Ayrıntılı süzgeç/ }).click()
  await page.getByLabel('Yükleme yeri').fill('Tuzla')
  await expect(page).toHaveURL(/loading=Tuzla/)
  await expect(rows.filter({ hasText: 'Sincan' }).first()).toBeVisible()
  await expect(rows.filter({ hasNotText: 'Tuzla' })).toHaveCount(0)

  // Sayfa yenilenince süzgeçler adresten geri gelir; dolu ayrıntılı süzgeç varsa bölüm açık gelir.
  await page.reload()
  await expect(page.getByLabel('Araç durumu')).toHaveValue('Rented')
  await expect(page.getByLabel('Yükleme yeri')).toHaveValue('Tuzla')
  await expect(page.getByRole('button', { name: 'Ayrıntılı süzgeç (1)' })).toHaveAttribute('aria-expanded', 'true')
  await expect(rows.filter({ hasNotText: 'Tuzla' })).toHaveCount(0)

  // Detay: geniş sütunlar; tercih tarayıcıda hatırlanır.
  await expect(page.getByRole('columnheader', { name: 'Kaydı giren' })).toHaveCount(0)
  await page.getByRole('radio', { name: 'Detay' }).click()
  for (const name of ['Fatura başlığı', 'Ürün', 'Açıklama', 'Komisyon', 'Masraf', 'Fatura bilgisi', 'Kaydı giren'])
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Detay' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('columnheader', { name: 'Kaydı giren' })).toBeVisible()

  // Süzgeci temizle: tüm süzgeçler ve adresteki karşılıkları kalkar.
  await page.getByRole('button', { name: 'Süzgeci temizle' }).click()
  await expect(page).not.toHaveURL(/ownership=|loading=/)
  await expect(page.getByLabel('Araç durumu')).toHaveValue('')
  await expect(rows.filter({ hasNotText: '34 DMR 34' }).first()).toBeVisible()
})
