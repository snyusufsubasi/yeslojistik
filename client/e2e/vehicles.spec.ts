import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('Araçlar: öz araçlar ayrı, taşeron araçları kendi sekmesinde', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Araçlar', exact: true }).click()
  const own = page.getByRole('tab', { name: 'Öz araçlarım' })
  await expect(own).toHaveAttribute('aria-selected', 'true')
  // Testler çalıştıkça "34 …" plakalı çok araç birikir; tam plakayla aranır ki örnek araç ilk sayfada kalsın.
  const search = page.getByPlaceholder('Plaka, marka, tip...')
  await search.fill('34 VES 01')
  await expect(page.getByRole('row').filter({ hasText: '34 VES 01' })).toHaveCount(1)
  await search.fill('34 DMR 34')
  await expect(page.getByRole('row').filter({ hasText: '34 DMR 34' })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Taşeron araçları' }).click()
  await expect(page).toHaveURL(/tip=taseron/)
  await expect(page.getByRole('row').filter({ hasText: '34 DMR 34' })).toHaveCount(1)
  await search.fill('34 VES 01')
  await expect(page.getByRole('row').filter({ hasText: '34 VES 01' })).toHaveCount(0)
})
