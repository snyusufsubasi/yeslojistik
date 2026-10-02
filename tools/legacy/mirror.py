#!/usr/bin/env python3
"""Pratikortam aynası: extract.mjs çıktısını dönüştürüp panele uygular (zamanlanmış senkron .github/workflows/mirror.yml çalıştırır).

Kullanım:
  PANEL_EMAIL=… PANEL_PASSWORD=… python3 tools/legacy/mirror.py <extract klasörü> --api https://yeslojistik.onrender.com [--apply] [--allow-large-removal]

--apply yoksa yalnız deneme (dryRun): ne ekleneceği/güncelleneceği/silineceği sayılır, hiçbir şey yazılmaz.
Paneldeki "Yazım istisnaları" önce okunur ve harf düzeninde kullanılır. Loga yalnız sayılar yazılır (müşteri adı, tutar yok).
--allow-large-removal: bir türün yarısından fazlası silinecekse bile uygula (yalnız ilk dolumda, bilerek).
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from pathlib import Path

args = sys.argv[1:]
if not args or args[0].startswith('--'): sys.exit(__doc__)
SRC = Path(args[0])
API = args[args.index('--api') + 1].rstrip('/') if '--api' in args else sys.exit('--api zorunlu')
APPLY, LARGE = '--apply' in args, '--allow-large-removal' in args
EMAIL, PASSWORD = os.environ.get('PANEL_EMAIL'), os.environ.get('PANEL_PASSWORD')
if not EMAIL or not PASSWORD: sys.exit('PANEL_EMAIL ve PANEL_PASSWORD ortam değişkenleri gerekli.')


def request(method, path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        raw = e.read()
        try: return e.code, json.loads(raw or b'null')
        except ValueError: return e.code, raw.decode(errors='replace')[:300]


# Ücretsiz sunucu uykudaysa uyandır (en çok ~3 dakika).
for _ in range(18):
    try:
        if request('GET', '/api/health')[0] == 200: break
    except OSError: pass
    time.sleep(10)
else: sys.exit('Panel sunucusu açılmadı.')

st, res = request('POST', '/api/auth/token', {'email': EMAIL, 'password': PASSWORD})
if st != 200: sys.exit(f'Panele giriş başarısız ({st}).')
TOKEN = res['accessToken']

st, status = request('GET', '/api/legacy/status', token=TOKEN)
if st != 200: sys.exit(f'Ayna durumu okunamadı ({st}).')
if APPLY and not status['mirrorMode']:
    print('Panelde pratikortam aynası kapalı (Ayarlar): yalnız deneme yapılıyor, hiçbir şey yazılmayacak.')
    APPLY = False
exceptions = SRC / 'yazim-istisnalari.json'
exceptions.write_text(json.dumps(status.get('spellingExceptions') or {}, ensure_ascii=False), encoding='utf-8')

# Dönüştürme: çıktısı ad ve adres içerebilir, loga yazılmaz; yalnız özet satırı gösterilir.
run = subprocess.run([sys.executable, str(Path(__file__).with_name('transform.py')), str(SRC), '--json', '--exceptions', str(exceptions)],
                     capture_output=True, text=True)
if run.returncode != 0: sys.exit('Dönüştürme başarısız: ' + (run.stderr.strip().splitlines() or ['?'])[-1][:200])
print(next((line for line in run.stdout.splitlines() if line.startswith('Ayna:')), 'Ayna: ?'))
snapshot = json.loads((SRC / 'aktar' / 'ayna.json').read_text(encoding='utf-8'))


def show(result):
    for c in result['counts']:
        print(f"  {c['entity']}: {c['created']} yeni, {c['updated']} güncellendi, {c['removed']} silindi, {c['unchanged']} aynı")


st, res = request('POST', f"/api/legacy/mirror?dryRun=true&allowLargeRemoval={'true' if LARGE else 'false'}", snapshot, TOKEN)
if st != 200: sys.exit(f"Deneme reddedildi ({st}): {res.get('detail') or res.get('title') if isinstance(res, dict) else res}")
print('DENEME:'); show(res)
if not APPLY: sys.exit(0)

st, res = request('POST', f"/api/legacy/mirror?allowLargeRemoval={'true' if LARGE else 'false'}", snapshot, TOKEN)
if st != 200: sys.exit(f"Senkron reddedildi ({st}): {res.get('detail') or res.get('title') if isinstance(res, dict) else res}")
print('UYGULANDI:'); show(res)
print('Özet:', res['summary'] if len(res['summary']) < 300 else res['summary'][:300] + '…')
