import { expect, test } from '@playwright/test'

test('Ana sayfa (telefon): yatay taşma yok, menü açılır, Giriş Yap görünür', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /nakliye işiniz/ })).toBeVisible()
  const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  await expect(page.getByRole('banner').getByRole('link', { name: 'Giriş Yap' })).toBeVisible()
  await page.getByRole('button', { name: 'Menüyü aç' }).click()
  const menu = page.getByRole('navigation', { name: 'Mobil menü' })
  await menu.getByRole('link', { name: 'SSS' }).click()
  await expect(menu).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Sık sorulan sorular' })).toBeInViewport()
})
