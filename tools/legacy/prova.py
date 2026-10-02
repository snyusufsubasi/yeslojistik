#!/usr/bin/env python3
"""transform.py çıktısını bir panel API'sine (yerel prova ya da canlı) aktarır ve borç/alacak oluşmadığını kontrol eder.

Kullanım:
  python3 tools/legacy/prova.py <extract klasörü> --api http://localhost:5090 [--apply]

--apply yoksa yalnız deneme (dryRun) yapılır, hiçbir şey yazılmaz.
Her dosya önce dryRun ile denenir. Panelin reddettiği alan (geçersiz VKN, telefon, e-posta, IBAN, il, TC) boşaltılır,
rapora yazılır ve tekrar denenir. Böylece doğrulama kuralları birebir panelinkiyle aynı kalır. Kalıcı hata varsa durulur.
Giriş bilgisi: PANEL_EMAIL / PANEL_PASSWORD ortam değişkenleri (varsayılan: yerel prova admin'i).
"""
import io, json, os, sys, urllib.request, uuid
from pathlib import Path
import openpyxl

args = sys.argv[1:]
SRC = Path(args[0]); API = args[args.index('--api') + 1].rstrip('/') if '--api' in args else 'http://localhost:5090'
APPLY = '--apply' in args
AKTAR = SRC / 'aktar'
EMAIL = os.environ.get('PANEL_EMAIL', 'admin@yeslojistik.com'); PASSWORD = os.environ.get('PANEL_PASSWORD', 'Admin123!')
log = []
def say(s): print(s); log.append(s)

ORDER = [('1-tedarikciler.xlsx', 'suppliers'), ('2-musteriler.xlsx', 'customers'), ('3-soforler.xlsx', 'drivers'),
         ('4-araclar.xlsx', 'vehicles'), ('5-seferler.xlsx', 'trips'), ('8-giderler.xlsx', 'expenses'), ('9-banka-hesaplari.xlsx', 'cash-accounts'),
         ('10-personeller.xlsx', 'staff')]
# Panel hata mesajındaki ipucu → boşaltılacak sütun
DROPPABLE = [('VKN', 'VKN/TCKN'), ('telefon', 'Telefon'), ('e-posta', 'E-posta'), ('IBAN', 'IBAN'), ('il seçin', 'İl'), ('TC kimlik', 'TC Kimlik No')]


def request(method, path, body=None, headers=None):
    req = urllib.request.Request(API + path, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=120) as r: return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'null')


def token():
    st, res = request('POST', '/api/auth/token', json.dumps({'email': EMAIL, 'password': PASSWORD}).encode(), {'Content-Type': 'application/json'})
    if st != 200: sys.exit(f'Giriş başarısız ({st}): {res}')
    return res['accessToken']


AUTH = {'Authorization': f'Bearer {token()}'}


def upload(entity, wb, dry):
    buf = io.BytesIO(); wb.save(buf); boundary = uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="veri.xlsx"\r\n'
            'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n').encode() + buf.getvalue() + f'\r\n--{boundary}--\r\n'.encode()
    st, res = request('POST', f'/api/import/{entity}?dryRun={"true" if dry else "false"}', body, {**AUTH, 'Content-Type': f'multipart/form-data; boundary={boundary}'})
    if st != 200: sys.exit(f'{entity}: API {st} {res}')
    return res


for name, entity in ORDER:
    path = AKTAR / name
    if not path.exists(): continue
    wb = openpyxl.load_workbook(path); ws = wb.active
    head = [c.value for c in ws[1]]
    for attempt in range(6):
        res = upload(entity, wb, dry=True)
        if not res['errors']: break
        fixed = False
        for e in res['errors']:
            col = next((c for hint, c in DROPPABLE if hint.lower() in e['message'].lower() and c in head), None)
            if col:
                cell = ws.cell(row=e['row'], column=head.index(col) + 1)
                say(f"  {name} satır {e['row']}: “{col}” boşaltıldı ({e['message']})"); cell.value = None; fixed = True
        if not fixed: break
    if res['errors']:
        for e in res['errors'][:20]: say(f"  HATA {name} satır {e['row']}: {e['message']}")
        sys.exit(f'{name}: {len(res["errors"])} hata kaldı, aktarım durdu.')
    wb.save(path)  # boşaltılan alanlarla güncel dosya (canlıya bu yüklenir)
    if APPLY:
        res = upload(entity, wb, dry=False)
        say(f"{name}: {res['created']} kayıt yazıldı, {res['skipped']} atlandı")
    else:
        say(f"{name}: deneme temiz ({res['created']} yeni, {res['skipped']} atlanacak)")

if APPLY:
    # Kontrol: eski veriden borç/alacak çıkmamalı. Her müşteri ve tedarikçi bakiyesi 0, faturası kesilecek sefer yok.
    def listing(path):
        items, page = [], 1
        while True:
            st, res = request('GET', f'{path}?page={page}&pageSize=100', headers=AUTH); items += res['items']
            if page * 100 >= res['total']: return items
            page += 1
    say('')
    nonzero = [(w, x['title'], x['balance']) for w, path in (('müşteri', '/api/customers'), ('tedarikçi', '/api/suppliers'))
               for x in listing(path) if abs(x['balance']) > 0.005]
    for w, title, bal in nonzero: say(f'  BAKİYE {w} {title}: {bal:,.2f} TL')
    st, trips = request('GET', '/api/trips?page=1&pageSize=1', headers=AUTH)
    st, un = request('GET', '/api/trips?page=1&pageSize=1&invoiced=false', headers=AUTH)
    say(f'PANELDE: {trips["total"]} sefer, faturası kesilecek {un["total"]} sefer')
    say(f'BORÇ/ALACAK KONTROLÜ: {"temiz, hepsi 0" if not nonzero else f"{len(nonzero)} carinin bakiyesi 0 değil (panelde önceden kayıt olabilir)"}')

(AKTAR / ('prova-rapor.txt' if APPLY else 'deneme-rapor.txt')).write_text('\n'.join(log) + '\n', encoding='utf-8')
