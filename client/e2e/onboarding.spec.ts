import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { login, unique } from './helpers'

/** Sağlama toplamı geçerli sahte VKN üretir (9 hane + kontrol hanesi). */
function fakeVkn(base: string) {
  let sum = 0
  for (let i = 0; i < 9; i++) {
    const tmp = (Number(base[i]) + 9 - i) % 10
    let v = (tmp * 2 ** (9 - i)) % 9
    if (tmp !== 0 && v === 0) v = 9
    sum += v
  }
  return base + String((10 - (sum % 10)) % 10)
}

async function getSettings(page: Page) {
  return (await (await page.request.get('/api/settings')).json()) as Record<string, unknown>
}
async function putSettings(page: Page, body: Record<string, unknown>) {
  const res = await page.request.put('/api/settings', { data: body })
  expect(res.ok(), await res.text()).toBeTruthy()
}

function tmpFile(name: string, content: string) {
  const file = path.join(os.tmpdir(), `${unique()}-${name}`)
  fs.writeFileSync(file, content, 'utf8')
  return file
}

test('beyaz etiket: firma adı menüde, sekme başlığında ve giriş sayfasında görünür', async ({ page, browser }) => {
  await login(page)
  const original = await getSettings(page)
  try {
    // Varsayılan görünüm: sarı "YES" kutusu + "Lojistik".
    await expect(page.getByRole('link', { name: 'YES Lojistik' }).first()).toBeVisible()
    await putSettings(page, { ...original, companyName: 'Örnek Taşımacılık A.Ş.' })
    await page.goto('/musteriler')
    await expect(page.getByRole('link', { name: 'Örnek Taşımacılık A.Ş.' }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Ana menü' })).toBeVisible()
    await expect.poll(() => page.title()).toContain('Örnek Taşımacılık A.Ş.')
    await expect(page.getByText('Örnek Taşımacılık A.Ş. · v')).toBeVisible()

    // Giriş yapmamış biri de firma adını görür.
    const anon = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173', locale: 'tr-TR' })
    const login2 = await anon.newPage()
    await login2.goto('/giris')
    await expect(login2.getByText('Örnek Taşımacılık A.Ş.').first()).toBeVisible()
    await anon.close()
  } finally {
    await putSettings(page, original)
  }
})

test('veri aktarma sihirbazı: CSV yükle → önizleme → yalnız geçerli satırları aktar → hata raporu', async ({ page }) => {
  await login(page)
  const id = unique()
  const goodVkn = fakeVkn(('9' + id + '00000').slice(0, 9))
  const csv = [
    'Ünvan;VKN/TCKN;Telefon;Devir Bakiyesi',
    `Sihirbaz Mobilya ${id};${goodVkn};0532 111 22 33;1.500,50`,
    `Sihirbaz Nakliyat ${id};;;`,
    `Hatalı VKN Ltd ${id};12345;;`,
    'Yıldız Mobilya;;;',
  ].join('\r\n')
  await page.goto('/aktar?tur=customers')
  await expect(page.getByRole('heading', { name: 'Veri Aktarımı' })).toBeVisible()

  // Şablon indirilir (iki örnek satırlı xlsx).
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Şablonu indir' }).click()
  expect(fs.statSync(await (await dl).path()).size).toBeGreaterThan(1000)

  await page.getByLabel('Excel veya CSV dosyası').setInputFiles(tmpFile('musteriler.csv', csv))
  const summary = page.getByLabel('Kontrol özeti')
  await expect(summary).toBeVisible()
  await expect(summary.getByText('Toplam satır').locator('..')).toContainText('4')
  await expect(summary.getByText('Hatalı').locator('..')).toContainText('1')
  await expect(summary.getByText('Tekrar').locator('..')).toContainText('1')
  // Sorunlu satırlar sebebiyle gösterilir: satır numarası + sade Türkçe açıklama.
  await expect(page.getByRole('row', { name: /4 Hatalı Hatalı VKN Ltd/ })).toContainText('VKN (10 hane)')
  await expect(page.getByRole('row', { name: /5 Tekrar Yıldız Mobilya/ })).toContainText('zaten kayıtlı')
  // Kontrol aşamasında hiçbir şey kaydedilmemiştir.
  const before = await (await page.request.get(`/api/customers?search=${id}`)).json()
  expect(before.total).toBe(0)

  const report = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Hata raporunu indir (CSV)' }).click()
  const reportText = fs.readFileSync(await (await report).path(), 'utf8')
  expect(reportText).toContain('Hatalı VKN Ltd')
  expect(reportText).toContain('VKN (10 hane)')

  await page.getByRole('button', { name: /Geçerli 2 satırı içe aktar/ }).click()
  await expect(page.getByText('2 müşteri eklendi.')).toBeVisible()
  const after = await (await page.request.get(`/api/customers?search=${id}`)).json()
  expect(after.total).toBe(2)
  expect(after.items.find((c: { title: string }) => c.title === `Sihirbaz Mobilya ${id}`).balance).toBe(1500.5)
  // Yanlış satır eklenmemiştir.
  expect((await (await page.request.get(`/api/customers?search=Hatalı VKN Ltd ${id}`)).json()).total).toBe(0)
})

test('çok büyük dosya net bir mesajla reddedilir', async ({ page }) => {
  await login(page)
  await page.goto('/aktar?tur=suppliers')
  const big = path.join(os.tmpdir(), `${unique()}-buyuk.csv`)
  fs.writeFileSync(big, Buffer.alloc(5 * 1024 * 1024 + 100, 'a'))
  await page.getByLabel('Excel veya CSV dosyası').setInputFiles(big)
  await expect(page.getByRole('alert')).toContainText('En fazla 5 MB')
})

test('kurulum sihirbazı: ana sayfadaki kart → firma bilgileri → adımlar atlanır → bitir', async ({ page }) => {
  await login(page)
  const original = await getSettings(page)
  try {
    await putSettings(page, { ...original, taxNumber: null, address: null })
    await page.evaluate(() => localStorage.removeItem('yl.kurulum'))
    await page.goto('/')
    const card = page.getByRole('region', { name: 'Kuruluma başlayın' })
    await expect(card).toBeVisible()
    await card.getByRole('link', { name: 'Kurulum sihirbazını aç' }).click()

    await expect(page).toHaveURL(/\/kurulum/)
    await expect(page.getByRole('heading', { name: 'Kurulum Sihirbazı' })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Kurulum ilerlemesi' })).toBeVisible()
    await page.getByLabel('Vergi no (VKN/TCKN)').fill(fakeVkn('123456789'))
    await page.getByLabel('Adres').fill('Deneme Mah. Örnek Sok. No 1 Tuzla')
    await page.getByRole('button', { name: 'Kaydet ve devam et' }).click()
    await expect(page.getByText('Firma bilgileri kaydedildi.')).toBeVisible()

    // 2. adım: fatura varsayılanları
    await expect(page.getByRole('heading', { name: /2\. Fatura ve KDV/ })).toBeVisible()
    await expect(page.getByLabel('Varsayılan KDV (%)')).toBeVisible()
    await page.getByRole('button', { name: 'Bu adımı atla' }).click()
    // 3. adım: veri aktarma sihirbazı burada da çalışır
    await expect(page.getByRole('heading', { name: /3\. Verileri getir/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Şablonu indir' })).toBeVisible()
    await page.getByRole('button', { name: 'Bu adımı atla' }).click()
    // 4. adım: kullanıcılar
    await expect(page.getByRole('heading', { name: /4\. İlk kullanıcılar/ })).toBeVisible()
    await page.getByRole('button', { name: 'Bu adımı atla' }).click()
    // 5. adım: kayıt varsa örnek veri yüklenemez; boş başla
    await expect(page.getByRole('button', { name: 'Örnek verileri yükle' })).toBeDisabled()
    await page.getByRole('button', { name: 'Kurulumu bitir' }).click()
    await expect(page.getByRole('heading', { name: /Günaydın|İyi (günler|akşamlar|geceler)/ })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Kuruluma başlayın' })).toHaveCount(0)
    expect((await getSettings(page)).taxNumber).toBe(fakeVkn('123456789'))
  } finally {
    await putSettings(page, original)
    await page.evaluate(() => localStorage.removeItem('yl.kurulum'))
  }
})

test('boş listelerde ilk adım kartı; ayna açıkken düğmeler gizlenir', async ({ page }) => {
  await login(page)
  const empty = { items: [], total: 0, page: 1, pageSize: 20 }
  await page.route(/\/api\/customers\?/, (route) => route.fulfill({ json: empty }))
  await page.goto('/musteriler')
  await expect(page.getByText('İlk müşterinizi ekleyin')).toBeVisible()
  await expect(page.getByRole('link', { name: "Excel'den aktarın" })).toHaveAttribute('href', '/aktar?tur=customers')
  await page.getByRole("button", { name: "Yeni müşteri", exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  // Arama yapılmışsa "ilk müşteri" değil "aramanıza uyan kayıt yok" denir.
  await page.getByPlaceholder('Ünvan, VKN, telefon...').fill('olmayan')
  await expect(page.getByText('Aramanıza uyan kayıt yok.')).toBeVisible()
  await expect(page.getByText('İlk müşterinizi ekleyin')).toHaveCount(0)

  // Ayna açık: ekleme düğmesi ve Excel bağlantısı yok.
  await page.route(/\/api\/legacy\/status/, async (route) => {
    const res = await route.fetch()
    await route.fulfill({ response: res, json: { ...(await res.json()), mirrorMode: true } })
  })
  await page.goto('/musteriler')
  await expect(page.getByText('Pratikortam aynası açık: kayıtlar pratikortam’dan gelir')).toBeVisible()
  await expect(page.getByRole("button", { name: "Yeni müşteri", exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: "Excel'den aktarın" })).toHaveCount(0)
})
