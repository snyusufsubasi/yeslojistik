import { expect, test, type Page } from '@playwright/test'
import { login, useNewUi } from '../helpers'

/**
 * F5 (kalan) — Kart görünümü olmayan liste ekranlarının telefonda karta çevrilmesi.
 * Şartname: docs/plan/27-TELEFON.md §10.8 ve kabul ölçütü §11.3 (kart görünür + tablo gizli + yatay taşma yok).
 *
 * Yalnız YENİ görünüm (`useNewUi`) ve yalnız telefon (390×844). Dosya adı "mobile" içerir; bu yüzden
 * Playwright `mobile` projesinde koşar, masaüstü projesinde koşmaz (playwright.config.ts testMatch/testIgnore).
 * Klasik görünümde `mobileCard` hiç verilmez; o davranış `e2e/mobile.spec.ts` ile ayrıca korunur.
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

/** Kart listesini ve sayfadaki tabloyu bulur; yatay taşmayı ölçer. */
async function cardList(page: Page) {
  return page.locator('main ul.divide-y').first()
}

async function expectCardsNoOverflow(page: Page, path: string) {
  const cards = await cardList(page)
  await expect(cards, `${path}: kart listesi görünmeli`).toBeVisible()
  await expect(page.locator('main table'), `${path}: tablo telefonda gizli olmalı`).toBeHidden()
  expect(await cards.locator('> li').count(), `${path}: en az bir kart`).toBeGreaterThan(0)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${path}: yatay taşma`).toBeLessThanOrEqual(1)
  return cards
}

test('Araçlar listesi telefonda kart olur, kart ≤120px, ⋯ ≥44px ve taşma yok', async ({ page }) => {
  await useNewUi(page)
  await login(page)

  await page.goto('/araclar')
  await page.waitForLoadState('networkidle')
  const cards = await expectCardsNoOverflow(page, '/araclar')

  // Kart ölçüsü: şartname kart ≤120px der (kabul ölçütü §11.4).
  const first = cards.locator('> li').first()
  const box = await first.boundingBox()
  expect(box?.height ?? 0, '/araclar kart yüksekliği').toBeLessThanOrEqual(120)

  // ⋯ düğmesinin erişilebilir adı plakayı taşır: "34 ABC 123 işlemleri".
  const menu = first.getByRole('button', { name: /işlemleri$/ })
  await expect(menu).toBeVisible()
  const menuBox = await menu.boundingBox()
  expect(menuBox?.width ?? 0).toBeGreaterThanOrEqual(44)
  expect(menuBox?.height ?? 0).toBeGreaterThanOrEqual(44)

  // ⋯ menüsü açılır ve satır işlemleri görünür (menü maddeleri ≥44px).
  await menu.click()
  const item = page.getByRole('menuitem', { name: /^(Düzenle|Sil)$/ }).first()
  await expect(item).toBeVisible()
  const itemBox = await item.boundingBox()
  expect(itemBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  await page.keyboard.press('Escape')

  // Kart klavyeyle açılır (role=button + Enter): araç formu açılmalı.
  await first.locator('[role="button"]').first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog').first()).toBeHidden()
})

test('Çek/Senet listesi telefonda kart olur (tablo gizli, taşma yok)', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  await page.goto('/cek-senet')
  await page.waitForLoadState('networkidle')
  const cards = await expectCardsNoOverflow(page, '/cek-senet')
  const box = await cards.locator('> li').first().boundingBox()
  expect(box?.height ?? 0, '/cek-senet kart yüksekliği').toBeLessThanOrEqual(120)
})

test('Tahsilatlar, Ödemeler ve Alınan Faturalar listeleri telefonda kart olur', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  for (const path of ['/tahsilatlar', '/odemeler', '/alinan-faturalar']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expectCardsNoOverflow(page, path)
  }
})

test('Raporlar liste bölümleri telefonda kart olur; sayfa yana kaymaz', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  await page.goto('/raporlar')
  await page.waitForLoadState('networkidle')

  // Rapor sekmeleri: her liste bölümü telefonda tablo yerine kart gösterir.
  const sections = ['Aylık Özet', 'Müşteri Kârlılığı', 'Alacak Yaşlandırma', 'Gider Dağılımı'] as const
  for (const tab of sections) {
    await page.getByRole('tab', { name: tab }).click()
    await page.waitForLoadState('networkidle')
    const list = page.locator('main ul.divide-y').first()
    await expect(list, `Raporlar/${tab}: kart listesi`).toBeVisible()
    expect(await list.locator('> li').count(), `Raporlar/${tab}: kart sayısı`).toBeGreaterThan(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `Raporlar/${tab}: yatay taşma`).toBeLessThanOrEqual(1)
  }

  // Masaüstünde (1440px) kart yok, tablo geri gelir: telefon düzeni geniş ekrana sızmaz.
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('main ul.divide-y').first()).toBeHidden()
  await expect(page.locator('main table').first()).toBeVisible()
})
