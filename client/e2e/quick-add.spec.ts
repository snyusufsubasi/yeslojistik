import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('üst çubuktaki "+ Yeni" menüsünden sevkiyat formu açılır; N kısayolu menüyü açar', async ({ page }) => {
  await login(page)
  await page.keyboard.press('n')
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Alınan Fatura' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()

  await page.getByRole('button', { name: 'Yeni', exact: true }).click()
  await menu.getByRole('menuitem', { name: 'Yeni Sevkiyat' }).click()
  await expect(page.getByRole('dialog', { name: /Sevkiyat Oluştur/ })).toBeVisible()
})

test('ayna açıkken "+ Yeni" görünür ama kaydı pratikortam\'a yönlendirir', async ({ page }) => {
  // Yalnız tarayıcı tarafında ayna açık gösterilir; sunucudaki ayar değişmez (öbür testler etkilenmesin).
  await page.route('**/api/legacy/status', (route) => route.fulfill({ json: { mirrorMode: true } }))
  await login(page)
  await page.getByRole('button', { name: 'Yeni', exact: true }).click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('status')).toContainText("yeni kayıtları pratikortam'a girin")
  await menu.getByRole('menuitem', { name: 'Gider Ekle' }).click()
  await expect(menu.getByRole('status')).toContainText("Gider Ekle: ayna açıkken bu kaydı pratikortam'a girin")
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/$/)
})

test('üst çubuktaki "Aa" ile yazı boyutu değişir', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Yazı boyutu' }).click()
  await page.getByRole('radio', { name: 'Büyük', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-text', 'lg')
  await page.getByRole('radio', { name: 'Normal' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-text', /.+/)
})
