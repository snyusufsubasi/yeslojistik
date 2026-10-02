import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from turkce import fix_case, fix_places, fix_city, fix_title  # noqa: E402


class FixCase(unittest.TestCase):
    def test_names(self):
        self.assertEqual(fix_case('AHMET YILMAZ'), 'Ahmet Yılmaz')
        self.assertEqual(fix_case('IŞIK İNCE'), 'Işık İnce')
        self.assertEqual(fix_case('İSTANBUL'), 'İstanbul')

    def test_company_suffixes(self):
        self.assertEqual(fix_case(fix_title('ÖRNEK LOJİSTİK TİC.LTD.ŞTİ.')), 'Örnek Lojistik Tic. Ltd. Şti.')
        self.assertEqual(fix_case('ÖRNEK İNŞAAT SAN. VE TİC. A.Ş.'), 'Örnek İnşaat San. ve Tic. A.Ş.')
        self.assertEqual(fix_case(fix_title('ÖRNEK SERVİS HİZM. TİC.A.Ş.')), 'Örnek Servis Hizm. Tic. A.Ş.')

    def test_acronyms_and_mixed(self):
        self.assertEqual(fix_case('BRK NAKLİYAT'), 'BRK Nakliyat')
        self.assertEqual(fix_case('FLORYA AVM'), 'Florya AVM')
        self.assertEqual(fix_case('Pendik'), 'Pendik')
        self.assertEqual(fix_case('ANKARA 4 NOKTA'), 'Ankara 4 Nokta')
        self.assertEqual(fix_case('ANKARA 4 YER İNDİRME'), 'Ankara 4 Yer İndirme')
        self.assertEqual(fix_case('izmir nakliye'), 'İzmir Nakliye')
        self.assertEqual(fix_case('VE DEPO'), 'Ve Depo')
        self.assertEqual(fix_case('34 ABC 123 PLAKALI ARAÇ'), '34 ABC 123 Plakalı Araç')
        self.assertEqual(fix_case('FATURA WBE2026000000001'), 'Fatura WBE2026000000001')

    def test_exceptions(self):
        self.assertEqual(fix_case('MES DEPO', {'MES': 'MES'}), 'MES Depo')


class Places(unittest.TestCase):
    def test_places(self):
        self.assertEqual(fix_places('ANTALAYA'), 'ANTALYA')
        self.assertEqual(fix_places('ANTALYA KONYA ALTI'), 'ANTALYA KONYAALTI')
        self.assertEqual(fix_places('KADİKÖY VE ÜSKÜDAR'), 'KADIKÖY VE ÜSKÜDAR')
        self.assertEqual(fix_places('SHERATON OTEL'), 'SHERATON OTEL')
        self.assertEqual(fix_city('SAKARAYA'), 'Sakarya')
        self.assertEqual(fix_city('istanbul'), 'İstanbul')


if __name__ == '__main__':
    unittest.main()
