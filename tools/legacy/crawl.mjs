// Eski panelin (pratikortam.com) haritasını çıkaran SALT OKUMA robotu.
//
// Kullanım (bulut oturumunda, PRATIK_USER / PRATIK_PASS ortam değişkenleriyle):
//   node tools/legacy/crawl.mjs --out <repo dışı klasör> [--max 400] [--base https://pratikortam.com/zz_revize/]
// Giriş yalnızca e-posta ve şifreyle yapılır (SMS adımı atlanır). Hesap SMS'i zorunlu tutuyorsa robot açık bir hata verir.
//
// Ağ ve ayrıştırma ayrımı:
//  - Bütün ağ istekleri Node ile yapılır (ortamın egress proxy'sine ait CA'ya Node zaten güvenir).
//  - HTML, tarayıcıya AĞSIZ yüklenir (setContent + route abort); tarayıcı hiçbir isteği kendi başına gönderemez.
//
// Güvenlik kuralları (kodda zorunlu):
//  - Tek yazma isteği giriştir (islemler/giris_yap.php POST). Başka hiçbir POST/PUT/PATCH/DELETE gönderilmez.
//  - Adresinde sil/kaldır/iptal/güncelle/kaydet/ekle/onay/çıkış geçen linklere GET bile yapılmaz.
//  - Yalnız linkler ve listeleri dolduran okuma uçları izlenir; saniyede en fazla 1 sayfa.
//  - Şifre hiçbir yere yazılmaz; çıktılar repo dışındaki --out klasörüne gider (repo içi yol reddedilir).
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, relative, isAbsolute } from 'node:path'

const require = createRequire(new URL('../../client/package.json', import.meta.url))
const { chromium } = require('@playwright/test')

/** Repo kökü (tools/legacy/../..): çıktı klasörü buranın içinde olamaz. */
const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname)

/** Çıktı yolu repo dizininin içindeyse (ya da repo kökünün kendisiyse) hata fırlatır: oturum durumu ve kişisel veri repoya sızmasın. */
export function assertOutsideRepo(out, repoRoot = REPO_ROOT) {
  const abs = resolve(out)
  const rel = relative(repoRoot, abs)
  const inside = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
  if (inside) throw new Error(`--out repo dizininin içinde olamaz: ${abs}. Oturum ve kişisel veri repoya karışmasın diye repo dışında bir yol verin.`)
}

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []))
const BASE = new URL(args.base ?? 'https://pratikortam.com/zz_revize/')
const OUT = args.out
const MAX = Number(args.max ?? 400)
const PER_TEMPLATE = Number(args.samples ?? 3)
const LOGIN_PATHS = ['giris.php', 'cikis.php', 'islemler/tlfn_st.php', 'islemler/giris_yap.php']
/** Tek yazma ucu: asıl kimlik doğrulama. SMS ucu (tlfn_st.php) kullanılmaz. */
const LOGIN_POST = 'islemler/giris_yap.php'

/** Kesinlikle değiştiren işlemler (GET ile bile çağrılmaz): silme, iptal, çıkış ve yazma/kaydetme uçları. */
export const DANGEROUS = /(sil|delete|remove|kaldir|kaldır|iptal|cancel|onay|approve|cikis|çıkış|logout|reset|temizle|gonder|gönder|send|mail|sms|odendi|ödendi|aktar|kapat|guncelle|güncelle|update|kaydet|save|insert)/i
/** Yalnız form GÖSTEREN sayfalar (ekle/düzenle ekranı): parametresiz ya da tek kimlik parametresiyle açılır; asıl kaydetme ucu DANGEROUS'ta. */
const FORM_PAGE = /(ekle|add|duzenle|düzenle|edit)/i
const ID_KEYS = /^(id|no|kod|[a-z_]*_?id)$/i

/**
 * Robotun okuyabileceği adres mi? `background` true ise sayfanın listelerini dolduran okuma uçları (islemler/*.php)
 * için bakılır; yasaklı kelimeler orada da geçerlidir.
 */
export function isSafeUrl(url, base = BASE, background = false) {
  let u
  try { u = new URL(url, base) } catch { return false }
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

/** Basit çerez kavanozu: Set-Cookie'leri toplar, Cookie başlığı üretir. */
class Jar {
  constructor() { this.c = new Map() }
  update(headers) {
    for (const sc of headers.getSetCookie?.() ?? []) {
      const pair = sc.split(';')[0]; const i = pair.indexOf('=')
      if (i > 0) this.c.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
    }
  }
  header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join('; ') }
}

/**
 * Tek ağ noktası. GET'ler yönlendirmeyi kendimiz izleriz; giriş dışında hiçbir yazma isteğine izin verilmez.
 * `login` yalnız giriş akışında true olur (giris.php GET'i ve giris_yap.php POST'u için).
 */
async function req(url, { method = 'GET', body, jar, login = false } = {}) {
  const u = new URL(url, BASE)
  const rel = u.pathname.slice(BASE.pathname.length)
  if (method !== 'GET' && !(login && u.origin === BASE.origin && rel === LOGIN_POST)) {
    throw new Error(`Yasak istek engellendi: ${method} ${u.pathname}`)
  }
  const headers = { Cookie: jar.header(), 'User-Agent': 'Mozilla/5.0 (compatible; yes-migration-readonly)' }
  if (body) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; headers['X-Requested-With'] = 'XMLHttpRequest' }
  const res = await fetch(u.href, { method, headers, body, redirect: 'manual' })
  jar.update(res.headers)
  return res
}

async function loginFetch(jar) {
  const user = process.env.PRATIK_USER, pass = process.env.PRATIK_PASS
  if (!user || !pass) throw new Error('PRATIK_USER ve PRATIK_PASS ortam değişkenleri yok. Ortam ayarlarına ekleyip yeni oturum açın.')
  await req(new URL('giris.php', BASE).href, { jar, login: true }) // PHPSESSID çerezini al
  const body = new URLSearchParams({ kullanici_adi: user, sifre: pass }).toString()
  const res = await req(new URL('islemler/giris_yap.php', BASE).href, { method: 'POST', body, jar, login: true })
  const txt = (await res.text()).trim()
  if (txt === '-1') throw new Error('E-posta veya şifre hatalı.')
  // Doğrula: anasayfa giriş sayfasına yönlendiriyorsa oturum açılmamıştır (ör. SMS zorunlu).
  const home = await req(new URL('anasayfa.php', BASE).href, { jar, login: true })
  const loc = home.headers.get('location') ?? ''
  if (home.status >= 300 && home.status < 400 && /giris|cikis/.test(loc)) {
    throw new Error('Giriş doğrulanamadı. Bilgiler hatalı olabilir ya da hesap SMS doğrulamasını zorunlu tutuyor olabilir.')
  }
  console.log('Giriş yapıldı (e-posta ve şifre).')
}

/** HTML'i tarayıcıya ağsız yükler: göreli linkler gerçek adrese çözülsün diye <base> eklenir. */
async function parse(page, url, html) {
  const doc = /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${url}">`)
    : `<!doctype html><html><head><base href="${url}"></head><body>${html}</body></html>`
  await page.setContent(doc, { waitUntil: 'domcontentloaded' })
  return describe(page)
}

/** Sayfanın yapısını çıkarır: menü linkleri, tablolar (başlık + satır sayısı), formlar (alanlar, seçenekler), okuma uçları. */
async function describe(page) {
  return page.evaluate(() => {
    const text = (el) => (el?.innerText ?? el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const labelFor = (el) => {
      if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return text(l) }
      const wrap = el.closest('label'); if (wrap) return text(wrap)
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
      // Listeleri dolduran okuma uçları: satır içi betiklerdeki .php string sabitleri (jQuery ajax, fetch, load…).
      endpoints: [...new Set([...document.querySelectorAll('script:not([src])')]
        .flatMap((s) => [...s.textContent.matchAll(/["']([^"']*\.php(?:\?[^"']*)?)["']/g)].map((m) => m[1])))].slice(0, 40),
    }
  })
}

async function main() {
  if (!OUT) throw new Error('--out <klasör> zorunlu (repo dışında olmalı)')
  assertOutsideRepo(OUT)
  mkdirSync(join(OUT, 'pages'), { recursive: true })

  const jar = new Jar()
  await loginFetch(jar)

  // Tarayıcı yalnız ayrıştırma için; hiçbir ağ isteği yapamaz.
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined) })
  const context = await browser.newContext()
  await context.route('**/*', (route) => route.abort())
  const page = await context.newPage()

  const queue = [new URL('anasayfa.php', BASE).href]
  const seen = new Set(), perTemplate = new Map(), map = [], blocked = [], fetchedEndpoints = new Set()
  while (queue.length && map.length < MAX) {
    const url = queue.shift()
    if (seen.has(url) || !isSafeUrl(url)) continue
    seen.add(url)
    const tpl = templateOf(url)
    if ((perTemplate.get(tpl) ?? 0) >= PER_TEMPLATE) continue
    perTemplate.set(tpl, (perTemplate.get(tpl) ?? 0) + 1)
    await sleep(1000)

    const res = await req(url, { jar }).catch((e) => ({ error: e.message }))
    if (res.error) { blocked.push(`GET ${url} (${res.error})`); continue }
    if (res.status >= 300 && res.status < 400 && /giris|cikis/.test(res.headers.get('location') ?? '')) {
      console.log('Oturum düştü, duruldu.'); break
    }
    const html = await res.text()
    const n = String(map.length + 1).padStart(4, '0')
    const info = await parse(page, url, html).catch((e) => ({ error: e.message }))
    writeFileSync(join(OUT, 'pages', `${n}.html`), html)

    // Listeleri dolduran okuma uçlarından güvenli olanları da bir kez çek (satır verisi orada).
    const dataFiles = []
    for (const ep of info.endpoints ?? []) {
      let epUrl
      try { epUrl = new URL(ep, url).href } catch { continue }
      if (!isSafeUrl(epUrl, BASE, true)) { if (new URL(epUrl).origin === BASE.origin) blocked.push(`ENDPOINT ${epUrl}`); continue }
      if (fetchedEndpoints.has(epUrl)) continue
      fetchedEndpoints.add(epUrl)
      await sleep(300)
      const epRes = await req(epUrl, { jar }).catch(() => null)
      if (epRes && epRes.ok) {
        const name = `${n}-veri-${dataFiles.length + 1}.txt`
        writeFileSync(join(OUT, 'pages', name), `# ${epUrl}\n\n` + (await epRes.text()))
        dataFiles.push({ url: epUrl, file: name })
      }
    }

    map.push({ n, url, template: tpl, dataFiles, ...info })
    console.log(`${n} ${new URL(url).pathname}${new URL(url).search.slice(0, 60)}  tablo:${info.tables?.length ?? 0} form:${info.forms?.length ?? 0} uç:${dataFiles.length}`)
    for (const l of info.links ?? []) {
      const clean = (l.href || '').split('#')[0]
      if (!clean) continue
      if (isSafeUrl(clean)) { if (!seen.has(clean)) queue.push(clean) }
      else if (new URL(clean, url).origin === BASE.origin) blocked.push(`LINK ${clean}`)
    }
  }
  writeFileSync(join(OUT, 'site-map.json'), JSON.stringify({ base: BASE.href, crawledAt: new Date().toISOString(), pages: map, blocked }, null, 2))
  console.log(`Bitti: ${map.length} sayfa, ${blocked.length} güvenli olmayan adres atlandı. Çıktı: ${OUT}/site-map.json`)
  await browser.close()
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1) })
