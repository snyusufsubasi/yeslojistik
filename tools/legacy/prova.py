#!/usr/bin/env python3
"""transform.py çıktısını bir panel API'sine (yerel prova ya da canlı) aktarır ve bakiyeleri eski panelle karşılaştırır.

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
         ('4-araclar.xlsx', 'vehicles'), ('5-seferler.xlsx', 'trips'), ('6-devir-tahsilatlari.xlsx', 'payments'),
         ('7-devir-odemeleri.xlsx', 'supplier-payments'), ('8-giderler.xlsx', 'expenses'), ('9-banka-hesaplari.xlsx', 'cash-accounts')]
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
    # Mutabakat: API'den bakiyeler
    def total(path, field):
        page, s = 1, 0
        while True:
            st, res = request('GET', f'{path}?page={page}&pageSize=100', headers=AUTH)
            s += sum(i[field] for i in res['items'])
            if page * 100 >= res['total']: return s, res['total']
            page += 1
    cb, cn = total('/api/customers', 'balance'); sb, sn = total('/api/suppliers', 'balance')
    st, trips = request('GET', '/api/trips?page=1&pageSize=1', headers=AUTH)
    st, un = request('GET', '/api/trips?page=1&pageSize=1&invoiced=false', headers=AUTH)
    say('')
    say(f'PANELDE: {cn} müşteri, bakiye toplamı {cb:,.2f} TL · {sn} tedarikçi, borç toplamı {sb:,.2f} TL')
    # Kişi kişi mutabakat: panel bakiyesi ↔ eski panel carisi (müşteride faturası bekleyen seferler düşülür).
    def listing(path):
        items, page = [], 1
        while True:
            st, res = request('GET', f'{path}?page={page}&pageSize=100', headers=AUTH); items += res['items']
            if page * 100 >= res['total']: return items
            page += 1
    from decimal import Decimal as Dm
    exec_ns = {}
    code = (Path(__file__).parent / 'transform.py').read_text(encoding='utf-8').split('# ---------- girdiler ----------')[0]
    exec(compile(code, 'transform-helpers', 'exec'), exec_ns)  # yalnız yardımcılar (html_table, money, key, clean)
    ht, money, key, clean = exec_ns['html_table'], exec_ns['money'], exec_ns['key'], exec_ns['clean']
    ws = openpyxl.load_workbook(SRC / 'exports' / 'sevkiyatlar.xlsx', read_only=True).worksheets[0]
    raw = list(ws.iter_rows(values_only=True)); ix = {h: i for i, h in enumerate(raw[0])}
    import re, collections
    waiting = collections.defaultdict(Dm)
    for r in raw[1:]:
        if r and isinstance(r[0], str) and re.match(r'\d{4}-\d\d-\d\d$', r[0]) and str(r[ix['Kesilen Fatura']]).strip() == 'Bekleniyor':
            waiting[key(r[ix['Firma Ünvanı']])] += money(r[ix['Müşteri Meblağ']])
    firms = {clean(f.get('VKN/TCKN')): key(f.get('Firma')) for f in ht(SRC / 'exports' / 'firmalar.html')}
    all_c = listing('/api/customers')
    panel_c = {c['taxNumber']: c for c in all_c if c.get('taxNumber')}
    panel_ct = {key(c['title']): c for c in all_c}  # VKN'si boş ya da boşaltılmış müşteriler ünvanla eşlenir
    miss = 0
    for c in ht(SRC / 'exports' / 'musteri-cari.html', numbered=True):
        v = clean(c.get('Müşteri VKN')); p = panel_c.get(v) or panel_ct.get(firms.get(v, key(c.get('Firma'))))
        want = money(c.get('Bakiye')) - waiting[firms.get(v, key(c.get('Firma')))]
        if not p or abs(Dm(str(p['balance'])) - want) > Dm('0.05'):
            miss += 1; say(f"  UYUŞMAZ müşteri {v}: panel {p and p['balance']} ≠ beklenen {want}")
    sup_file = SRC / 'exports' / 'tedarikci-cari.html'
    if not sup_file.exists():  # eski çekimler: taşeron carisi yalnız taramada vardı
        site = json.loads((SRC / 'site-map.json').read_text()); pg = next(x for x in site['pages'] if x['url'].endswith('alck_tdrkc.php'))
        sup_file = SRC / 'pages' / f"{pg['n']}.html"
    panel_s = {key(x['title']): x for x in listing('/api/suppliers')}
    panel_sv = {x['taxNumber']: x for x in panel_s.values() if x.get('taxNumber')}
    for c in ht(sup_file, min_cols=11, numbered=True):
        p = panel_sv.get(clean(c.get('Tedarikçi VKN'))) or panel_s.get(key(c.get('Tedarikçi Ünvanı')))
        if not p or abs(Dm(str(p['balance'])) - money(c.get('Bakiye'))) > Dm('0.05'):
            miss += 1; say(f"  UYUŞMAZ taşeron {c.get('Tedarikçi Ünvanı')}: panel {p and p['balance']} ≠ eski {c.get('Bakiye')}")
    say(f'KİŞİ KİŞİ MUTABAKAT: {"hepsi tuttu" if miss == 0 else f"{miss} uyuşmazlık"}')
    say(f"PANELDE: {trips['total']} sefer, faturası kesilecek {un['total']} sefer")

(AKTAR / ('prova-rapor.txt' if APPLY else 'deneme-rapor.txt')).write_text('\n'.join(log) + '\n', encoding='utf-8')
