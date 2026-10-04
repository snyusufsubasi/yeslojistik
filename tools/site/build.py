#!/usr/bin/env python3
"""docs/hukuk/*.md dosyalarından site/hukuk/*.html sayfalarını üretir.

Kullanım (depo kökünden):  python3 tools/site/build.py

- Yalnızca standart kütüphane kullanır; dış istek yapmaz.
- Her .md dosyasının ilk satırı "**TASLAK: ...**" uyarısıdır. Bu uyarı üretilen sayfanın en üstünde
  sabit sarı şeritte görünür; kimse yanlışlıkla yayınlamasın diye. Avukat onayından sonra uyarıyı
  önce .md dosyasından kaldırın, sonra bu betiği yeniden çalıştırın.
- README.md sayfa olarak üretilmez (iç çalışma belgesidir).
- Belgeler arası atıflar (ör. KULLANIM-SARTLARI) otomatik bağlantıya çevrilir.
- Desteklenen biçim: başlıklar, kalın/italik, `kod`, [bağlantı](url), madde ve numaralı listeler,
  tablolar, alıntı, yatay çizgi, paragraf. Başka bir şey gerekirse betiği genişletin.
"""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "hukuk"
OUT = ROOT / "site" / "hukuk"

BANNER_RE = re.compile(r"^\*\*(TASLAK:[^*]+)\*\*\s*$")

# Dosya adı -> sayfa adı (menü ve bağlantılar için)
def slug(stem: str) -> str:
    return stem.lower().replace("_", "-")


def page_files():
    return sorted(p for p in SRC.glob("*.md") if p.name.upper() != "README.MD")


def inline(text: str, stems: dict, current: str) -> str:
    """Satır içi biçimler. Önce kaçışla, sonra kalıpları uygula."""
    codes = []

    def keep_code(m):
        codes.append("<code>" + html.escape(m.group(1)) + "</code>")
        return f"\x00{len(codes) - 1}\x00"

    text = re.sub(r"`([^`]+)`", keep_code, text)
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", text)

    def link(m):
        url = m.group(2).strip()
        if not re.match(r"^(https?://|mailto:|#)", url):
            return m.group(0)  # güvenli olmayan ya da göreli: düz metin kalsın
        return f'<a href="{html.escape(url, quote=True)}">{m.group(1)}</a>'

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, text)

    # Belgeler arası atıf: KULLANIM-SARTLARI -> bağlantı (kendi sayfasına bağlantı yapma)
    def doc_ref(m):
        stem = m.group(0)
        if stem in stems and stem != current:
            return f'<a href="{slug(stem)}.html">{stem}</a>'
        return stem

    text = re.sub(r"\b[A-ZÇĞİÖŞÜ]{3,}(?:-[A-ZÇĞİÖŞÜ]{2,})+\b", doc_ref, text)
    return re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], text)


def convert(md: str, stems: dict, current: str):
    """(banner, başlık, gövde_html) döndürür."""
    lines = md.splitlines()
    banner = None
    if lines and BANNER_RE.match(lines[0].strip()):
        banner = BANNER_RE.match(lines[0].strip()).group(1)
        lines = lines[1:]

    out, title = [], None
    i, n = 0, len(lines)
    para = []

    def flush_para():
        if para:
            out.append("<p>" + inline(" ".join(s.strip() for s in para), stems, current) + "</p>")
            para.clear()

    while i < n:
        line = lines[i]
        s = line.strip()

        if not s:
            flush_para(); i += 1; continue

        m = re.match(r"^(#{1,4})\s+(.*)$", s)
        if m:
            flush_para()
            level = len(m.group(1))
            if level == 1 and title is None:
                title = m.group(2)
            out.append(f"<h{level}>{inline(m.group(2), stems, current)}</h{level}>")
            i += 1; continue

        if re.match(r"^-{3,}$", s):
            flush_para(); out.append("<hr>"); i += 1; continue

        if s.startswith(">"):
            flush_para()
            block = []
            while i < n and lines[i].strip().startswith(">"):
                block.append(re.sub(r"^>\s?", "", lines[i].strip()))
                i += 1
            paras, cur = [], []
            for b in block:
                if b.strip():
                    cur.append(b)
                elif cur:
                    paras.append(cur); cur = []
            if cur:
                paras.append(cur)
            out.append("<blockquote>" + "".join(
                "<p>" + inline(" ".join(p), stems, current) + "</p>" for p in paras) + "</blockquote>")
            continue

        if s.startswith("|") and i + 1 < n and re.match(r"^\|?\s*:?-{2,}", lines[i + 1].strip()):
            flush_para()
            def cells(row):
                row = row.strip()
                if row.startswith("|"): row = row[1:]
                if row.endswith("|"): row = row[:-1]
                return [c.strip() for c in row.split("|")]
            head = cells(lines[i]); i += 2
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(cells(lines[i])); i += 1
            t = ["<div class=\"tw\"><table><thead><tr>"]
            t += [f"<th>{inline(c, stems, current)}</th>" for c in head]
            t.append("</tr></thead><tbody>")
            for r in rows:
                t.append("<tr>" + "".join(f"<td>{inline(c, stems, current)}</td>" for c in r) + "</tr>")
            t.append("</tbody></table></div>")
            out.append("".join(t))
            continue

        m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", line)
        if m:
            flush_para()
            ordered = m.group(2)[0].isdigit()
            tag = "ol" if ordered else "ul"
            items = []
            while i < n:
                mm = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", lines[i])
                if mm and mm.group(2)[0].isdigit() == ordered:
                    items.append(mm.group(3)); i += 1
                elif lines[i].startswith("  ") and lines[i].strip() and items:
                    items[-1] += " " + lines[i].strip(); i += 1
                else:
                    break
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x, stems, current)}</li>" for x in items) + f"</{tag}>")
            continue

        para.append(s)
        i += 1
    flush_para()
    return banner, title or current, "\n".join(out)


HEAD = """<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} (taslak) | YES Lojistik</title>
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../style.css">
</head>
<body>
{banner}
<header class="top"><div class="wrap">
<a class="logo" href="../index.html" aria-label="YES Lojistik ana sayfa"><b>YES</b> Lojistik</a>
<nav aria-label="Menü"><ul><li><a href="index.html">Hukuki belgeler</a></li><li><a href="../index.html">Ana sayfa</a></li></ul></nav>
</div></header>
<main class="legal"><div class="wrap">
"""

FOOT = """</div></main>
<footer><div class="wrap"><p class="fine" style="border:0;margin:0;padding:0">Bu sayfa bir taslaktır, hukuki görüş değildir ve avukat onayı olmadan kullanılmamalıdır. Köşeli parantezli alanlar doldurulacaktır.</p></div></footer>
</body>
</html>
"""


def banner_html(text):
    if not text:
        return ""
    return f'<div class="taslak-banner" role="alert">{html.escape(text)}</div>'


def main() -> int:
    if not SRC.is_dir():
        print(f"Kaynak klasör yok: {SRC}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    files = page_files()
    stems = {p.stem: p for p in files}
    # Eski üretimleri temizle (yalnızca bu betiğin ürettiği .html dosyaları)
    for old in OUT.glob("*.html"):
        old.unlink()

    index_items = []
    for p in files:
        md = p.read_text(encoding="utf-8")
        banner, title, body = convert(md, stems, p.stem)
        if banner is None:
            print(f"UYARI: {p.name} TASLAK uyarısıyla başlamıyor.", file=sys.stderr)
        page = HEAD.format(title=html.escape(title), banner=banner_html(banner)) \
            + '<article class="doc">\n' + body + "\n</article>\n" + FOOT
        (OUT / f"{slug(p.stem)}.html").write_text(page, encoding="utf-8")
        index_items.append((slug(p.stem), title, banner))
        print("üretildi:", f"site/hukuk/{slug(p.stem)}.html")

    banner_text = next((b for _, _, b in index_items if b), "TASLAK: avukat onayı olmadan kullanmayın")
    items = "".join(f'<li><a href="{s}.html">{html.escape(t)}</a></li>' for s, t, _ in index_items)
    idx = HEAD.format(title="Hukuki belgeler", banner=banner_html(banner_text)) \
        + '<article class="doc"><h1>Hukuki belgeler (taslak)</h1>'
    idx += "<p>Bu belgelerin hiçbiri avukat onayından geçmemiştir. Yayınlamayın.</p>"
    idx += f'<ul class="legal-list">{items}</ul></article>\n' + FOOT
    (OUT / "index.html").write_text(idx, encoding="utf-8")
    print("üretildi: site/hukuk/index.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
