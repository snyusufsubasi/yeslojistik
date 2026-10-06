import { expect, test, type APIResponse } from '@playwright/test'
import { login, unique, useNewUi } from '../helpers'

/**
 * Bankalar (Kasa / Banka) — yeni görünüm.
 * Şartname: docs/plan/11-BANKALAR.md §3 (özet şeridi TOPLAM · KASA · BANKA · KREDİ KARTI, hesap araması, pasifler gizli),
 * §9 (yeni `new-ui/banka.spec.ts` senaryoları). Klasik görünüm bu testin kapsamı dışındadır (`workflow.spec.ts` onu korur).
 */
const ok = async <T>(res: Promise<APIResponse>) => { const r = await res; expect(r.ok(), await r.text()).toBeTruthy(); return (await r.json()) as T }

test('Bankalar: özet şeridi, hesap araması ve pasif gizleme', async ({ page }) => {
  const id = unique()
  const today = new Date().toISOString().slice(0, 10)
  await useNewUi(page)
  await login(page)
  // Kendi hesaplarını kur: biri aktif banka, biri pasif kasa (örnek veri ilk sayfayı doldurur, aramayla ayrılır).
  await ok(page.request.post('/api/cash-accounts', { data: { name: `E2E Banka ${id}`, kind: 'Bank', iban: null, openingBalance: 1000, openingBalanceDate: today, isActive: true } }))
  await ok(page.request.post('/api/cash-accounts', { data: { name: `E2E Pasif ${id}`, kind: 'Cash', iban: null, openingBalance: 0, openingBalanceDate: today, isActive: false } }))

  await page.goto('/kasa-banka')
  await expect(page.getByRole('heading', { name: 'Bankalar', level: 1 })).toBeVisible()

  // Özet şeridi: dört kutu, etiketleri şartnamedeki gibi.
  const strip = page.locator('[aria-label="Kasa ve banka toplamları"]')
  await expect(strip).toBeVisible()
  for (const label of ['Toplam', 'Kasa', 'Banka', 'Kredi kartı (borç)']) {
    await expect(strip.getByText(label, { exact: true })).toBeVisible()
  }

  // Arama yazarken liste süzer; pasif hesap varsayılan gizlidir.
  const search = page.getByPlaceholder('Hesap adı, IBAN...')
  await search.fill(`E2E Banka ${id}`)
  await expect(page.getByRole('button', { name: new RegExp(`E2E Banka ${id}`) })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`E2E Pasif ${id}`) })).toHaveCount(0)
  await search.fill(`E2E Pasif ${id}`)
  await expect(page.getByText('Aramanıza uyan hesap yok.')).toBeVisible()

  // "Pasifleri göster" açılınca pasif hesap ve eksi bakiye yerine "pasif" ibaresi görünür.
  await page.getByRole('button', { name: 'Pasifleri göster' }).click()
  await expect(page.getByRole('button', { name: new RegExp(`E2E Pasif ${id}`) })).toBeVisible()
  await expect(page.getByText('· pasif')).toHaveCount(1)

  // "Süzgeci temizle" boş durumdan geri getirir.
  await search.fill('zzz-bulunamaz')
  await page.getByRole('button', { name: 'Süzgeci temizle' }).click()
  await expect(search).toHaveValue('')
  await expect(page.getByRole('button', { name: new RegExp(`E2E Banka ${id}`) })).toBeVisible()

  // Yeni görünümde nadir işler "⋯ Diğer" menüsünde, tek ana düğme "Hesap Ekle".
  await page.getByRole('button', { name: 'Diğer', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Virman' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: "Excel'den Aktar" })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: 'Virman' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Hesap Ekle' })).toBeVisible()
})

test('klasik görünümdeki Kasa / Banka sayfası değişmedi (özet şeridi ve arama yok)', async ({ page }) => {
  await login(page)
  await page.goto('/kasa-banka')
  await expect(page.getByRole('heading', { name: 'Kasa / Banka', level: 1 })).toBeVisible()
  // Klasikte düğmeler başlıkta durur.
  await expect(page.getByRole('button', { name: 'Virman', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hesap Ekle' })).toBeVisible()
  await expect(page.getByRole('button', { name: "Excel'den Aktar" })).toBeVisible()
  // Özet şeridi, arama ve pasif anahtarı YALNIZ yeni görünümde çizilir.
  await expect(page.locator('[aria-label="Kasa ve banka toplamları"]')).toHaveCount(0)
  await expect(page.getByPlaceholder('Hesap adı, IBAN...')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Pasifleri göster' })).toHaveCount(0)
})
