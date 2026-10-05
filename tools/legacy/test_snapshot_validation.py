"""Synthetic exports only: python3 -m unittest discover -s tools/legacy -p 'test_snapshot_validation.py'."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import openpyxl
from snapshot_validation import REQUIRED, validate_exports

# Representative source headers, deliberately independent of the validator constants.
HTML_HEADERS = {
    "firmalar": ["Sıra No", "Firma", "VKN/TCKN"],
    "tedarikciler": ["Sıra No", "Ünvan", "VKN/TCKN"],
    "soforler": ["Sıra No", "Şöför", "Plaka"],
    "araclar": ["Sıra No", "Plaka", "Tip", "Marka Model", "Muay. / Tarih"],
    "giderler": ["Sıra No", "Tarih", "Kategori", "Gider", "Tutar"],
    "bankalar": ["Sıra No", "Hesap İsmi", "Banka", "IBAN", "Bakiye"],
    "personeller": ["Sıra No", "İsim / Soyisim", "Tc", "Telefon", "Başlangıç Tarih", "Maaş", "Not", "İşlem"],
    "musteri-cari": ["Sıra No", "Müşteri VKN", "Firma", "Bakiye"],
    "tedarikci-cari": ["Sıra No", "Tedarikçi VKN", "Tedarikçi Ünvanı", "Bakiye", "A", "B", "C", "D", "E", "F", "G"],
}
XLSX_HEADERS = {
    "mazotlar": ["Tarih", "Plaka", "Tutar", "Litre", "Yeni KM"],
    "sevkiyatlar": ["Tarih", "Firma Ünvanı", "Plaka", "Şöför İsim", "Fatura Başlığı", "Sevkiyat Durum",
                    "Araç Cinsi", "Kesilen Fatura", "Komisyon", "Masraf", "Şöför Prim", "Yükleme Noktası",
                    "İndirme Noktası", "Ürün", "Şöför Fiyat", "Müşteri Fiyat"],
}


class SnapshotValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.exports = self.root / 'exports'
        self.exports.mkdir()
        self.entries = []
        for name, (ext, headers) in REQUIRED.items():
            file = self.exports / f'{name}.{ext}'
            if ext == 'html':
                body = '<tr><td>1</td><td>34 ABC 123</td><td>Kamyon</td><td>Ford 2020</td><td></td></tr>' if name == 'araclar' else ''
                file.write_text('<table><tr>' + ''.join(f'<th>{h}</th>' for h in HTML_HEADERS[name]) + '</tr>' + body + '</table>', encoding='utf-8')
            else:
                book = openpyxl.Workbook()
                book.active.append(XLSX_HEADERS[name])
                book.save(file)
                book.close()
            self.entries.append({'name': name, 'file': file.name, 'bytes': file.stat().st_size,
                                 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
        self.save()

    def save(self):
        (self.exports / 'summary.json').write_text(json.dumps({'summary': self.entries}), encoding='utf-8')

    def test_complete_empty_tables_are_valid(self):
        validate_exports(self.exports)

    def test_previous_manifest_format_supported(self):
        for entry in self.entries: entry.pop('sha256')
        self.save()
        validate_exports(self.exports)

    def test_every_consumed_export_is_required(self):
        for name in REQUIRED:
            with self.subTest(name=name):
                old = self.entries
                self.entries = [e for e in old if e['name'] != name]
                self.save()
                with self.assertRaises(ValueError): validate_exports(self.exports)
                self.entries = old
        self.save()

    def test_failed_entry_cannot_reuse_stale_file(self):
        self.entries[0]['error'] = 'HTTP 500'
        self.save()
        with self.assertRaisesRegex(ValueError, 'tamamlanmamış'): validate_exports(self.exports)

    def test_missing_file_rejected(self):
        (self.exports / 'musteri-cari.html').unlink()
        with self.assertRaises(ValueError): validate_exports(self.exports)

    def test_same_length_changed_file_rejected(self):
        file = self.exports / 'musteri-cari.html'
        file.write_bytes(file.read_bytes().replace(b'Firma', b'FIRMA'))
        with self.assertRaisesRegex(ValueError, 'eşleşmiyor'): validate_exports(self.exports)

    def test_malformed_html_or_excel_rejected_even_with_matching_manifest(self):
        for name in ('musteri-cari', 'mazotlar'):
            with self.subTest(name=name):
                entry = next(e for e in self.entries if e['name'] == name)
                file = self.exports / entry['file']
                old = file.read_bytes()
                data = b'<html><form>Login</form></html>'
                file.write_bytes(data)
                entry.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
                self.save()
                with self.assertRaises(ValueError): validate_exports(self.exports)
                file.write_bytes(old)
                entry.update(bytes=len(old), sha256=hashlib.sha256(old).hexdigest())
                self.save()

    def test_successful_transform_creates_snapshot(self):
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('transform.py')), str(self.root), '--json'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        snapshot = json.loads((self.root / 'aktar' / 'ayna.json').read_text())
        self.assertEqual(len(snapshot['vehicles']), 1)
        self.assertEqual(snapshot['vehicles'][0]['plate'], '34 ABC 123')
        self.assertTrue(snapshot['vehicles'][0]['own'])
        self.assertEqual(snapshot['customers'], [])
        self.assertEqual(snapshot['trips'], [])

    def test_preceding_selected_wrong_header_is_rejected(self):
        for name, count in [('musteri-cari', 3), ('bankalar', 5), ('personeller', 8)]:
            with self.subTest(name=name):
                entry = next(e for e in self.entries if e['name'] == name)
                file = self.exports / entry['file']
                old = file.read_bytes()
                wrong = ('<table><tr>' + '<td>Unrelated</td>' * count + '</tr></table>').encode()
                data = wrong + old
                file.write_bytes(data)
                entry.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
                self.save()
                with self.assertRaisesRegex(ValueError, 'başlıkları yok'): validate_exports(self.exports)
                file.write_bytes(old)
                entry.update(bytes=len(old), sha256=hashlib.sha256(old).hexdigest())
                self.save()

    def test_small_preceding_table_is_ignored_like_transform(self):
        entry = next(e for e in self.entries if e['name'] == 'bankalar')
        file = self.exports / entry['file']
        data = b'<table><tr><td>Navigation</td></tr></table>' + file.read_bytes()
        file.write_bytes(data)
        entry.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        self.save()
        validate_exports(self.exports)

    def test_transform_fails_before_writing_snapshot(self):
        self.entries[0]['skipped'] = 'unsafe'
        self.save()
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('transform.py')), str(self.root), '--json'],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('senkron durduruldu', result.stderr)
        self.assertFalse((self.root / 'aktar').exists())


if __name__ == '__main__': unittest.main()
