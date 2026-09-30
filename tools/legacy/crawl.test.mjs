// Robotun güvenlik kurallarını sahte bir "eski panel" üzerinde dener: node --test tools/legacy/crawl.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isSafeUrl } from './crawl.mjs'

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
    await new Promise((resolve, reject) => execFile('node', [new URL('./crawl.mjs', import.meta.url).pathname, '--out', out, '--base', base, '--max', '20'],
      { timeout: 120000 }, (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout))))
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
