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
