import { expect, test } from '@playwright/test'
import { login, useNewUi } from '../helpers'

/**
 * F5 — Telefon (390×844) davranışı: kart görünümü, alt menü şeridi, tam ekran süzgeç.
 * Şartname: docs/plan/27-TELEFON.md. Yalnız YENİ görünümde geçerlidir (`useNewUi`).
 *
 * Playwright projeleri: bu dosya `mobile` projesinde koşar (playwright.config.ts `testMatch: /mobile/`).
 * Dosya adı bilerek "mobile" içerir; masaüstü projesinde koşmaz. Kart görünümü yalnız 640px altında
 * anlamlı olduğu için koşuyu burada 390×844'e sabitliyoruz.
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test('telefonda liste kart olur, alt şerit beş yuva taşır, süzgeç tam ekran ve taşma yok', async ({ page }) => {
  await useNewUi(page)
  await login(page)

  // 1) Liste: telefonda kart listesi görünür, tablo görünmez; sayfa yana kaymaz.
  await page.goto('/musteriler')
  await page.waitForLoadState('networkidle')
  const cardList = page.locator('main ul.divide-y').first()
  await expect(cardList).toBeVisible()
  await expect(page.locator('main table')).toBeHidden()
  const cards = cardList.locator('> li')
  expect(await cards.count()).toBeGreaterThan(0)

  // Kart: başlık + bilgi satırı + sağda mono tutar + "⋯" satır menüsü (≥44px dokunma hedefi).
  const first = cards.first()
  await expect(first.locator('button[aria-label="İşlemler"]')).toBeVisible()
  const menuBox = await first.locator('button[aria-label="İşlemler"]').boundingBox()
  expect(menuBox?.width ?? 0).toBeGreaterThanOrEqual(44)
  expect(menuBox?.height ?? 0).toBeGreaterThanOrEqual(44)

  // Yatay kaydırma yok: belge genişliği görüntü alanını aşmaz.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, '/musteriler yatay taşma').toBeLessThanOrEqual(1)

  // 2) Alt menü şeridi: beş yuva, etkin yuva işaretli, hepsi en az 56px yüksek.
  const bar = page.getByRole('navigation', { name: 'Alt kısayollar' })
  await expect(bar).toBeVisible()
  const slots = ['Bugün', 'Sevkiyatlar', 'Faturalar', 'Cariler', 'Diğer']
  for (const label of slots) await expect(bar.getByText(label, { exact: true })).toBeVisible()
  await expect(bar.locator('[aria-current="page"]')).toHaveCount(1)
  for (const label of ['Bugün', 'Sevkiyatlar', 'Faturalar', 'Cariler']) {
    const box = await bar.getByRole('link', { name: `${label} (kısayol)` }).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56)
  }

  // "Faturalar" yuvası doğru adrese gider; etkin yuva orada da işaretlenir.
  await bar.getByRole('link', { name: 'Faturalar (kısayol)' }).click()
  await expect(page).toHaveURL(/\/faturalar$/)
  await expect(bar.locator('[aria-current="page"]')).toHaveCount(1)

  // 3) Süzgeç paneli telefonda tam ekran: 390×844'ü kaplar, kapatma düğmesi ≥44px.
  await page.goto('/seferler')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^Süzgeç/ }).click()
  const panel = page.getByRole('dialog', { name: 'Süzgeç' })
  await expect(panel).toBeVisible()
  const panelBox = await panel.boundingBox()
  expect(panelBox?.width ?? 0).toBeGreaterThanOrEqual(390)
  expect(panelBox?.height ?? 0).toBeGreaterThanOrEqual(844)
  const closeBox = await panel.getByRole('button', { name: 'Kapat' }).boundingBox()
  expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44)
  expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  // Panel açıkken gövde kaydırması kilitli (mevcut davranış korunur).
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  // 4) Sevkiyatlar listesinde de kart görünür, tablo gizli ve yine taşma yok.
  await expect(page.locator('main ul.divide-y').first()).toBeVisible()
  await expect(page.locator('main table')).toBeHidden()
  const tripOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(tripOverflow, '/seferler yatay taşma').toBeLessThanOrEqual(1)

  // 5) Masaüstünde (1440px) alt şerit gizli, tablo geri gelir: telefon düzeni geniş ekrana sızmaz.
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(bar).toBeHidden()
  await expect(page.locator('main table')).toBeVisible()
})
