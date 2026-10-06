import { expect, test, type Locator, type Page } from '@playwright/test'
import { login, useNewUi } from '../helpers'

/**
 * F6 (cila) — telefon (390×844) doğrulaması. Yalnız YENİ görünüm (`useNewUi`) içindir.
 *
 * 1) `/seferler`: küçük ekranda tablo yerine kart listesi. Her kart en çok 120px; müşteri + tarih + güzergâh,
 *    sağda mono tutar, durum rozeti ve "⋯" menüsü. "⋯" ve menü maddeleri ≥44px dokunma hedefi.
 *    Karta dokunmak yeni görünümde `DetailDrawer`'ı açar (klasikte bugünkü düzenleme davranışı sürer).
 * 2) e-Fatura'nın dört sekmesi 390px'e sığmaz: şerit kendi içinde yatay kaydırılır, etkin sekme şeridin
 *    görünür alanında kalır, ama SAYFA yana kaymaz.
 *
 * Dosya adı "mobile" içerdiği için yalnız `mobile` projesinde koşar (playwright.config.ts).
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

/** Ögenin kutusu: görünmüyorsa test burada durur (ölçümler için kısa yol). */
async function box(locator: Locator) {
  const b = await locator.boundingBox()
  expect(b, 'öge görünür olmalı').not.toBeNull()
  return b ?? { x: 0, y: 0, width: 0, height: 0 }
}

/** Belgenin yatay taşması (px): 0 ise sayfa yana kaymıyor. */
const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('telefonda sevkiyat kartları: ≤120px, ⋯ menülü, karta dokunma çekmeceyi açar, yatay taşma yok', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  await page.goto('/seferler')
  await page.waitForLoadState('networkidle')

  // Telefonda kart listesi görünür, tablo gizli.
  const list = page.locator('main ul.divide-y').first()
  await expect(list).toBeVisible()
  await expect(page.locator('main table')).toBeHidden()

  // "⋯" menüsü taşıyan ögeler gerçek kartlardır (listenin ilk <li>'si seçim başlığıdır).
  const menuButton = 'button[aria-label$="işlemleri"]'
  const cards = list.locator('> li').filter({ has: page.locator(menuButton) })
  expect(await cards.count(), '/seferler kart sayısı').toBeGreaterThan(0)

  // Her kart en çok 120px yüksek (uzun güzergâh iki satıra kırpılır).
  for (const card of await cards.all()) {
    const b = await box(card)
    expect(b.height, 'kart yüksekliği ≤120px').toBeLessThanOrEqual(120)
  }

  const first = cards.first()
  // Müşteri + tarih + güzergâh + durum rozeti tek kartta.
  await expect(first).toContainText(/\d{2}\.\d{2}\.\d{4}/)
  await expect(first).toContainText('→')
  await expect(first.getByText(/Planlandı|Yüklendi|Yolda|Teslim Edildi|İptal/).first()).toBeVisible()
  // Sağdaki tutar Overpass Mono (`.tabular-nums` yazı tipini mono yapar).
  const amountFont = await first.locator('.tabular-nums').first().evaluate((el) => getComputedStyle(el).fontFamily)
  expect(amountFont.toLowerCase()).toContain('overpass')

  // "⋯" düğmesi ve açılan menü maddeleri ≥44px dokunma hedefi.
  const menu = first.locator(menuButton)
  const menuBox = await box(menu)
  expect(menuBox.width).toBeGreaterThanOrEqual(44)
  expect(menuBox.height).toBeGreaterThanOrEqual(44)
  await menu.click()
  const item = page.getByRole('menuitem', { name: 'Detay' })
  await expect(item).toBeVisible()
  expect((await box(item)).height, 'menü maddesi ≥44px').toBeGreaterThanOrEqual(44)
  // Esc menüyü kapatır, odak "⋯" düğmesine döner; menü mantığı bozulmadı.
  await page.keyboard.press('Escape')
  await expect(item).toBeHidden()
  await expect(menu).toBeFocused()

  // Sayfa yana kaymıyor.
  expect(await horizontalOverflow(page), '/seferler yatay taşma').toBeLessThanOrEqual(1)

  // Karta dokunma: yeni görünümde sağdan çekmece açılır ve adres `?id=` taşır.
  await first.click()
  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  await expect(drawer).toContainText('Sevkiyat #')
  await expect(page).toHaveURL(/[?&]id=\d+/)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page).not.toHaveURL(/[?&]id=/)
})

test('e-Fatura sekme şeridi telefonda kaydırılabilir, etkin sekme görünür, sayfa yana kaymaz', async ({ page }) => {
  await useNewUi(page)
  await login(page)
  await page.goto('/faturalar')
  await page.waitForLoadState('networkidle')

  const nav = page.getByRole('navigation', { name: 'Bölüm sekmeleri' })
  await expect(nav).toBeVisible()
  const tabs = nav.getByRole('tab')
  await expect(tabs).toHaveCount(4)

  // Şerit kendi içinde kaydırılabilir: içerik görünür alandan geniş (390px'e dört sekme sığmaz).
  const scroll = await nav.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollLeft: el.scrollLeft }))
  expect(scroll.scrollWidth, 'şerit içeriği görünür alandan geniş olmalı').toBeGreaterThan(scroll.clientWidth + 1)

  // ...ama SAYFA yana kaymaz (şerit kendi içinde kayar).
  expect(await horizontalOverflow(page), '/faturalar yatay taşma').toBeLessThanOrEqual(1)

  // Etkin sekme şeridin görünür alanında tam görünür (`scrollIntoView` ile hizalanır).
  const active = nav.locator('[role="tab"][aria-selected="true"]')
  await expect(active).toHaveCount(1)
  const navBox = await box(nav)
  const activeBox = await box(active)
  expect(activeBox.x, 'etkin sekme soldan taşmamalı').toBeGreaterThanOrEqual(navBox.x - 1)
  expect(activeBox.x + activeBox.width, 'etkin sekme sağdan taşmamalı').toBeLessThanOrEqual(navBox.x + navBox.width + 1)

  // Şerit gerçekten kayıyor: sona kaydırınca son sekme görünür alana girer.
  await nav.evaluate((el) => { el.scrollLeft = el.scrollWidth })
  const lastBox = await box(tabs.last())
  expect(lastBox.x).toBeGreaterThanOrEqual(navBox.x - 1)
  expect(lastBox.x + lastBox.width).toBeLessThanOrEqual(navBox.x + navBox.width + 1)
})
