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

// Girişli sahte panel: çerezsiz anasayfa girişe yönlenir; giris_yap.php POST'u çerez kurar.
// Sayfalarda tehlikeli linkler, form gönderimi, img ile silme ucu ve betik içi (güvenli/tehlikeli) okuma uçları var.
const pages = {
  'giris.php': `<input id="kullanici_adi"><input id="sifre" type="password">`,
  'anasayfa.php': `<h1>Ana Sayfa</h1>
    <a href="musteriler.php">Müşteriler</a> <a href="musteri_ekle.php">Yeni Müşteri</a> <a href="cikis.php">Çıkış</a>
    <img src="islemler/sayac_sil.php">
    <form id="f" method="post" action="islemler/kaydet.php"><input name="x" value="1"></form>
    <script>
      $.ajax({ url: 'islemler/liste.php?tur=musteri' });
      fetch('islemler/guncelle.php', { method: 'POST' });
    </script>`,
  'musteriler.php': `<table><thead><tr><th>Ünvan</th><th>Bakiye</th><th></th></tr></thead>
    <tbody><tr><td>ABC</td><td>100</td><td><a href="musteri_duzenle.php?id=1">Düzenle</a> <a href="musteri_sil.php?id=1">Sil</a>
      <a href="musteri_duzenle.php?id=1&durum=pasif">Pasif yap</a></td></tr></tbody></table>
    <a href="musteriler.php?sayfa=2">2</a>`,
  'musteri_ekle.php': `<form method="post"><label for="u">Ünvan</label><input id="u" name="unvan" required>
    <select name="il"><option>İstanbul</option><option>Ankara</option></select><button>Kaydet</button></form>`,
  'musteri_duzenle.php': '<form><input name="unvan" value="ABC"></form>',
  'islemler/liste.php': '[{"unvan":"ABC","bakiye":100}]',
}

function panelServer(hits) {
  return createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`)
    const path = req.url.split('?')[0].replace('/zz_revize/', '')
    const authed = (req.headers.cookie || '').includes('auth=1')
    if (path === 'islemler/giris_yap.php' && req.method === 'POST') {
      res.writeHead(200, { 'content-type': 'text/plain', 'set-cookie': 'auth=1; Path=/' }); return res.end('1')
    }
    if (path === 'anasayfa.php' && !authed) { res.writeHead(302, { location: 'giris.php' }); return res.end() }
    if (pages[path] != null) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(pages[path]) }
    res.writeHead(404); res.end('yok')
  })
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

test('e-posta/şifre ile giriş (SMS yok) ve tek yazma isteği giriştir; silme/kaydetme gönderilmez', async () => {
  const hits = []
  const server = panelServer(hits)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const out = mkdtempSync(join(tmpdir(), 'crawl-'))
  const base = `http://127.0.0.1:${server.address().port}/zz_revize/`
  try {
    await runCrawler(out, base, { PRATIK_USER: 'a@b.com', PRATIK_PASS: 'sifre' })
  } finally {
    server.close()
  }
  // Tek yazma isteği: giriş POST'u. Başka hiçbir yazma isteği yok.
  const writes = hits.filter((h) => !h.startsWith('GET '))
  assert.deepEqual(writes, ['POST /zz_revize/islemler/giris_yap.php'], `beklenmeyen yazma isteği: ${writes.join(', ')}`)
  // SMS ucu hiç çağrılmadı; hiçbir tehlikeli adres sunucuya ulaşmadı.
  assert.ok(!hits.some((h) => h.includes('tlfn_st.php')), 'SMS ucu çağrılmamalı')
  const bad = hits.filter((h) => /sil|iptal|kaydet|guncelle|cikis|durum=pasif/.test(h))
  assert.deepEqual(bad, [], `tehlikeli adres sunucuya ulaştı: ${bad.join(', ')}`)
  // Listeyi dolduran güvenli okuma ucu çekildi.
  assert.ok(hits.some((h) => h.startsWith('GET /zz_revize/islemler/liste.php')), 'liste okuma ucu çekilmeli')

  const map = JSON.parse(readFileSync(join(out, 'site-map.json'), 'utf8'))
  const visited = map.pages.map((p) => new URL(p.url).pathname)
  for (const p of ['anasayfa.php', 'musteriler.php', 'musteri_ekle.php', 'musteri_duzenle.php']) assert.ok(visited.includes(`/zz_revize/${p}`), p)
  const form = map.pages.find((p) => p.url.endsWith('musteri_ekle.php')).forms[0]
  assert.deepEqual(form.fields.map((f) => f.label), ['Ünvan', 'il'])
  assert.deepEqual(form.fields[1].options, ['İstanbul', 'Ankara'])
  const table = map.pages.find((p) => p.url.endsWith('musteriler.php')).tables[0]
  assert.deepEqual(table.headers, ['Ünvan', 'Bakiye', ''])
  // Ana sayfadan liste ucu çekilip dosyaya yazıldı; tehlikeli uç (guncelle) engellendi olarak kaydedildi.
  assert.ok(map.pages.find((p) => p.url.endsWith('anasayfa.php')).dataFiles.length >= 1, 'okuma ucu dosyası olmalı')
  assert.ok(map.blocked.some((b) => /guncelle/.test(b)), 'tehlikeli uç engellenmiş olarak kaydedilmeli')
})

test('--out repo içindeyse reddedilir', () => {
  const repo = resolve(new URL('../..', import.meta.url).pathname)
  assert.throws(() => assertOutsideRepo(repo), /repo dizininin içinde/)
  assert.throws(() => assertOutsideRepo(join(repo, 'crawl-output')), /repo dizininin içinde/)
  assert.throws(() => assertOutsideRepo('.'), /repo dizininin içinde/) // cwd repo kökü
  assert.doesNotThrow(() => assertOutsideRepo(join(tmpdir(), 'pratik')))
})
