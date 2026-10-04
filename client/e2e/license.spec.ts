import { expect, test } from '@playwright/test'
import { login } from './helpers'

// E2E sunucusu sahip modunda çalışır (lisans anahtarı yok): sınırsız, uyarı bandı yok.
test('Abonelik sekmesi sahip modunu ve paket tablosunu gösterir, üstte uyarı bandı çıkmaz', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('license-banner')).toHaveCount(0)

  await page.goto('/ayarlar?tab=license')
  await expect(page.getByRole('button', { name: 'Abonelik', exact: true })).toBeVisible()
  await expect(page.getByTestId('license-owner')).toContainText('Sahip modu')
  await expect(page.getByTestId('license-state')).toContainText('Sahip modu')

  const plans = page.getByRole('table')
  for (const name of ['Başlangıç', 'Standart', 'Profesyonel', 'Kurumsal']) await expect(plans).toContainText(name)
  await expect(plans).toContainText('990')
  await expect(plans).toContainText('2.490')
  await expect(plans).toContainText('4.990')
  await expect(page.getByText('KDV hariç, aylık')).toBeVisible()

  // Geçersiz anahtar uygulanamaz, anlaşılır bir hata çıkar.
  await page.getByPlaceholder('Size gönderilen anahtarı buraya yapıştırın').fill('sahte.anahtar')
  await page.getByRole('button', { name: 'Anahtarı uygula' }).click()
  await expect(page.getByText(/Anahtar (biçimi hatalı|doğrulanamadı)/)).toBeVisible()
  await expect(page.getByTestId('license-owner')).toBeVisible()
})
