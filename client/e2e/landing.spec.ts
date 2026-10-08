import { expect, test } from '@playwright/test'

// Herkese açık ana sayfa: oturum yoksa tanıtım görünür, oturum kontrolünü (/api/auth/me) beklemez.

test('Ana sayfa: ziyaretçi tanıtımı görür, Giriş Yap girişe götürür', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /nakliye işiniz/ })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  for (const name of ['Özellikler', 'Nasıl çalışır', 'Kimler için', 'SSS']) {
    await expect(page.getByRole('navigation', { name: 'Ana menü' }).getByRole('link', { name })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: 'Demo iste' }).first()).toHaveAttribute('href', /^mailto:ysufsubasi@yeslojistik\.net/)
  await expect(page.getByRole('link', { name: 'Gizlilik' })).toHaveAttribute('href', '/gizlilik')
  await expect(page.getByRole('link', { name: 'Hesap silme' })).toHaveAttribute('href', '/hesap-silme')
  await page.getByRole('banner').getByRole('link', { name: 'Giriş Yap' }).click()
  await expect(page).toHaveURL(/\/giris$/)
  await expect(page.getByLabel('E-posta')).toBeVisible()
})

test('Ana sayfa: sunucu yavaşken de tanıtım hemen açılır', async ({ page }) => {
  // Oturum kontrolü hiç yanıt vermese bile (uyuyan/yavaş sunucu) sayfa beklemez.
  await page.route('**/api/auth/me', () => new Promise(() => {}))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /nakliye işiniz/ })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('Korunan sayfa: oturum yoksa girişe yönlenir', async ({ page }) => {
  await page.route('**/api/auth/me', (r) => r.fulfill({ status: 401, body: '' }))
  await page.goto('/seferler')
  await expect(page).toHaveURL(/\/giris$/)
})
