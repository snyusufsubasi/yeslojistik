"""Fail closed before constructing a destructive mirror snapshot; never contacts a source."""
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path

import openpyxl

# Only exports consumed by transform.py are required here. Empty, valid tables are allowed.
REQUIRED = {
    'firmalar': ('html', {'Firma', 'VKN/TCKN'}),
    'tedarikciler': ('html', {'Ünvan', 'VKN/TCKN'}),
    'soforler': ('html', {'Şöför', 'Plaka'}),
    'araclar': ('html', {'Plaka'}),
    'giderler': ('html', {'Tarih', 'Kategori', 'Gider', 'Tutar'}),
    'mazotlar': ('xlsx', {'Tarih', 'Plaka', 'Tutar', 'Litre', 'Yeni KM'}),
    'bankalar': ('html', {'Hesap İsmi'}),
    'personeller': ('html', {'Sıra No', 'İsim / Soyisim'}),
    'musteri-cari': ('html', {'Müşteri VKN', 'Firma', 'Bakiye'}),
    'tedarikci-cari': ('html', {'Tedarikçi VKN', 'Tedarikçi Ünvanı', 'Bakiye'}),
    'sevkiyatlar': ('xlsx', {'Tarih', 'Firma Ünvanı', 'Plaka', 'Şöför İsim', 'Fatura Başlığı',
                            'Sevkiyat Durum', 'Araç Cinsi', 'Kesilen Fatura', 'Komisyon', 'Masraf',
                            'Şöför Prim', 'Yükleme Noktası', 'İndirme Noktası', 'Ürün',
                            'Şöför Fiyat', 'Müşteri Fiyat'}),
}


MIN_COLUMNS = {'araclar': 5, 'giderler': 5, 'bankalar': 5, 'personeller': 8, 'tedarikci-cari': 11}


class HeaderRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr': self.row = []
        if tag in ('td', 'th') and self.row is not None: self.cell = ''

    def handle_data(self, data):
        if self.cell is not None: self.cell += data

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            self.row.append(' '.join(self.cell.split()).rstrip('↕▼▲ ').strip())
            self.cell = None
        if tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def validate_exports(exports):
    """Accept existing manifests; new manifests additionally bind bytes using SHA-256."""
    exports = Path(exports)
    try:
        manifest = json.loads((exports / 'summary.json').read_text(encoding='utf-8'))
        entries = manifest['summary']
        if not isinstance(entries, list): raise ValueError()
    except (OSError, ValueError, KeyError, TypeError):
        raise ValueError('Dışa aktarım özeti eksik veya bozuk; yeniden çekin.') from None
    by_name = {}
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get('name'), str):
            raise ValueError('Dışa aktarım özeti geçersiz.')
        name = entry['name']
        if name in by_name: raise ValueError(f'{name}: yinelenen dışa aktarım özeti.')
        by_name[name] = entry
    for name, (ext, required_headers) in REQUIRED.items():
        entry = by_name.get(name)
        filename = f'{name}.{ext}'
        if not entry or 'error' in entry or 'skipped' in entry or entry.get('file') != filename:
            raise ValueError(f'{name}: dışa aktarım tamamlanmamış; senkron durduruldu.')
        try:
            data = (exports / filename).read_bytes()
        except OSError:
            raise ValueError(f'{name}: dışa aktarım dosyası yok.') from None
        if not data or entry.get('bytes') != len(data):
            raise ValueError(f'{name}: dışa aktarım dosyası eksik veya değişmiş.')
        if 'sha256' in entry and entry['sha256'] != hashlib.sha256(data).hexdigest():
            raise ValueError(f'{name}: dışa aktarım dosyası özetle eşleşmiyor.')
        try:
            if ext == 'html':
                parser = HeaderRows()
                parser.feed(data.decode('utf-8', errors='strict'))
                headers = next((row for row in parser.rows if len(row) >= MIN_COLUMNS.get(name, 3)), ())
                valid = required_headers <= set(headers)
            else:
                workbook = openpyxl.load_workbook(exports / filename, read_only=True)
                try:
                    headers = next(workbook.worksheets[0].iter_rows(values_only=True), ())
                    valid = required_headers <= set(headers)
                finally:
                    workbook.close()
        except Exception:
            raise ValueError(f'{name}: dışa aktarım biçimi okunamadı.') from None
        if not valid:
            raise ValueError(f'{name}: beklenen tablo başlıkları yok; senkron durduruldu.')
