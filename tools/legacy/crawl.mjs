// Eski panelin (pratikortam.com) haritasını çıkaran SALT OKUMA robotu.
//
// Kullanım (bulut oturumunda, PRATIK_USER / PRATIK_PASS ortam değişkenleriyle):
//   node tools/legacy/crawl.mjs --out <repo dışı klasör> [--max 400] [--base https://pratikortam.com/zz_revize/]
// Giriş SMS kodu isterse robot <out>/sms.txt dosyasına 6 haneli kodun yazılmasını bekler (10 dakika).
//
// Güvenlik kuralları (kodda zorunlu):
//  - Giriş istekleri dışında hiçbir POST/PUT/PATCH/DELETE gönderilmez (page.route ile engellenir).
//  - Adresinde sil/delete/kaldır/iptal/güncelle/kaydet/ekle/onay/çıkış geçen linklere GET bile yapılmaz.
//  - Düğmelere tıklanmaz; yalnız linkler izlenir. Saniyede en fazla 1 sayfa açılır.
//  - Şifre ve SMS kodu hiçbir yere yazılmaz; çıktılar repo dışındaki --out klasörüne gider.
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(new URL('../../client/package.json', import.meta.url))
const { chromium } = require('@playwright/test')

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []))
const BASE = new URL(args.base ?? 'https://pratikortam.com/zz_revize/')
const OUT = args.out
const MAX = Number(args.max ?? 400)
const PER_TEMPLATE = Number(args.samples ?? 3)
const LOGIN_PATHS = ['giris.php', 'cikis.php', 'islemler/tlfn_st.php', 'islemler/giris_yap.php']
const LOGIN_POSTS = ['islemler/tlfn_st.php', 'islemler/giris_yap.php']

/** Kesinlikle değiştiren işlemler: robot bunlara hiç gitmez. */
export const DANGEROUS = /(sil|delete|remove|kaldir|kaldır|iptal|cancel|onay|approve|cikis|çıkış|logout|reset|temizle|gonder|gönder|send|mail|sms|odendi|ödendi|aktar|kapat)/i
/** Form sayfaları (ekle/düzenle): yalnız parametresiz ya da tek bir kimlik parametresiyle açılır; değer taşıyan istek güncelleme olabilir. */
const FORM_PAGE = /(ekle|add|duzenle|düzenle|edit|guncelle|güncelle|update|kaydet|save|insert)/i
const ID_KEYS = /^(id|no|kod|[a-z_]*_?id)$/i

/**
 * Robotun gezinebileceği sayfa mı? `background` true ise sayfanın kendi arka plan (XHR, resim) GET isteği için bakılır:
 * listeleri dolduran islemler/*.php okumalarına izin verilir, ama aynı yasaklı kelimeler orada da geçerlidir.
 */
export function isSafeUrl(url, base = BASE, background = false) {
  const u = new URL(url, base)
  if (u.origin !== base.origin || !u.pathname.startsWith(base.pathname)) return false
  if (!/\.php$|\/$/.test(u.pathname)) return false
  const rel = u.pathname.slice(base.pathname.length)
  if (LOGIN_PATHS.includes(rel) || (!background && rel.startsWith('islemler/'))) return false
  let target
  try { target = decodeURIComponent(u.pathname + u.search) } catch { target = u.pathname + u.search }
  if (DANGEROUS.test(target)) return false
  if (FORM_PAGE.test(target)) {
    const keys = [...new URLSearchParams(u.search).keys()]
    return keys.length === 0 || (keys.length === 1 && ID_KEYS.test(keys[0]))
  }
  return true
}

/** Aynı şablondaki sayfalar (detay.php?id=1, ?id=2…) tek şablon sayılır; her şablondan birkaç örnek yeter. */
export const templateOf = (url) => { const u = new URL(url); return u.pathname + '?' + [...new URLSearchParams(u.search).keys()].sort().join('&') }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Engellenen gezinme 204 ile yanıtlanır: tarayıcı bulunduğu sayfada kalır (hata sayfasına düşmez); diğer istekler iptal edilir. */
const block = (route) => route.request().isNavigationRequest() ? route.fulfill({ status: 204, body: '' }) : route.abort('blockedbyclient')

export async function guard(context, base, state) {
  await context.route('**/*', (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const rel = url.pathname.slice(base.pathname.length)
    if (req.method() !== 'GET') {
      if (state.loggingIn && url.origin === base.origin && LOGIN_POSTS.includes(rel)) return route.continue()
      state.blocked.push(`${req.method()} ${url.pathname}`)
      return block(route)
    }
    // Aynı sitedeki her .php isteği (gezinme, XHR, resim) güvenlik listesinden geçmeli; css/js/resim dosyaları serbest.
    const php = url.origin === base.origin && /\.php$/.test(url.pathname)
    if (php && !state.loggingIn && !isSafeUrl(url.href, base, !req.isNavigationRequest())) {
      state.blocked.push(`GET ${url.pathname}${url.search}`)
      return block(route)
    }
    return route.continue()
  })
}

async function login(page, state) {
  const user = process.env.PRATIK_USER, pass = process.env.PRATIK_PASS
  if (!user || !pass) throw new Error('PRATIK_USER ve PRATIK_PASS ortam değişkenleri yok. Ortam ayarlarına ekleyip yeni oturum açın.')
  state.loggingIn = true
  await page.goto(new URL('giris.php', BASE).href)
  await page.fill('#kullanici_adi', user)
  await page.fill('#sifre', pass)
  const firstStep = page.waitForResponse((r) => r.url().includes('islemler/tlfn_st.php'), { timeout: 20000 })
  await page.evaluate(() => window.glck_st())
  const answer = (await (await firstStep).text()).trim()
  if (answer === '-2') throw new Error('E-posta veya şifre hatalı.')
  if (answer === '1') {
    const smsFile = join(OUT, 'sms.txt')
    rmSync(smsFile, { force: true })
    console.log(`SMS KODU GEREKİYOR: telefona gelen 6 haneli kodu ${smsFile} dosyasına yazın (10 dakika bekleniyor).`)
    let code = ''
    for (let i = 0; i < 600 && !/^\d{6}$/.test(code); i++) {
      await sleep(1000)
      if (existsSync(smsFile)) code = readFileSync(smsFile, 'utf8').trim()
    }
    rmSync(smsFile, { force: true })
    if (!/^\d{6}$/.test(code)) throw new Error('SMS kodu gelmedi.')
    await page.fill('#tlfn_kd', code)
    await Promise.all([page.waitForURL(/anasayfa\.php/, { timeout: 30000 }), page.evaluate(() => window.tlfn_kntrl())])
  } else if (answer === '0') {
    await page.waitForURL(/anasayfa\.php/, { timeout: 30000 })
  } else {
    throw new Error(`Giriş beklenmeyen yanıt verdi (${answer}).`)
  }
  state.loggingIn = false
  console.log('Giriş yapıldı.')
}

/** Sayfanın yapısını çıkarır: menü linkleri, tablolar (başlık + satır sayısı), formlar (alanlar, seçenekler), düğmeler. */
async function describe(page) {
  return page.evaluate(() => {
    const text = (el) => (el?.innerText ?? el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const labelFor = (el) => {
      if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return text(l) }
      const wrap = el.closest('label'); if (wrap) return text(wrap)
      // Hemen önceki metin (başka bir alana rastlamadan); yoksa yer tutucu ya da alan adı.
      let p = el.previousElementSibling
      while (p && !text(p) && !p.matches('input,select,textarea')) p = p.previousElementSibling
      const prev = p && !p.matches('input,select,textarea') ? text(p) : ''
      return prev || el.getAttribute('placeholder') || el.name || el.id || ''
    }
    return {
      title: document.title,
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,.card-title,.modal-title')].map(text).filter(Boolean).slice(0, 40),
      links: [...document.querySelectorAll('a[href]')].map((a) => ({ text: text(a), href: a.href })).filter((l) => l.text || l.href),
      tables: [...document.querySelectorAll('table')].map((t) => ({
        id: t.id || null,
        headers: [...t.querySelectorAll('thead th, tr:first-child th')].map(text),
        rows: t.querySelectorAll('tbody tr').length,
        actions: [...new Set([...t.querySelectorAll('tbody tr:first-child a, tbody tr:first-child button')].map((b) => text(b) || b.title || b.className))],
      })),
      forms: [...document.querySelectorAll('form, .modal, .offcanvas')].map((f) => ({
        id: f.id || null, action: f.getAttribute('action'), method: f.getAttribute('method'), title: text(f.querySelector('.modal-title, h5, h4')),
        fields: [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].map((el) => ({
          label: labelFor(el), name: el.name || el.id || null, tag: el.tagName.toLowerCase(), type: el.type || null, required: el.required,
          options: el.tagName === 'SELECT' ? [...el.options].slice(0, 30).map((o) => text(o)) : undefined,
          optionCount: el.tagName === 'SELECT' ? el.options.length : undefined,
        })),
        buttons: [...f.querySelectorAll('button, input[type=submit], a.btn')].map((b) => text(b) || b.value || b.title).filter(Boolean),
      })).filter((f) => f.fields.length),
      scripts: [...document.querySelectorAll('script:not([src])')].flatMap((s) => [...s.textContent.matchAll(/url\s*:\s*["']([^"']+)["']/g)].map((m) => m[1])),
    }
  })
}

async function main() {
  if (!OUT) throw new Error('--out <klasör> zorunlu (repo dışında olmalı)')
  mkdirSync(join(OUT, 'pages'), { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined) })
  const statePath = join(OUT, 'session.json')
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: existsSync(statePath) ? statePath : undefined })
  const state = { loggingIn: false, blocked: [] }
  await guard(context, BASE, state)
  const page = await context.newPage()
  page.on('dialog', (d) => d.dismiss()) // onay kutularına her zaman "Hayır"

  // Oturum açık mı? Yönlendirme olmadan ana sayfa geldiyse evet (sayfanın kendi betikleri sonradan URL'yi değiştirebilir).
  const home = await page.goto(new URL('anasayfa.php', BASE).href, { waitUntil: 'commit' }).catch(() => null)
  if (!home?.ok() || !/anasayfa\.php/.test(home.url())) await login(page, state)
  await context.storageState({ path: statePath })

  const queue = [new URL('anasayfa.php', BASE).href]
  const seen = new Set(), perTemplate = new Map(), map = []
  while (queue.length && map.length < MAX) {
    const url = queue.shift()
    if (seen.has(url) || !isSafeUrl(url)) continue
    seen.add(url)
    const tpl = templateOf(url)
    if ((perTemplate.get(tpl) ?? 0) >= PER_TEMPLATE) continue
    perTemplate.set(tpl, (perTemplate.get(tpl) ?? 0) + 1)
    await sleep(1000)
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => ({ error: e.message }))
    if (/giris\.php|cikis\.php/.test(page.url())) { console.log('Oturum düştü, duruldu.'); break }
    const n = String(map.length + 1).padStart(4, '0')
    // Sayfanın kendi betiği engellenen bir gönderim başlattıysa goto "kesildi" der; sayfa yine de yerindedir.
    const here = new URL(page.url()).pathname === new URL(url).pathname
    const info = res?.error && !here ? { error: res.error } : await describe(page).catch((e) => ({ error: e.message }))
    writeFileSync(join(OUT, 'pages', `${n}.html`), await page.content().catch(() => ''))
    await page.screenshot({ path: join(OUT, 'pages', `${n}.png`), fullPage: true }).catch(() => undefined)
    map.push({ n, url, template: tpl, ...info })
    console.log(`${n} ${new URL(url).pathname}${new URL(url).search.slice(0, 60)}  tablolar:${info.tables?.length ?? 0} formlar:${info.forms?.length ?? 0}`)
    for (const l of info.links ?? []) {
      const clean = l.href.split('#')[0]
      if (clean && isSafeUrl(clean) && !seen.has(clean)) queue.push(clean)
    }
  }
  writeFileSync(join(OUT, 'site-map.json'), JSON.stringify({ base: BASE.href, crawledAt: new Date().toISOString(), pages: map, blocked: state.blocked }, null, 2))
  console.log(`Bitti: ${map.length} sayfa, ${state.blocked.length} istek engellendi. Çıktı: ${OUT}/site-map.json`)
  await browser.close()
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1) })
