import { expect, test } from '@playwright/test'
import { login, useNewUi } from '../helpers'

/**
 * Faturalandırılacaklar sekmesi (docs/plan/06-FATURALANDIRILACAKLAR.md):
 * adres `/faturalar?sekme=bekleyen`; sekme çubuğu sorgu parametresine duyarlı olmalı.
 */
test('Faturalandırılacaklar sekmesi sorguya göre aktif olur', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  await page.goto('/faturalar?sekme=bekleyen')
  const tabs = page.getByRole('navigation', { name: 'Bölüm sekmeleri' })
  await expect(tabs.getByRole('tab', { name: 'Faturalandırılacaklar' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Faturalanacak sevkiyat')).toBeVisible()

  await tabs.getByRole('tab', { name: 'Kesilen Faturalar' }).click()
  await expect(page).toHaveURL(/\/faturalar$/)
  await expect(tabs.getByRole('tab', { name: 'Kesilen Faturalar' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Faturalanacak sevkiyat')).toHaveCount(0)
})
