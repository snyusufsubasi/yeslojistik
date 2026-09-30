// Eski panelin kendi "Excel'e aktar" dosyalarını SALT OKUMA ile indirir.
//
// Kullanım: node tools/legacy/extract.mjs --out <repo dışı klasör> [--from 2010-01-01] [--to 2026-09-30]
// Giriş crawl.mjs ile aynı (PRATIK_USER / PRATIK_PASS, e-posta + şifre). Her adres isSafeUrl'den geçer; yalnız GET yapılır.
// Dosyalar <out>/exports altına yazılır; repoya girmez.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BASE, Jar, req, loginFetch, isSafeUrl, assertOutsideRepo } from './crawl.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []))
const OUT = args.out
const FROM = args.from ?? '2010-01-01'
const TO = args.to ?? new Date().toISOString().slice(0, 10)

/** İndirilecek dışa aktarımlar: ad → eski paneldeki göreli adres. */
export const SOURCES = {
  'firmalar': 'firma_liste.php?q=&page=1&d=&y=&msg=&arsiv=0&export=excel',
  'firmalar-arsiv': 'firma_liste.php?q=&page=1&d=&y=&msg=&arsiv=1&export=excel',
  'tedarikciler': 'tedarikci_liste.php?page=1&q=&ar=0&y=&msg=&export=excel',
  'tedarikciler-arsiv': 'tedarikci_liste.php?page=1&q=&ar=1&y=&msg=&export=excel',
  'soforler': 'sofor_liste.php?page=1&q=&durum=&y=&msg=&export=excel',
  'musteri-cari': 'alck_mstr.php?export=excel&page=1',
  'sevkiyatlar': `excel/g_ex.php?b_t=${FROM}&s_t=${TO}`,
  'sevkiyat-ozet': `excel/sevkiyat_ozet_ex.php?b_t=${FROM}&s_t=${TO}`,
  'tedarikci-cari': 'alck_tdrkc.php',
  'araclar': 'oz_arac/araclar.php?page=1&y=&msg=&export=excel',
  'giderler': 'oz_arac/gdr.php?export=excel&ktgr=&b_t=&s_t=',
  'mazotlar': `excel/genel_ex.php?mazot=1&p=0&bt=${FROM}&st=${TO}`,
  'bankalar': 'bankalar.php',
  'personeller': 'oz_arac/prsnl.php',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function extFor(type, bytes) {
  const head = Buffer.from(bytes.slice(0, 4)).toString('latin1')
  if (head.startsWith('PK')) return 'xlsx' // zip → xlsx
  if (head.startsWith('\xD0\xCF')) return 'xls' // eski ikili Excel
  if (/csv/i.test(type)) return 'csv'
  return 'html' // PHP'lerin çoğu "xls" diye HTML tablo döndürür
}

async function main() {
  if (!OUT) throw new Error('--out <klasör> zorunlu (repo dışında olmalı)')
  assertOutsideRepo(OUT)
  const dir = join(OUT, 'exports')
  mkdirSync(dir, { recursive: true })
  const jar = new Jar()
  await loginFetch(jar)
  const summary = []
  for (const [name, rel] of Object.entries(SOURCES)) {
    const url = new URL(rel, BASE).href
    if (!isSafeUrl(url)) { summary.push({ name, skipped: 'güvenli değil' }); console.log(`ATLANDI ${name}`); continue }
    await sleep(1000)
    const res = await req(url, { jar }).catch((e) => ({ error: e.message }))
    if (res.error || !res.ok) { summary.push({ name, error: res.error ?? `HTTP ${res.status}` }); console.log(`HATA ${name}: ${res.error ?? res.status}`); continue }
    const bytes = new Uint8Array(await res.arrayBuffer())
    const ext = extFor(res.headers.get('content-type') ?? '', bytes)
    const file = `${name}.${ext}`
    writeFileSync(join(dir, file), bytes)
    summary.push({ name, file, bytes: bytes.length, type: res.headers.get('content-type') })
    console.log(`${name}: ${file} (${bytes.length} bayt, ${res.headers.get('content-type')})`)
  }
  writeFileSync(join(dir, 'summary.json'), JSON.stringify({ at: new Date().toISOString(), from: FROM, to: TO, summary }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1) })
