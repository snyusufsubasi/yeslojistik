#!/usr/bin/env python3
"""pratikortam dışa aktarımlarını panelin Excel aktarım şablonlarına çevirir.

Kullanım:  python3 tools/legacy/transform.py <extract çıktı klasörü>   (gerekli: pip install openpyxl)
Girdi:     <klasör>/exports/*.html|xlsx  (extract.mjs)  +  <klasör>/site-map.json ve pages/ (crawl.mjs; taşeron carisi için)
Çıktı:     <klasör>/aktar/1-tedarikciler.xlsx … 6-devir-odemeleri.xlsx  +  rapor.txt   (repoya girmez)

Bakiye kuralı (eski panelin "bekleyen sevkiyat" rakamı kendi içinde tutarsız olduğundan faturalardan gidilir):
  * Müşteri devri   = kesilen fatura − alınan ödeme + verilen ödeme   (eski cari, VKN ile eşlenir)
  * Seferler: müşteriye faturası kesilmiş ("Bekleniyor" dışı) seferler ESKİ KAYIT olur (bakiyeye girmez);
    "Bekleniyor" seferler aktif gelir, yeni sistemde faturalanır.
  * Taşeron devri   = alınan fatura − verilen ödeme + alınan ödeme
                      + eski kayıt olup taşeron faturası henüz gelmemiş seferlerin KDV'li tutarı
                      − aktif gelip taşeron faturası zaten gelmiş seferlerin maliyeti (yeni sistem bunu yeniden borç yazar)
  * Eksi çıkan devir (fazla ödeme/tahsilat) devir değil, cutover tarihli bir ödeme/tahsilat kaydı olur.
"""
import collections, datetime as dt, html.parser, json, re, sys
from decimal import Decimal as D
from pathlib import Path
import openpyxl

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
EXP, OUT = SRC / 'exports', SRC / 'aktar'
OUT.mkdir(exist_ok=True)
TODAY = dt.date.today()
report = []
note = report.append

# Panelin aktarım şablonlarındaki başlıklar (server/…/ImportService.cs Columns ile aynı).
COLS = {
    'suppliers': ['Ünvan', 'Tür', 'VKN/TCKN', 'Vergi Dairesi', 'Telefon', 'E-posta', 'IBAN', 'Adres', 'İl', 'İlçe', 'Yetkili', 'Vade Gün', 'Devir Borcu', 'Devir Tarihi'],
    'customers': ['Ünvan', 'VKN/TCKN', 'Vergi Dairesi', 'Telefon', 'E-posta', 'Adres', 'Not', 'Devir Bakiyesi', 'Devir Tarihi',
                  'İl', 'İlçe', 'Yetkili', 'e-Fatura Mükellefi', 'PK Etiketi', 'Vade Gün'],
    'drivers': ['Ad Soyad', 'Telefon', 'TC Kimlik No', 'Ehliyet Sınıfı', 'Ehliyet Bitiş', 'SRC Bitiş', 'Psikoteknik Bitiş', 'Tedarikçi'],
    'vehicles': ['Plaka', 'Araç Tipi', 'Marka', 'Model', 'Model Yılı', 'Km', 'Son Bakım', 'Sonraki Bakım', 'Muayene Bitiş', 'Sigorta Bitiş',
                 'Sahiplik', 'Araç Sahibi', 'Dorse Plakası'],
    'trips': ['Yükleme Tarihi', 'Müşteri', 'Plaka', 'Şoför', 'Yükleme İli', 'Yükleme Adresi', 'Teslim İli', 'Teslim Adresi', 'Teslim Tarihi',
              'Yük Cinsi', 'Müşteri Ref No', 'Araç Maliyeti', 'Satış Fiyatı', 'Durum', 'Açıklama', 'Eski Kayıt'],
    'payments': ['Tarih', 'Müşteri', 'Tutar', 'Yöntem', 'Fatura No', 'Çek/Senet No', 'Banka', 'Çek Vadesi', 'Açıklama'],
    'supplier-payments': ['Tarih', 'Tedarikçi', 'Tutar', 'Yöntem', 'Açıklama'],
    'expenses': ['Tarih', 'Kategori', 'Tutar', 'Plaka', 'Şoför', 'Tedarikçi', 'Vadeli', 'Litre', 'Km', 'Açıklama'],
    'cash-accounts': ['Hesap Adı', 'Tür', 'IBAN', 'Devir Bakiyesi', 'Devir Tarihi'],
}


class Table(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.rows, self.row, self.cell = [], None, None
    def handle_starttag(self, t, a):
        if t == 'tr': self.row = []
        if t in ('td', 'th') and self.row is not None: self.cell = ''
    def handle_endtag(self, t):
        if t in ('td', 'th') and self.cell is not None: self.row.append(' '.join(self.cell.split())); self.cell = None
        if t == 'tr' and self.row is not None: self.rows.append(self.row); self.row = None
    def handle_data(self, d):
        if self.cell is not None: self.cell += d


def html_table(path, min_cols=3, numbered=False):
    """HTML tabloyu sözlük listesine çevirir. numbered: ilk sütunu sıra no olmayan satırları ("Toplam" satırı) atar."""
    p = Table(); p.feed(Path(path).read_text(encoding='utf-8', errors='replace'))
    rows = [r for r in p.rows if len(r) >= min_cols]
    head = [h.rstrip('↕▼▲ ').strip() for h in rows[0]]
    body = [r for r in rows[1:] if not numbered or r[0].strip().isdigit()]
    return [dict(zip(head, r)) for r in body]


_TR = str.maketrans('iı', 'İI')
def key(s): return ' '.join(str(s or '').translate(_TR).upper().split())
_PLATE = re.compile(r'(\d{2})\s*([A-ZÇĞİÖŞÜ]{1,3})\s*(\d{2,5})')
_PAIR = re.compile(r'^(\d{2}[A-ZÇĞİÖŞÜ]{1,3}\d{2,4})(\d{2}[A-ZÇĞİÖŞÜ]{1,3}\d{2,4})$')
def split_plate(raw):
    """Eski panel çekici ve dorseyi tek alanda tutar ("34ABC123-34DEF456"). (araç, dorse) olarak ayırır, "34 ABC 123" biçimine getirir."""
    s = key(raw)
    if not s: return None, None
    compact = re.sub(r'[^0-9A-ZÇĞİÖŞÜ]', '', s)
    pair = _PAIR.match(compact)
    parts = [pair.group(1), pair.group(2)] if pair and not re.search(r'[-/ ]', s.strip()) else re.split(r'\s*[-/]\s*', s)
    fmt = []
    for p in parts:
        m = _PLATE.fullmatch(re.sub(r'\s+', '', p))
        if m: fmt.append(f'{m.group(1)} {m.group(2)} {m.group(3)}')
    return (fmt[0] if fmt else None), (fmt[1] if len(fmt) > 1 else None)


def clean(s):
    s = ' '.join(str(s or '').split())
    return None if s in ('', '-', '0', 'None') else s
def money(v):
    if v is None or v == '': return D(0)
    if isinstance(v, (int, float)): return D(str(v)).quantize(D('0.01'))
    s = str(v).replace('₺', '').replace('TL', '').strip()
    if not s: return D(0)
    if ',' in s: s = s.replace('.', '').replace(',', '.')
    return D(s).quantize(D('0.01'))


def write(name, entity, rows):
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Veri'
    cols = COLS[entity]; ws.append(cols)
    for r in rows: ws.append([r.get(c) for c in cols])
    wb.save(OUT / name)
    note(f'{name}: {len(rows)} satır')


# ---------- girdiler ----------
firms = html_table(EXP / 'firmalar.html')
suppliers_src = html_table(EXP / 'tedarikciler.html')
drivers_src = html_table(EXP / 'soforler.html')
cust_cari = html_table(EXP / 'musteri-cari.html', numbered=True)
if (EXP / 'tedarikci-cari.html').exists():
    sup_cari = html_table(EXP / 'tedarikci-cari.html', min_cols=11, numbered=True)
else:  # eski çekimler: taşeron carisi yalnız taramada vardı
    site = json.loads((SRC / 'site-map.json').read_text())
    sup_page = next(p for p in site['pages'] if p['url'].endswith('alck_tdrkc.php'))
    sup_cari = html_table(SRC / 'pages' / f"{sup_page['n']}.html", min_cols=11, numbered=True)
own_src = html_table(EXP / 'araclar.html', min_cols=5) if (EXP / 'araclar.html').exists() else []
expenses_src = html_table(EXP / 'giderler.html', min_cols=5) if (EXP / 'giderler.html').exists() else []
fuel_src = []
if (EXP / 'mazotlar.xlsx').exists():
    _f = list(openpyxl.load_workbook(EXP / 'mazotlar.xlsx', read_only=True).worksheets[0].iter_rows(values_only=True))
    fuel_src = [dict(zip(_f[0], r)) for r in _f[1:] if r and r[0]]
banks_src = html_table(EXP / 'bankalar.html', min_cols=5) if (EXP / 'bankalar.html').exists() else []

ws = openpyxl.load_workbook(EXP / 'sevkiyatlar.xlsx', read_only=True).worksheets[0]
raw = list(ws.iter_rows(values_only=True)); IX = {h: i for i, h in enumerate(raw[0])}
trips_src = [dict((h, r[i]) for h, i in IX.items()) for r in raw[1:]
             if r and isinstance(r[0], str) and re.match(r'\d{4}-\d\d-\d\d$', r[0])]
note(f'Kaynak: {len(firms)} firma, {len(suppliers_src)} tedarikçi, {len(drivers_src)} şoför, {len(trips_src)} sefer, '
     f'{len(cust_cari)} müşteri carisi, {len(sup_cari)} taşeron carisi')

own_titles = collections.Counter(key(t['Fatura Başlığı']) for t in trips_src if t['Sevkiyat Durum'] == 'Öz Araç')
OWN = own_titles.most_common(1)[0][0] if own_titles else None  # öz araç seferlerindeki fatura başlığı = firmanın kendisi

# ---------- tedarikçiler ----------
suppliers = {}  # key(unvan) -> satır
for s in suppliers_src:
    title = clean(s.get('Ünvan'))
    if not title: continue
    il_ilce = (s.get('İl / İlçe') or '').split('/')
    suppliers[key(title)] = {
        'Ünvan': title, 'Tür': 'Taşeron', 'VKN/TCKN': clean(s.get('VKN/TCKN')), 'Vergi Dairesi': clean(s.get('Vergi Dairesi')),
        'Telefon': clean(s.get('Telefon')), 'E-posta': clean(s.get('E-Posta')), 'IBAN': clean(s.get('IBAN')),
        'İl': clean(il_ilce[0]) if il_ilce else None, 'İlçe': clean(il_ilce[1]) if len(il_ilce) > 1 else None,
        'Yetkili': clean(s.get('Yetkili')), 'Vade Gün': 30, 'Devir Borcu': 0,
    }
added = set()
for title in [t['Fatura Başlığı'] for t in trips_src if t['Sevkiyat Durum'] == 'Piyasa'] + [d.get('Fatura Başlığı') for d in drivers_src]:
    k = key(title)
    if k and k != OWN and k not in suppliers:
        suppliers[k] = {'Ünvan': clean(title), 'Tür': 'Taşeron', 'Vade Gün': 30, 'Devir Borcu': 0}; added.add(k)
if added: note(f'Tedarikçi listesinde olmayıp seferde/şoförde geçen {len(added)} taşeron eklendi (iletişim bilgileri boş).')

# ---------- müşteriler ----------
customers = {}
by_vkn = {}
for f in firms:
    title = clean(f.get('Firma'))
    if not title: continue
    row = {'Ünvan': title, 'VKN/TCKN': clean(f.get('VKN/TCKN')), 'Vergi Dairesi': clean(f.get('Vergi Dairesi')),
           'Telefon': clean(f.get('Telefon')), 'E-posta': clean(f.get('E-Posta')), 'İl': clean(f.get('İl')), 'İlçe': clean(f.get('İlçe')),
           'Yetkili': clean(f.get('Yetkili')), 'Devir Bakiyesi': 0, 'e-Fatura Mükellefi': 'Hayır'}
    customers[key(title)] = row
    if row['VKN/TCKN']: by_vkn[row['VKN/TCKN']] = row
for t in trips_src:
    k = key(t['Firma Ünvanı'])
    if k and k not in customers:
        customers[k] = {'Ünvan': clean(t['Firma Ünvanı']), 'Devir Bakiyesi': 0, 'e-Fatura Mükellefi': 'Hayır'}
        note(f'Firma listesinde olmayan sefer müşterisi eklendi: 1 kayıt')

# ---------- şoförler ----------
drivers = {}
for d in drivers_src:
    name = clean(d.get('Şöför'))
    if not name: continue
    sup = key(d.get('Fatura Başlığı'))
    drivers[key(name)] = {'Ad Soyad': name, 'Telefon': clean(d.get('GSM')) or clean(d.get('Telefon')), 'TC Kimlik No': clean(d.get('TC')),
                          'Ehliyet Sınıfı': clean(d.get('Ehliyet')), 'Tedarikçi': suppliers[sup]['Ünvan'] if sup in suppliers else None,
                          '_plate': clean(d.get('Plaka'))}
for t in trips_src:
    k = key(t['Şöför İsim'])
    if k and k not in drivers:
        sup = key(t['Fatura Başlığı'])
        drivers[k] = {'Ad Soyad': clean(t['Şöför İsim']), 'Tedarikçi': suppliers[sup]['Ünvan'] if sup in suppliers else None}

# ---------- araçlar ----------
plate_type = collections.defaultdict(collections.Counter)
plate_owner = collections.defaultdict(collections.Counter)
plate_trailer = collections.defaultdict(collections.Counter)
own_plates = set()
bad_plates = set()
for t in trips_src:
    p, trailer = split_plate(t['Plaka'])
    if not p:
        if key(t['Plaka']): bad_plates.add(key(t['Plaka']))
        continue
    t['_plate'] = p
    if trailer: plate_trailer[p][trailer] += 1
    if t['Araç Cinsi']: plate_type[p][clean(t['Araç Cinsi'])] += 1
    if t['Sevkiyat Durum'] == 'Öz Araç': own_plates.add(p)
    elif key(t['Fatura Başlığı']) in suppliers: plate_owner[p][key(t['Fatura Başlığı'])] += 1
driver_plates = set()
for d in drivers.values():
    p, trailer = split_plate(d.get('_plate'))
    if d.get('_plate') and not p: bad_plates.add(key(d['_plate']))
    if not p: continue
    driver_plates.add(p)
    if trailer: plate_trailer[p][trailer] += 1
    if d.get('Tedarikçi'): plate_owner[p][key(d['Tedarikçi'])] += 0.5
vehicles = {}
for p in sorted(set(plate_type) | set(plate_owner) | driver_plates):
    typ = plate_type[p].most_common(1)[0][0] if plate_type[p] else 'Kamyon'
    row = {'Plaka': p, 'Araç Tipi': typ, 'Dorse Plakası': plate_trailer[p].most_common(1)[0][0] if plate_trailer[p] else None}
    if p in own_plates or not plate_owner[p]: row['Sahiplik'] = 'Özmal'
    else: row.update({'Sahiplik': 'Kiralık', 'Araç Sahibi': suppliers[plate_owner[p].most_common(1)[0][0]]['Ünvan']})
    vehicles[p] = row

def tr_date(v):
    """'14.04.2027' ya da 'HDI | 14.04.2027' → tarih."""
    m = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', str(v or ''))
    return dt.date(int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None

# Öz araçlar: eski paneldeki "Araçlar" listesi (marka, sigorta, muayene). Bu plakalar her zaman özmaldır.
for a in own_src:
    p, _ = split_plate(a.get('Plaka'))
    if not p: continue
    row = vehicles.setdefault(p, {'Plaka': p, 'Araç Tipi': 'Kamyon'})
    mm = clean(a.get('Marka Model')) or ''
    year = re.search(r'\b(19|20)\d{2}\b', mm)
    row.update({'Sahiplik': 'Özmal', 'Araç Sahibi': None, 'Marka': clean(re.sub(r'\b(19|20)\d{2}\b', '', mm)),
                'Model Yılı': int(year.group(0)) if year else None,
                'Muayene Bitiş': tr_date(a.get('Muay. / Tarih')), 'Sigorta Bitiş': tr_date(a.get('Sigorta / Tarih'))})
    if clean(a.get('Tip')): row['Araç Tipi'] = clean(a.get('Tip')).title()
if own_src: note(f'Öz araçlar: {len(own_src)} araç marka, sigorta ve muayene tarihleriyle eklendi.')
for d in drivers.values(): d.pop('_plate', None)
if bad_plates: note(f'{len(bad_plates)} plaka biçimi tanınamadı; bu plakalı seferler alınmadı (rapora bakın).')

# ---------- seferler ----------
trips, skipped, lost_active = [], 0, []
active_carrier_cost = collections.defaultdict(D)  # yeni sistemin aktif seferler için yeniden yazacağı taşeron borcu
for t in trips_src:
    cust, plate, drv = key(t['Firma Ünvanı']), t.get('_plate'), key(t['Şöför İsim'])
    if not (cust and plate and drv):
        skipped += 1
        # Faturası beklenen sefer alınmazsa alacağı hiçbir yerde kalmaz (devirden de düşülüyor): durmak gerekir.
        if str(t['Kesilen Fatura'] or '').strip() == 'Bekleniyor': lost_active.append(t.get('Sevkiyat No') or t['Tarih'])
        continue
    legacy = str(t['Kesilen Fatura'] or '').strip() != 'Bekleniyor'
    cost = money(t['Şöför Fiyat'])
    owner = vehicles.get(plate, {}).get('Araç Sahibi')
    if owner and not legacy: active_carrier_cost[key(owner)] += cost
    extras = [f"Sevkiyat {t['Sevkiyat No']}" if t.get('Sevkiyat No') else None,
              clean(t.get('Açıklama')),
              f"Komisyon {money(t['Komisyon'])}" if money(t['Komisyon']) else None,
              f"Masraf {money(t['Masraf'])}" if money(t['Masraf']) else None,
              f"Şoför primi {money(t['Şöför Prim'])}" if money(t['Şöför Prim']) else None,
              f"Teslim evrak {clean(t['Teslim Evrak No'])}" if clean(t.get('Teslim Evrak No')) else None,
              f"Fatura {clean(t['Kesilen Fatura'])}" if legacy and clean(t['Kesilen Fatura']) not in (None, 'Komisyon İşi') else None]
    d = dt.date.fromisoformat(t['Tarih'])
    trips.append({'Yükleme Tarihi': d, 'Müşteri': customers[cust]['Ünvan'], 'Plaka': plate, 'Şoför': drivers[drv]['Ad Soyad'],
                  'Yükleme Adresi': clean(t['Yükleme Noktası']) or '-', 'Teslim Adresi': clean(t['İndirme Noktası']) or '-', 'Teslim Tarihi': d,
                  'Yük Cinsi': clean(t['Ürün']), 'Araç Maliyeti': float(cost), 'Satış Fiyatı': float(money(t['Müşteri Fiyat'])),
                  'Durum': 'Teslim Edildi', 'Açıklama': ' · '.join(x for x in extras if x)[:1000], 'Eski Kayıt': 'Evet' if legacy else 'Hayır'})
if skipped: note(f'{skipped} sefer satırı müşteri/plaka/şoför boş olduğu için alınmadı.')
if lost_active:
    sys.exit(f"DUR: faturası beklenen {len(lost_active)} sefer dönüştürülemedi (müşteri/plaka/şoför eksik): "
             f"{', '.join(map(str, lost_active))}. Bunlar alınmazsa alacakları kaybolur; eski panelde düzeltip yeniden çekin.")
note(f"Seferler: {sum(t['Eski Kayıt'] == 'Evet' for t in trips)} eski kayıt (faturalanmış), "
     f"{sum(t['Eski Kayıt'] == 'Hayır' for t in trips)} aktif (faturası bekleniyor, yeni sistemde kesilecek).")

# ---------- devirler ----------
cust_payments, sup_payments = [], []
for c in cust_cari:
    row = by_vkn.get(clean(c.get('Müşteri VKN'))) or customers.get(key(c.get('Firma')))
    if not row:
        note(f"Müşteri carisi eşlenemedi (VKN/ünvan): bakiye {c.get('Bakiye')}"); continue
    devir = money(c.get('Kesilen Fatura')) - money(c.get('Alınan Ödeme')) + money(c.get('Verilen Ödeme'))
    if devir >= 0: row['Devir Bakiyesi'] = float(devir); row['Devir Tarihi'] = TODAY
    else: cust_payments.append({'Tarih': TODAY, 'Müşteri': row['Ünvan'], 'Tutar': float(-devir), 'Yöntem': 'Havale/EFT', 'Açıklama': 'Devir: eski sistemde tahsil edilmiş'})
sup_vkn = {s['VKN/TCKN']: s for s in suppliers.values() if s.get('VKN/TCKN')}
base = collections.defaultdict(D)
for c in sup_cari:
    row = sup_vkn.get(clean(c.get('Tedarikçi VKN'))) or suppliers.get(key(c.get('Tedarikçi Ünvanı')))
    if not row:
        note(f"Taşeron carisi eşlenemedi: bakiye {c.get('Bakiye')}"); continue
    base[key(row['Ünvan'])] += money(c.get('Bakiye'))
for k in set(base) | set(active_carrier_cost):
    devir = base[k] - active_carrier_cost[k]
    row = suppliers[k]
    if devir >= 0: row['Devir Borcu'] = float(devir); row['Devir Tarihi'] = TODAY if devir else None
    else: sup_payments.append({'Tarih': TODAY, 'Tedarikçi': row['Ünvan'], 'Tutar': float(-devir), 'Yöntem': 'Havale/EFT', 'Açıklama': 'Devir: eski sistemde ödenmiş'})

# ---------- mutabakat (eski panel ↔ yeni sistem) ----------
waiting = collections.defaultdict(D)
for t in trips_src:
    if str(t['Kesilen Fatura']).strip() == 'Bekleniyor': waiting[key(t['Firma Ünvanı'])] += money(t['Müşteri Meblağ'])
ok = bad = 0
for c in cust_cari:
    row = by_vkn.get(clean(c.get('Müşteri VKN'))) or customers.get(key(c.get('Firma')))
    if not row: continue
    if abs(money(c.get('Fatura bekleyen Sevkiyat Alacak')) - waiting[key(row['Ünvan'])]) <= D('0.05'): ok += 1
    else: bad += 1; note(f"  Uyuşmazlık: {row['Ünvan']} bekleyen sevkiyat eski {c.get('Fatura bekleyen Sevkiyat Alacak')} ≠ seferler {waiting[key(row['Ünvan'])]:,.2f}")
note('')
note('MUTABAKAT:')
note(f'  Müşteri: {ok} carinin "fatura bekleyen sevkiyat" tutarı seferlerle birebir tuttu, {bad} uyuşmadı.')
note(f"  Müşteri eski bakiye toplamı {sum(money(c.get('Bakiye')) for c in cust_cari):,.2f} TL = devir "
     f"{sum(D(str(r.get('Devir Bakiyesi') or 0)) for r in customers.values()) - sum(D(str(p['Tutar'])) for p in cust_payments):,.2f} TL"
     f" + faturası bekleyen seferler (KDV dahil) {sum(waiting.values()):,.2f} TL (yeni sistemde kesilince eklenir).")
sup_total = sum(money(c.get('Bakiye')) for c in sup_cari)
new_total = sum(D(str(r.get('Devir Borcu') or 0)) for r in suppliers.values()) - sum(D(str(p['Tutar'])) for p in sup_payments) + sum(active_carrier_cost.values())
note(f'  Taşeron eski bakiye toplamı {sup_total:,.2f} TL; yeni sistem (devir − fazla ödeme + aktif sefer maliyeti) {new_total:,.2f} TL.')

# ---------- giderler ve mazot ----------
# Eski "Giderler" listesi bir kasa çıkış defteri: taşeron ödemeleri ("Fatura No …", "VKN …"), NAKLİYESPOTARAÇLAR ve
# mahsuplaşmalar cari devirlerinde zaten var; gider olarak alınırsa iki kez sayılır. Onlar atlanır, gerçek giderler alınır.
PAYMENT_CATS = {'NAKLİYESPOTARAÇLAR', 'MAHSUPLAŞMA'}
def expense_category(cat, text):
    t = key(f'{cat} {text}')
    if 'HGS' in t or 'GEMİ' in t or 'FERİBOT' in t or 'OTOYOL' in t or 'KÖPRÜ' in t: return 'Otoyol'
    if 'YAKIT' in t or 'MAZOT' in t: return 'Yakıt'
    if 'HARÇLIK' in t: return 'Harcırah'
    if 'TAMİR' in t or 'BAKIM' in t or 'SERVİS' in t: return 'Bakım'
    if 'LASTİK' in t: return 'Lastik'
    if 'SİGORTA' in t or 'KASKO' in t: return 'Sigorta'
    if 'VERGİ' in t or 'SSK' in t or 'SGK' in t or 'MTV' in t: return 'Vergi'
    return 'Diğer'
expenses, skipped_exp = [], collections.Counter()
for e in expenses_src:
    cat, what, note_ = key(e.get('Kategori')), clean(e.get('Gider')), clean(e.get('Not')) or ''
    amount = money(e.get('Tutar'))
    if (cat in PAYMENT_CATS or note_.startswith(('Fatura No', 'VKN')) or (not cat and (not what or key(what) == 'KISMI ÖDEME'))) or amount <= 0:
        skipped_exp[cat or 'kategorisiz ödeme'] += amount; continue
    plate, _ = split_plate(cat)
    if plate: vehicles.setdefault(plate, {'Plaka': plate, 'Araç Tipi': 'Kamyon', 'Sahiplik': 'Özmal'})
    expenses.append({'Tarih': tr_date(e.get('Tarih')), 'Kategori': expense_category('' if plate else cat, what or ''),
                     'Tutar': float(amount), 'Plaka': plate,
                     'Açıklama': ' · '.join(x for x in [None if plate else clean(e.get('Kategori')), what, note_ or None] if x)[:500] or None})
for f in fuel_src:
    plate, _ = split_plate(f.get('Plaka'))
    if not plate: continue
    vehicles.setdefault(plate, {'Plaka': plate, 'Araç Tipi': 'Kamyon', 'Sahiplik': 'Özmal'})
    expenses.append({'Tarih': tr_date(f.get('Tarih')), 'Kategori': 'Yakıt', 'Tutar': float(money(f.get('Tutar'))), 'Plaka': plate,
                     'Litre': float(money(f.get('Litre'))) or None, 'Km': int(f['Yeni KM']) if f.get('Yeni KM') else None,
                     'Açıklama': ' · '.join(x for x in ['Mazot', clean(f.get('Petrol'))] if x)})
# Eski panelde aynı gün aynı tutarda iki ayrı gider olabilir; aktarım bunları tekrar sayıp atlamasın diye sıra eklenir.
seen = collections.Counter()
for e in expenses:
    k = (e['Tarih'], e['Kategori'], e['Tutar'], e.get('Plaka'), e.get('Açıklama'))
    seen[k] += 1
    if seen[k] > 1: e['Açıklama'] = f"{e.get('Açıklama') or ''} ({seen[k]}. kayıt)".strip()
if expenses_src or fuel_src:
    note(f'Giderler: {len(expenses)} kayıt (mazot {len(fuel_src)}). Cari devrinde zaten olan ödemeler gider sayılmadı: '
         + ', '.join(f'{k} {v:,.2f} TL' for k, v in skipped_exp.most_common()))

# ---------- banka hesapları ----------
cash_accounts = [{'Hesap Adı': clean(b.get('Hesap İsmi')), 'Tür': 'Banka', 'Devir Bakiyesi': float(money(b.get('Güncel Bakiye'))), 'Devir Tarihi': TODAY}
                 for b in banks_src if clean(b.get('Hesap İsmi'))]
if cash_accounts: note(f"Banka hesapları: {len(cash_accounts)} hesap, eski paneldeki güncel bakiyeyle açılır (toplam {sum(c['Devir Bakiyesi'] for c in cash_accounts):,.2f} TL).")

write('1-tedarikciler.xlsx', 'suppliers', list(suppliers.values()))
write('2-musteriler.xlsx', 'customers', list(customers.values()))
write('3-soforler.xlsx', 'drivers', list(drivers.values()))
write('4-araclar.xlsx', 'vehicles', list(vehicles.values()))
write('5-seferler.xlsx', 'trips', trips)
if cust_payments: write('6-devir-tahsilatlari.xlsx', 'payments', cust_payments)
if sup_payments: write('7-devir-odemeleri.xlsx', 'supplier-payments', sup_payments)
if expenses: write('8-giderler.xlsx', 'expenses', expenses)
if cash_accounts: write('9-banka-hesaplari.xlsx', 'cash-accounts', cash_accounts)
(OUT / 'rapor.txt').write_text('\n'.join(report) + '\n', encoding='utf-8')
print('\n'.join(report))
