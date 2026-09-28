import { expect, test } from '@playwright/test'
import { login } from './helpers'

const pages = ['/', '/seferler', '/araclar', '/musteriler', '/faturalar', '/tahsilatlar', '/giderler', '/raporlar', '/ayarlar']

test('mobil genişlikte yatay kaydırma yok ve menü çalışıyor', async ({ page }) => {
  await login(page)
  for (const path of pages) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    // Hiçbir kart ekran genişliğini aşmamalı (tablolar kendi içinde kayar).
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth,
      ...[...document.querySelectorAll('main, .card')].map((e) => e.getBoundingClientRect().right)) - window.innerWidth)
    expect(overflow, `${path} yatay taşma`).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `e2e/screenshots/mobile${path === '/' ? '-home' : path.replace('/', '-')}.png`, fullPage: true })
  }
  await page.getByRole('button', { name: 'Menüyü aç' }).click()
  await page.getByRole('link', { name: 'Seferler' }).click()
  await expect(page.getByRole('heading', { name: 'Seferler' })).toBeVisible()
})
