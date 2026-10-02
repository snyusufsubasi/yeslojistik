"""Türkçe yazım yardımcıları: yer adı düzeltme, harf düzeni (BÜYÜK HARF → "Ahmet Yılmaz"), ünvan kısaltmaları.

transform.py kullanır; testler: python3 -m unittest tools/legacy/test_turkce.py
"""
import collections, re
from pathlib import Path

_TR = str.maketrans('iı', 'İI')
def key(s): return ' '.join(str(s or '').translate(_TR).upper().split())
def clean(s):
    s = ' '.join(str(s or '').split())
    return None if s in ('', '-', '0', 'None') else s


# Doğru yazılışlar: 81 il (Cities.cs) + sık geçen ilçe ve semtler. Kamuya açık yer adlarıdır, müşteri verisi değildir.
PROVINCES = re.findall(r'"([^"]+)"', (Path(__file__).resolve().parents[2] / 'server/YesLojistik.Core/Domain/Cities.cs')
                       .read_text(encoding='utf-8').split('All =')[1].split('];')[0])
PLACES = PROVINCES + '''Afyon Antep Urfa Maraş İzmit İskenderun Adapazarı
Adalar Arnavutköy Ataşehir Avcılar Bağcılar Bahçelievler Bakırköy Başakşehir Bayrampaşa Beşiktaş Beykoz Beylikdüzü Beyoğlu
Büyükçekmece Çatalca Çekmeköy Esenler Esenyurt Eyüpsultan Fatih Gaziosmanpaşa Güngören Kadıköy Kağıthane Kartal Küçükçekmece
Maltepe Pendik Sancaktepe Sarıyer Silivri Sultanbeyli Sultangazi Şile Şişli Tuzla Ümraniye Üsküdar Zeytinburnu
Ataköy Bostancı Kozyatağı Göztepe Fulya Etiler Levent Maslak Mecidiyeköy Okmeydanı Poyrazköy Ferhatpaşa Paşaköy Kasımpaşa
Unkapanı Florya İkitelli İstinye Göktürk Ömerli Orhanlı Piyalepaşa Ulus Balat Dudullu Hadımköy Yenibosna Kurtköy Gebze Dilovası
Çayırova Darıca Körfez Gölcük Kartepe Başiskele Derince İzmit
Altındağ Çankaya Etimesgut Gölbaşı Keçiören Mamak Pursaklar Sincan Yenimahalle Polatlı Kızılay Beykent Ostim
Balçova Bayraklı Bornova Buca Çiğli Gaziemir Güzelbahçe Karabağlar Karşıyaka Konak Menemen Narlıdere Torbalı Urla Ödemiş
Selçuk Çeşme Menderes Kemalpaşa Aliağa Alsancak Işıkkent
Muratpaşa Konyaaltı Kepez Döşemealtı Aksu Alanya Manavgat Kemer Serik Kaş Kumluca
Osmangazi Nilüfer Yıldırım Mudanya Gemlik İnegöl Gürsu Kestel Balat Görükle
Bodrum Fethiye Marmaris Datça Milas Menteşe Dalaman Köyceğiz Yalıkavak Ortaca
Edremit Bandırma Ayvalık Gönen Burhaniye Altıeylül Karesi
Pamukkale Merkezefendi Seyhan Çukurova Sarıçam Yüreğir Ceyhan Şahinbey Şehitkamil
Melikgazi Kocasinan Talas Mimarsinan Tepebaşı Odunpazarı Serdivan Arifiye Erenler Akyazı
Çorlu Çerkezköy Süleymanpaşa Ergene Lüleburgaz Antakya Arsuz Dörtyol Defne Mezitli Yenişehir Tarsus Toroslar
Efeler Kuşadası Didim Nazilli Selçuklu Karatay Meram Ereğli Ayvacık Biga Gelibolu Turgutlu Akhisar Yunusemre Şehzadeler
Tatvan Güroymak Elazığ Bulancak'''.split()

_FOLD = str.maketrans('İIÖÜŞÇĞÂÎÛ', 'IIOUSCGAIU')
def fold(s): return key(s).translate(_FOLD)
PLACE_BY_FOLD = {fold(p): p for p in PLACES}

def lev(a, b, limit):
    """İki kelime arasındaki harf farkı (ekleme/silme/değiştirme); limit aşılınca limit+1 döner."""
    if abs(len(a) - len(b)) > limit: return limit + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1): cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        if min(cur) > limit: return limit + 1
        prev = cur
    return prev[-1]

def place(word):
    """Kelime bir yer adının hatalı yazılışıysa doğru yazılışı (yoksa None). Kısa kelimelere dokunulmaz."""
    f = fold(word)
    if len(f) < 4: return None
    if f in PLACE_BY_FOLD: return PLACE_BY_FOLD[f]
    if len(f) < 5: return None
    limit = 1 if len(f) < 8 else 2
    dist = {p: d for k, p in PLACE_BY_FOLD.items() if (d := lev(f, k, limit)) <= limit}
    best = [p for p, d in dist.items() if d == min(dist.values())]
    return best[0] if len(best) == 1 else None  # en yakın tek aday (ANTALAYA → Antalya; Antakya 2 harf uzakta)

fixes = collections.Counter()
_WORD = r'[A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû]+'
def fix_places(text):
    """Serbest metindeki yer adlarını düzeltir ("ANTALAYA 2 YER" → "ANTALYA 2 YER", "KONYA ALTI" → "KONYAALTI"). Büyük harf korunur."""
    if not text: return text
    def same_case(src, right): return key(right) if src.isupper() else right
    parts = re.split(f'({_WORD})', text)  # tek sıralar kelime, çift sıralar aradaki işaretler
    for i in range(1, len(parts) - 2, 2):
        if parts[i] and parts[i + 1] == ' ' and (p :=PLACE_BY_FOLD.get(fold(parts[i] + parts[i + 2]))):
            parts[i], parts[i + 1], parts[i + 2] = same_case(parts[i], p), '', ''
    for i in range(1, len(parts), 2):
        if parts[i] and (p := place(parts[i])): parts[i] = same_case(parts[i], p)
    out = ''.join(parts)
    if out != text: fixes[f'{text} → {out}'] += 1
    return out

def fix_city(v):
    """İl alanı: listedeki resmi yazılış ("SAKARAYA" → "Sakarya"); tanınmazsa olduğu gibi kalır."""
    v = clean(v)
    p = place(v) if v else None
    out = p if p in PROVINCES else ({'Afyon': 'Afyonkarahisar', 'Antep': 'Gaziantep', 'Urfa': 'Şanlıurfa', 'Maraş': 'Kahramanmaraş', 'İzmit': 'Kocaeli'}.get(p) or v)
    if v and out != v and key(out) != key(v): fixes[f'{v} → {out}'] += 1
    return out

def fix_district(v):
    v = clean(v)
    p = place(v) if v and ' ' not in v else None
    if p and key(p) != key(v): fixes[f'{v} → {p}'] += 1
    return p or v

def fix_title(v):
    """Ünvan: noktadan sonra boşluk ("TİC.LTD.ŞTİ." → "TİC. LTD. ŞTİ."); "A.Ş." gibi tek harfli kısaltmalara dokunulmaz."""
    v = clean(v)
    return ' '.join(re.sub(rf'\.(?={_WORD[:-1]}{{2,}})', '. ', v).split()) if v else v



# ---------- harf düzeni ----------
_VOWELS = set('AEIİOÖUÜ')
KEEP_UPPER = {'AVM', 'OSB', 'KDV', 'SGK', 'SSK', 'HGS', 'OGS', 'MTV', 'TC', 'TL', 'PK', 'VKN', 'IBAN', 'PTT'}
LOWER_WORDS = {'VE', 'İLE', 'VEYA'}

def tr_lower(s): return s.replace('I', 'ı').replace('İ', 'i').lower()
def tr_upper(s): return s.replace('i', 'İ').replace('ı', 'I').upper()

def _word(w, first, exceptions, dotted):
    up = tr_upper(w)
    if up in exceptions: return exceptions[up]
    if len(w) == 1 or up in KEEP_UPPER or (not dotted and not (set(up) & _VOWELS)): return up  # A.Ş., AVM, BRK (LTD. → Ltd.)
    if up in LOWER_WORDS and not first: return tr_lower(w)
    return tr_upper(w[0]) + tr_lower(w[1:])

def fix_case(text, exceptions=None):
    """BÜYÜK HARF metni Türkçe kurallarla düzgün yazar: "AHMET YILMAZ" → "Ahmet Yılmaz",
    "ABC LOJİSTİK TİC. LTD. ŞTİ." → "Abc Lojistik Tic. Ltd. Şti.", "SERAMİK VE DOLAP" → "Seramik ve Dolap".
    Ünlüsü olmayan kısaltmalar (BRK) ve A.Ş. gibi tek harfliler büyük kalır. Tamamı küçük harf olan metin de düzeltilir
    ("izmir nakliye" → "İzmir Nakliye"); büyük-küçük karışık yazılmış metne dokunulmaz.
    exceptions: {"BÜYÜK HARF KELİME": "İstenen yazım"} (paneldeki "Yazım istisnaları")."""
    if not text: return text
    letters = [c for c in text if c.isalpha()]
    if not letters or (any(c.islower() for c in letters) and any(c.isupper() for c in letters)): return text
    exceptions = {tr_upper(k): v for k, v in (exceptions or {}).items()}
    out, first = [], True
    parts = re.split(f'({_WORD})', text)  # tek sıralar kelime
    for i, part in enumerate(parts):
        if i % 2 and part:
            glued = re.search(r'\d$', parts[i - 1]) or re.match(r'\d', parts[i + 1])
            between = re.search(r'\d ?$', parts[i - 1]) and re.match(r' ?\d', parts[i + 1])
            out.append(tr_upper(part) if glued or (between and len(part) <= 3) else _word(part, first, exceptions, parts[i + 1].startswith('.')))
            first = False  # plaka ve belge no içindeki harfler (34 ABC 123, WBE2026…) büyük kalır
        else: out.append(part)
    return ''.join(out)
