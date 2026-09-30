// Robotun güvenlik kurallarını sahte bir "eski panel" üzerinde dener: node --test tools/legacy/crawl.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { isSafeUrl, assertOutsideRepo } from './crawl.mjs'

const CRAWLER = new URL('./crawl.mjs', import.meta.url).pathname
function runCrawler(out, base, env = {}) {
  return new Promise((res, rej) => execFile('node', [CRAWLER, '--out', out, '--base', base, '--max', '20'],
    { timeout: 120000, env: { ...process.env, ...env } }, (err, stdout, stderr) => (err ? rej(new Error(stderr || err.message)) : res(stdout))))
}

const pages = {
  '/zz_revize/anasayfa.php': `<h1>Ana Sayfa</h1>
    <a href="musteriler.php">Müşteriler</a> <a href="musteri_ekle.php">Yeni Müşteri</a> <a href="cikis.php">Çıkış</a>
    <img src="islemler/sayac_sil.php">
    <form id="f" method="post" action="islemler/kaydet.php"><input name="x" value="1"></form>
    <script>document.getElementById('f').submit(); fetch('islemler/liste.php?tur=musteri'); fetch('islemler/guncelle.php', { method: 'POST' })</script>`,
  '/zz_revize/musteriler.php': `<table><thead><tr><th>Ünvan</th><th>Bakiye</th><th></th></tr></thead>
    <tbody><tr><td>ABC</td><td>100</td><td><a href="musteri_duzenle.php?id=1">Düzenle</a> <a href="musteri_sil.php?id=1">Sil</a>
      <a href="musteri_duzenle.php?id=1&durum=pasif">Pasif yap</a></td></tr></tbody></table>
    <a href="musteriler.php?sayfa=2">2</a>`,
  '/zz_revize/musteri_ekle.php': `<form method="post"><label for="u">Ünvan</label><input id="u" name="unvan" required>
    <select name="il"><option>İstanbul</option><option>Ankara</option></select><button>Kaydet</button></form>`,
  '/zz_revize/musteri_duzenle.php': '<form><input name="unvan" value="ABC"></form>',
}

test('URL kuralları: silme, iptal, çıkış ve değer taşıyan güncelleme yasak', () => {
  const b = new URL('https://pratikortam.com/zz_revize/')
  const ok = ['anasayfa.php?bt=2026-09-30&st=2026-09-30', 'musteri_ekle.php', 'musteri_duzenle.php?id=4', 'seferler.php?sayfa=2', 'cari_detay.php?cari_id=5']
  const no = ['musteri_sil.php?id=3', 'guncelle.php?id=1&durum=2', 'islemler/liste.php', 'https://evil.com/a.php', 'cikis.php', 'fatura_iptal.php?id=2',
    'x.php?islem=sil&id=1', 'giris.php', 'sefer_onay.php?id=1', 'mail_gonder.php?id=1']
  for (const u of ok) assert.ok(isSafeUrl(u, b), u)
  for (const u of no) assert.ok(!isSafeUrl(u, b), u)
  assert.ok(isSafeUrl('islemler/liste.php?tur=musteri', b, true), 'arka plan okuma serbest')
  assert.ok(!isSafeUrl('islemler/sayac_sil.php', b, true), 'arka plan silme yasak')
})

test('robot sahte panelde hiçbir silme/kaydetme isteği göndermez', async () => {
  const hits = []
  const server = createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`)
    const path = req.url.split('?')[0]
    res.writeHead(pages[path] ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(pages[path] ?? 'yok')
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const out = mkdtempSync(join(tmpdir(), 'crawl-'))
  const base = `http://127.0.0.1:${server.address().port}/zz_revize/`
  try {
    await runCrawler(out, base)
  } finally {
    server.close()
  }
  const bad = hits.filter((h) => !h.startsWith('GET ') || /sil|kaydet|guncelle|cikis|durum=pasif/.test(h))
  assert.deepEqual(bad, [], `yasak istekler sunucuya ulaştı: ${bad.join(', ')}`)
  assert.ok(hits.includes('GET /zz_revize/islemler/liste.php?tur=musteri'), 'liste okuması yapılmalı')
  const map = JSON.parse(readFileSync(join(out, 'site-map.json'), 'utf8'))
  const visited = map.pages.map((p) => new URL(p.url).pathname)
  for (const p of ['anasayfa.php', 'musteriler.php', 'musteri_ekle.php', 'musteri_duzenle.php']) assert.ok(visited.includes(`/zz_revize/${p}`), p)
  const form = map.pages.find((p) => p.url.endsWith('musteri_ekle.php')).forms[0]
  assert.deepEqual(form.fields.map((f) => f.label), ['Ünvan', 'il'])
  assert.deepEqual(form.fields[1].options, ['İstanbul', 'Ankara'])
  const table = map.pages.find((p) => p.url.endsWith('musteriler.php')).tables[0]
  assert.deepEqual(table.headers, ['Ünvan', 'Bakiye', ''])
  assert.ok(map.blocked.length >= 2, 'engellenen istekler kaydedilmeli')
})

test('e-posta/şifre ile giriş (SMS yok) ve giriş sayfası betiği tehlikeli GET gönderemez', async () => {
  const hits = []
  const authed = (req) => (req.headers.cookie || '').includes('auth=1')
  const server = createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`)
    const path = req.url.split('?')[0]
    if (path === '/zz_revize/anasayfa.php' && !authed(req)) { res.writeHead(302, { location: 'giris.php' }); return res.end() }
    if (path === '/zz_revize/anasayfa.php') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end('<h1>Ana Sayfa</h1><a href="musteriler.php">Müşteriler</a>') }
    if (path === '/zz_revize/musteriler.php') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end('<table><thead><tr><th>Ünvan</th></tr></thead><tbody><tr><td>ABC</td></tr></tbody></table>') }
    if (path === '/zz_revize/islemler/giris_yap.php') { res.writeHead(200, { 'content-type': 'text/plain', 'set-cookie': 'auth=1; Path=/' }); return res.end('1') }
    if (path === '/zz_revize/giris.php') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      // Giriş sayfasının kendi betiği kimlik doğrulamadan ÖNCE tehlikeli GET denemeleri yapar; hiçbiri sunucuya ulaşmamalı.
      return res.end(`<input id="kullanici_adi"><input id="sifre" type="password">
        <script>
          fetch('musteri_sil.php?id=1'); new Image().src = 'islemler/kayit_sil.php'; fetch('iptal.php?id=2');
          window.giris = function () { fetch('islemler/giris_yap.php', { method: 'POST' }).then(function () { location.href = 'anasayfa.php' }) }
        </script>`)
    }
    res.writeHead(404); res.end('yok')
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const out = mkdtempSync(join(tmpdir(), 'crawl-login-'))
  const base = `http://127.0.0.1:${server.address().port}/zz_revize/`
  try {
    await runCrawler(out, base, { PRATIK_USER: 'a@b.com', PRATIK_PASS: 'sifre' })
  } finally {
    server.close()
  }
  // Giriş yapıldı: korumalı sayfa gezildi.
  const map = JSON.parse(readFileSync(join(out, 'site-map.json'), 'utf8'))
  assert.ok(map.pages.some((p) => p.url.endsWith('musteriler.php')), 'giriş sonrası müşteriler sayfası gezilmeli')
  // SMS ucu hiç çağrılmadı; tehlikeli GET'lerin hiçbiri (giriş sırasında bile) sunucuya ulaşmadı.
  assert.ok(!hits.some((h) => h.includes('tlfn_st.php')), 'SMS ucu çağrılmamalı')
  const bad = hits.filter((h) => /sil|iptal/.test(h))
  assert.deepEqual(bad, [], `giriş sayfası betiğinin tehlikeli GET'i sunucuya ulaştı: ${bad.join(', ')}`)
  assert.ok(hits.includes('POST /zz_revize/islemler/giris_yap.php'), 'asıl giriş POST edilmeli')
})

test('--out repo içindeyse reddedilir', () => {
  const repo = resolve(new URL('../..', import.meta.url).pathname)
  assert.throws(() => assertOutsideRepo(repo), /repo dizininin içinde/)
  assert.throws(() => assertOutsideRepo(join(repo, 'crawl-output')), /repo dizininin içinde/)
  assert.throws(() => assertOutsideRepo('.'), /repo dizininin içinde/) // cwd repo kökü
  assert.doesNotThrow(() => assertOutsideRepo(join(tmpdir(), 'pratik')))
})
