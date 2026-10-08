import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Banknote, Building2, CalendarCheck, CalendarClock, ChartColumn, Check, ClipboardList, Download, FileCheck2,
  FileSpreadsheet, FileText, Fuel, HandCoins, History, IdCard, Inbox, KeyRound, Landmark, Link2, Lock, LogIn, Mail, MapPin,
  Menu, PenLine, Receipt, Repeat, Route, ScrollText, ShieldCheck, Smartphone, Sparkles, Sun, Truck, UserCog, Users, Wallet,
  WifiOff, Wrench, X,
} from 'lucide-react'

/**
 * Herkese açık tanıtım sayfası (yeslojistik.net/). Oturum kontrolünü beklemeden açılır (App.tsx → RequireAuth).
 * Yalnızca uygulamada GERÇEKTEN olan özellikleri anlatır; U-ETDS için yalnız "hazırlık kontrolü", e-Fatura için yalnız
 * UBL-TR XML üretimi söylenir (bkz. docs/UETDS.md, docs/E-FATURA.md). Tasarım: docs/TASARIM-HARK.md.
 */

const DEMO_MAIL = 'mailto:ysufsubasi@yeslojistik.net?subject=YES%20Lojistik%20demo%20talebi&body=Merhaba%2C%20firmam%C4%B1z%20i%C3%A7in%20YES%20Lojistik%20demosu%20rica%20ediyoruz.%0AFirma%20ad%C4%B1%3A%0AAra%C3%A7%20say%C4%B1s%C4%B1%3A%0ATelefon%3A'

const nav = [
  { href: '#ozellikler', label: 'Özellikler' },
  { href: '#nasil-calisir', label: 'Nasıl çalışır' },
  { href: '#kimler-icin', label: 'Kimler için' },
  { href: '#sss', label: 'SSS' },
]

type Feature = { icon: ReactNode; t: string; d: string }
const ic = 'size-5'

const groups: { id: string; title: string; lead: string; items: Feature[] }[] = [
  {
    id: 'operasyon', title: 'Operasyon', lead: 'İşi alın, planlayın, takip edin.',
    items: [
      { icon: <Truck className={ic} />, t: 'Sevkiyatlar', d: 'Yükleme, teslim, araç, şoför, fiyat tek formda. Şablondan başlatın, benzer işi tek tıkla tekrarlayın; her durum değişikliği geçmişe yazılır.' },
      { icon: <Sun className={ic} />, t: 'Bugün ekranı', d: 'Geciken, bugün yüklenecek ve teslim edilecek işler, eksik evrak ve faturalanmayı bekleyenler güne başlarken önünüzde.' },
      { icon: <Inbox className={ic} />, t: 'İş talepleri', d: 'Araç ve şoför belli olmadan gelen işleri kaydedin; hazır olunca sevkiyata çevirin.' },
      { icon: <MapPin className={ic} />, t: 'Harita', d: 'Şoför uygulamasından gelen son konumlar haritada; 30 saniyede bir yenilenir.' },
      { icon: <FileCheck2 className={ic} />, t: 'U-ETDS hazırlığı', d: 'Bildirim için gereken bilgiler sevkiyat girilirken kontrol edilir, eksikler hemen görünür.' },
      { icon: <Sparkles className={ic} />, t: 'Akıllı alanlar', d: 'Yük cinsi, birim, gider adı gibi alanlarda en sık kullandıklarınız tek dokunuşla çip olarak gelir; listede olmayanı yazdığınız gibi kaydedin.' },
    ],
  },
  {
    id: 'filo', title: 'Filo ve şoför', lead: 'Araç, belge ve masraf kontrol altında.',
    items: [
      { icon: <Truck className={ic} />, t: 'Araçlar', d: 'Plaka, tip, kapasite ve belgeler. Muayene, trafik sigortası, egzoz emisyon gibi bitişler 30 gün kala uyarır.' },
      { icon: <IdCard className={ic} />, t: 'Şoförler', d: 'Ehliyet, SRC, psikoteknik gibi belgelerin bitiş tarihleri ve taranmış dosyaları tek kartta.' },
      { icon: <Fuel className={ic} />, t: 'Mazot', d: 'Araç bazında yakıt alımlarını kaydedin, toplamları görün.' },
      { icon: <Wrench className={ic} />, t: 'Araç masrafları', d: 'Bakım, lastik, yol ve diğer masrafları araca bağlayın; şoförün uygulamadan girdiği masrafları onaylayın.' },
      { icon: <Smartphone className={ic} />, t: 'Şoför mobil uygulaması', d: 'Şoför kendi seferlerini görür, durumu günceller, teslimde imza ve fotoğraf alır.' },
    ],
  },
  {
    id: 'finans', title: 'Finans', lead: 'Teslimden faturaya, faturadan tahsilata.',
    items: [
      { icon: <Users className={ic} />, t: 'Cari hesaplar', d: 'Müşteri ve tedarikçi carileri, bakiye ve ekstreler hazır.' },
      { icon: <Receipt className={ic} />, t: 'Faturalar', d: 'Teslim edilen sevkiyatlardan fatura kesin; KDV ve tevkifat hesaplanır, e-Fatura için UBL-TR XML üretilir.' },
      { icon: <HandCoins className={ic} />, t: 'Tahsilatlar ve ödemeler', d: 'Müşteriden tahsilat, tedarikçiye ödeme ve alınan faturalar aynı yerde.' },
      { icon: <ScrollText className={ic} />, t: 'Çek-senet', d: 'Alınan çek ve senetlerin vade ve durum takibi.' },
      { icon: <Landmark className={ic} />, t: 'Kasa-banka', d: 'Kasa ve banka hesaplarının hareketleri ve bakiyeleri.' },
      { icon: <Wallet className={ic} />, t: 'Giderler ve sabit ödemeler', d: 'Ofis giderleri, kira, sigorta gibi her ay tekrarlayan ödemeler.' },
      { icon: <UserCog className={ic} />, t: 'Personel', d: 'Aylık maaş, avans ve primler; kalan tutar kendiliğinden hesaplanır.' },
      { icon: <ChartColumn className={ic} />, t: 'Raporlar', d: 'Ciro, kârlılık, alacak ve gider analizleri; muhasebeciye aylık Excel aktarımı.' },
    ],
  },
  {
    id: 'musteri', title: 'Müşteri', lead: 'Müşteriniz aramadan bilsin.',
    items: [
      { icon: <Building2 className={ic} />, t: 'Müşteriler', d: 'İletişim, vergi bilgileri, geçmiş sevkiyatlar ve bakiye tek sayfada.' },
      { icon: <Link2 className={ic} />, t: 'Müşteri takip linki', d: 'Giriş gerektirmeyen bir linkle müşteriniz yükünün durumunu kendisi görür.' },
      { icon: <Truck className={ic} />, t: 'Tedarikçiler', d: 'Piyasa aracı ve taşeronlarla yaptığınız işler, ödemeler ve alınan faturalar.' },
    ],
  },
]

const steps: { icon: ReactNode; t: string; d: string }[] = [
  { icon: <Sun className={ic} />, t: 'Güne Bugün ekranıyla başlayın', d: 'Neyin gecikmiş, neyin eksik olduğunu tek bakışta görün. Sorun yoksa ekran sade kalır.' },
  { icon: <ClipboardList className={ic} />, t: 'Sevkiyatı girin', d: 'Şablondan ya da önceki işi tekrarlayarak; araç ve şoförü seçin.' },
  { icon: <Smartphone className={ic} />, t: 'Şoför yola çıksın', d: 'Uygulamadan “Yükü Aldım → Yola Çıktım → Teslim Ettim” der; panel kendiliğinden güncellenir.' },
  { icon: <Link2 className={ic} />, t: 'Müşteri linkten takip etsin', d: 'Telefon trafiği azalır; müşteri yükünün nerede olduğunu kendisi görür.' },
  { icon: <Receipt className={ic} />, t: 'Teslimde faturalayın', d: 'Teslim edilen ve evrakı tam olan işler “faturalanacaklar”a düşer.' },
  { icon: <Banknote className={ic} />, t: 'Tahsilatı işleyin, kârı görün', d: 'Vadesi gelen tahsilatlar Bugün ekranında; raporlarda kârlılığı görün.' },
]

const roles = [
  { t: 'Yönetici', d: 'Her şeyi görür; kullanıcıları, yetkileri ve firma ayarlarını yönetir.' },
  { t: 'Operasyon', d: 'Sevkiyat, iş talebi, araç ve şoför işleri. Finans ekranları gerekmez.' },
  { t: 'Muhasebe', d: 'Cari, fatura, tahsilat, ödeme, kasa-banka ve raporlar.' },
  { t: 'Şoför', d: 'Yalnızca mobil uygulama: kendi seferleri, durum, teslim ve masraf.' },
]

const faqs: { q: string; a: string }[] = [
  { q: 'Excel’deki kayıtlarımızı aktarabilir miyiz?', a: 'Evet. Müşteri, araç, şoför ve sevkiyat listelerini Excel’den içe aktarabilirsiniz. Pratikortam’dan geçiş için ayrı bir aktarım yolu da var.' },
  { q: 'U-ETDS bildirimini YES Lojistik mi gönderiyor?', a: 'Hayır, şu an bildirim göndermiyor. Sevkiyat girilirken U-ETDS için gereken bilgilerin eksiksiz olup olmadığını kontrol eder; böylece bildirimi yaparken bilgi aramazsınız.' },
  { q: 'e-Fatura kesebiliyor mu?', a: 'Kesilen faturalar için GİB’in UBL-TR biçiminde XML üretilir. Entegratör bağlantısı kurulana kadar bu XML entegratör portalına ya da mali müşavirinize verilir.' },
  { q: 'Şoförler nasıl kullanıyor?', a: 'Şoföre panelden bir kullanıcı açılır; şoför YES Lojistik mobil uygulamasına aynı e-posta ve şifreyle girer. Çekim yokken yapılan işlemler telefonda bekler, internet gelince gönderilir. Konum yalnızca şoförün onayıyla, yükleme ile teslim arasında paylaşılır.' },
  { q: 'Telefondan kullanılabilir mi?', a: 'Evet. Panel telefonda da çalışır ve ana ekrana uygulama gibi eklenebilir. Şoförler için ayrı mobil uygulama vardır.' },
  { q: 'Herkes her şeyi görür mü?', a: 'Hayır. Yönetici, operasyon, muhasebe ve şoför rolleri var; finans ekranları yalnızca yetkili kullanıcılara açılır.' },
  { q: 'Verilerimiz güvende mi?', a: 'Bağlantı şifrelidir, isteğe bağlı iki adımlı giriş vardır ve önemli işlemler kayıt altına alınır. Veritabanının her gece şifreli yedeği alınır.' },
  { q: 'Nasıl başlarız?', a: 'Hesabınız varsa “Giriş Yap” ile panele girin. Yoksa “Demo iste” ile bize yazın; firmanıza uygun kurulumu birlikte planlayalım.' },
]

function Brand() {
  return (
    <span className="flex items-center gap-2" aria-label="YES Lojistik">
      <span className="rounded-lg bg-hl px-1.5 pb-0.5 pt-1 text-[0.8125rem] font-extrabold leading-none tracking-[0.04em] text-slate-900">YES</span>
      <span className="text-[1.0625rem] font-bold tracking-[-0.01em] text-fg">Lojistik</span>
    </span>
  )
}

const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#3a45b0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 font-semibold text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-2 text-sm font-semibold text-accent">{eyebrow}</p>
      <h2 className="text-[1.75rem] leading-tight text-fg sm:text-[2.125rem]">{title}</h2>
      {lead && <p className="mt-3 text-[1.0625rem] text-muted">{lead}</p>}
    </div>
  )
}

/** Hero'daki "Bugün" ekranı örneği: yalnız CSS, görsel yükü yok. */
function TodayMock() {
  const rows = [
    { title: 'Geciken sevkiyatlar', n: 2, tone: 'bg-bad-soft text-bad', item: 'İstanbul → Ankara', plate: '34 ABC 123', badge: 'Teslim 1 gün gecikti' },
    { title: 'Bugün yüklenecekler', n: 5, tone: 'bg-info-soft text-info', item: 'Gebze → İzmir', plate: '41 YES 41', badge: 'Saat 09:30' },
    { title: 'Teslim evrakı eksik', n: 3, tone: 'bg-warn-soft text-warn', item: 'Bursa → Kocaeli', plate: '16 KL 016', badge: 'İmzalı irsaliye yok' },
    { title: 'Faturalanmayı bekleyenler', n: 4, tone: 'bg-bill-soft text-bill', item: 'Tekirdağ → İstanbul', plate: '59 TR 590', badge: 'Teslim edildi' },
  ]
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-accent-soft via-white to-[#fdf4d5] opacity-90 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-[0.9375rem] font-semibold text-fg">Bugün</p>
            <p className="text-xs text-muted">Örnek görünüm</p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">+ Yeni</span>
        </div>
        <div className="space-y-2.5 bg-canvas p-3">
          {rows.map((r) => (
            <div key={r.title} className="rounded-xl border border-line bg-white">
              <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
                <span className="truncate text-[0.8125rem] font-semibold text-fg">{r.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${r.tone}`}>{r.n}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[0.8125rem] text-fg">{r.item}</p>
                  <span className="mt-0.5 inline-flex items-center overflow-hidden rounded border border-slate-300 text-[0.6875rem] font-semibold leading-none">
                    <span className="bg-plate px-1 py-0.5 text-white">TR</span><span className="px-1.5 py-0.5 tabular-nums text-fg">{r.plate}</span>
                  </span>
                </div>
                <span className="shrink-0 text-right text-[0.6875rem] text-muted">{r.badge}</span>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Süresi dolan belge yok', 'Vadesi geçen tahsilat yok'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2.5 py-1 text-[0.6875rem] font-medium text-good">
                <Check className="size-3" />{t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    document.title = 'YES Lojistik – Nakliye firmaları için sevkiyat, filo ve finans paneli'
  }, [])

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas font-sans text-fg">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        İçeriğe geç
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#ust" className="shrink-0"><Brand /></a>
          <nav aria-label="Ana menü" className="hidden items-center gap-6 text-[0.9375rem] md:flex">
            {nav.map((n) => <a key={n.href} href={n.href} className="text-slate-600 hover:text-fg">{n.label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/giris" className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[0.9375rem] font-semibold text-white shadow-sm hover:bg-[#3a45b0]">
              <LogIn className="size-4" />Giriş Yap
            </Link>
            <button type="button" className="rounded-lg p-2 text-fg hover:bg-surface-2 md:hidden" aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={menuOpen} aria-controls="mobil-menu" onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobil-menu" aria-label="Mobil menü" className="border-t border-line bg-white px-4 pb-3 md:hidden">
            {nav.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-2 py-2.5 text-[0.9375rem] text-fg hover:bg-surface-2">{n.label}</a>
            ))}
            <a href={DEMO_MAIL} className="block rounded-lg px-2 py-2.5 text-[0.9375rem] font-medium text-accent hover:bg-surface-2">Demo iste</a>
          </nav>
        )}
      </header>

      <main id="icerik">
        {/* Hero */}
        <section id="ust" className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="min-w-0">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[0.8125rem] font-medium text-accent">
              <Truck className="size-4" />Nakliye ve lojistik firmaları için
            </p>
            <h1 className="text-[2.125rem] leading-[1.12] text-fg sm:text-5xl lg:text-[3.25rem]">
              Sevkiyattan tahsilata, nakliye işiniz <span className="text-accent">tek panelde.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-slate-600 sm:text-lg">
              Excel, WhatsApp grupları ve ayrı programlar yerine tek bir sade ekran. Sevkiyat, araç, şoför, cari, fatura,
              tahsilat, mazot ve U‑ETDS hazırlığı aynı yerde; şoför mobil uygulamadan, müşteri takip linkinden işin içinde.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/giris" className={btnPrimary}><LogIn className="size-5" />Giriş Yap</Link>
              <a href={DEMO_MAIL} className={btnSecondary}><Mail className="size-5" />Demo iste</a>
            </div>
            <ul className="mt-8 grid gap-2 text-[0.9375rem] text-slate-600 sm:grid-cols-2">
              {['Türkçe sektör dili, TL ve gün.ay.yıl', 'Excel ve Pratikortam’dan aktarım', 'Rol bazlı yetkiler', 'Her gece şifreli yedek'].map((t) => (
                <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-good" />{t}</li>
              ))}
            </ul>
          </div>
          <TodayMock />
        </section>

        {/* Problem → çözüm */}
        <section className="border-y border-line bg-white py-16 sm:py-20" aria-labelledby="sorun-baslik">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="Neden YES Lojistik?" title="Beş ayrı araç yerine bir panel" lead="Bilgiyi bir kez girin; sevkiyattan faturaya, şoförden müşteriye her yerde kullanılsın." />
            <h2 id="sorun-baslik" className="sr-only">Sorun ve çözüm</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-canvas p-6">
                <p className="mb-4 font-semibold text-fg">Bugün çoğu firmada</p>
                <ul className="space-y-3 text-[0.9375rem] text-slate-600">
                  {['Sevkiyatlar Excel’de, durum bilgisi WhatsApp gruplarında', 'Müşteri “yük nerede?” diye sürekli arıyor', 'Teslim edilen iş faturalanmadan unutuluyor', 'Muayene, sigorta, SRC bitişleri son gün fark ediliyor', 'Muhasebe, U-ETDS ve e-Fatura için bilgi tekrar tekrar yazılıyor'].map((t) => (
                    <li key={t} className="flex items-start gap-2.5"><X className="mt-0.5 size-4 shrink-0 text-bad" />{t}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-accent/30 bg-accent-soft/60 p-6">
                <p className="mb-4 font-semibold text-fg">YES Lojistik ile</p>
                <ul className="space-y-3 text-[0.9375rem] text-slate-700">
                  {['Tüm sevkiyatlar tek listede, her durum değişikliği geçmişiyle', 'Müşteri tek linkle yükünü kendisi takip ediyor', 'Teslim edilen işler “faturalanacaklar”a kendiliğinden düşüyor', 'Belge bitişleri 30 gün kala Bugün ekranında', 'Sevkiyata girilen bilgi faturaya, cariye ve U-ETDS kontrolüne akıyor'].map((t) => (
                    <li key={t} className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-good" />{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Özellikler */}
        <section id="ozellikler" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="Özellikler" title="İhtiyacınız olan her modül, sade bir düzende" lead="Ekranlar personelin günü gibi akar: planla, takip et, teslim al, faturala, tahsil et." />
            <div className="space-y-12">
              {groups.map((g) => (
                <div key={g.id} aria-labelledby={`grup-${g.id}`}>
                  <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 id={`grup-${g.id}`} className="text-xl text-fg">{g.title}</h3>
                    <p className="text-[0.9375rem] text-muted">{g.lead}</p>
                  </div>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((f) => (
                      <li key={f.t} className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                        <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">{f.icon}</span>
                        <p className="font-semibold text-fg">{f.t}</p>
                        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">{f.d}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bir günün akışı */}
        <section id="nasil-calisir" className="scroll-mt-20 border-y border-line bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="Nasıl çalışır" title="Bir günün akışı" lead="Sabah ekranı açtığınız andan tahsilata kadar her adım bir sonrakine bağlı." />
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.t} className="relative rounded-2xl border border-line bg-canvas p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white tabular-nums">{i + 1}</span>
                    <span className="text-accent">{s.icon}</span>
                  </div>
                  <p className="font-semibold text-fg">{s.t}</p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Bugün vurgusu */}
        <section className="py-16 sm:py-20" aria-labelledby="bugun-baslik">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-sm font-semibold text-accent">Bugün ekranı</p>
              <h2 id="bugun-baslik" className="text-[1.75rem] leading-tight text-fg sm:text-[2.125rem]">Normali gizler, istisnayı gösterir</h2>
              <p className="mt-3 text-[1.0625rem] text-muted">
                Girişten sonraki ilk ekran. Yüzlerce satırlık liste yerine yalnızca ilgilenmeniz gereken işler; her başlıktan tek tıkla ilgili listeye geçersiniz.
              </p>
              <ul className="mt-6 grid gap-2.5 text-[0.9375rem] text-slate-700 sm:grid-cols-2">
                {['Geciken sevkiyatlar', 'Bugün yüklenecekler', 'Bugün teslim edilecekler', 'Sorunlu sevkiyatlar', 'Teslim evrakı eksik', 'Faturalanmayı bekleyenler', 'Vadesi gelen tahsilatlar', 'Süresi dolan belgeler'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><CalendarClock className="size-4 shrink-0 text-accent" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: <Repeat className={ic} />, t: 'Şablon ve tekrarla', d: 'Aynı güzergâhı her hafta yazmayın; önceki işi kopyalayıp tarihini değiştirin.' },
                { icon: <History className={ic} />, t: 'Durum geçmişi', d: 'Kim, ne zaman, hangi durumu değiştirdi; sevkiyatın içinde görünür.' },
                { icon: <Route className={ic} />, t: 'Uçtan uca akış', d: 'Sevkiyat → teslim → fatura → tahsilat; aradaki boşluklar Bugün’de çıkar.' },
                { icon: <FileSpreadsheet className={ic} />, t: 'Excel ve PDF', d: 'Listeleri ve raporları Excel’e, belgeleri PDF’e alın.' },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                  <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">{c.icon}</span>
                  <p className="font-semibold text-fg">{c.t}</p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-slate-600">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Kimler için + roller */}
        <section id="kimler-icin" className="scroll-mt-20 border-y border-line bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="Kimler için" title="Öz mal aracı ve piyasa aracıyla çalışan nakliye firmaları"
              lead="Excel, defter ya da eski bir masaüstü programdan gelen; ofiste birkaç kişi, sahada şoförleri olan firmalar için tasarlandı." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map((r) => (
                <div key={r.t} className="rounded-2xl border border-line bg-canvas p-5">
                  <p className="mb-1 inline-flex items-center gap-2 font-semibold text-fg"><KeyRound className="size-4 text-accent" />{r.t}</p>
                  <p className="text-[0.9375rem] leading-relaxed text-slate-600">{r.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-[0.9375rem] text-muted">Her kullanıcı yalnızca rolünün gerektirdiği ekranları görür.</p>
          </div>
        </section>

        {/* Mobil + güvenlik */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-xs sm:p-8" aria-labelledby="mobil-baslik">
              <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><Smartphone className="size-6" /></span>
              <h2 id="mobil-baslik" className="text-2xl text-fg">Sahada mobil</h2>
              <p className="mt-2 text-muted">Şoför için telefon, ofis için masaüstü, yönetici için ikisi.</p>
              <ul className="mt-5 space-y-3 text-[0.9375rem] text-slate-700">
                {[
                  { i: <Truck className="size-4" />, t: 'Şoför kendi seferlerini görür, durumu tek dokunuşla günceller' },
                  { i: <PenLine className="size-4" />, t: 'Teslimde teslim alanın adı, imzası ve fotoğrafı' },
                  { i: <Receipt className="size-4" />, t: 'Masraf ve fiş girişi; ofis onaylar' },
                  { i: <WifiOff className="size-4" />, t: 'Çekim yokken yapılan işlem bekler, internet gelince gider' },
                  { i: <MapPin className="size-4" />, t: 'Konum yalnız şoförün onayıyla, yüklemeden teslime kadar' },
                  { i: <Download className="size-4" />, t: 'Panel telefonda çalışır, ana ekrana eklenebilir' },
                ].map((x) => (
                  <li key={x.t} className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 text-accent">{x.i}</span>{x.t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-xs sm:p-8" aria-labelledby="guvenlik-baslik">
              <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><ShieldCheck className="size-6" /></span>
              <h2 id="guvenlik-baslik" className="text-2xl text-fg">Güvenlik ve yedek</h2>
              <p className="mt-2 text-muted">Veri kaybı ve yanlış bakiye en büyük düşmandır.</p>
              <ul className="mt-5 space-y-3 text-[0.9375rem] text-slate-700">
                {[
                  { i: <Lock className="size-4" />, t: 'Şifreli bağlantı (HTTPS)' },
                  { i: <KeyRound className="size-4" />, t: 'İsteğe bağlı iki adımlı giriş' },
                  { i: <UserCog className="size-4" />, t: 'Rol bazlı yetkiler: herkes yalnızca işini görür' },
                  { i: <History className="size-4" />, t: 'Önemli işlemlerin kaydı: kim, ne zaman, ne değiştirdi' },
                  { i: <CalendarCheck className="size-4" />, t: 'Her gece veritabanının şifreli yedeği' },
                  { i: <FileText className="size-4" />, t: 'Gizlilik politikası ve hesap silme sayfası açık' },
                ].map((x) => (
                  <li key={x.t} className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 text-accent">{x.i}</span>{x.t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* SSS */}
        <section id="sss" className="scroll-mt-20 border-t border-line bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHead eyebrow="SSS" title="Sık sorulan sorular" />
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {faqs.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-fg hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span>
                    <span className="shrink-0 text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Son çağrı */}
        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-4xl rounded-3xl bg-accent px-6 py-12 text-center text-white shadow-lg sm:px-12">
            <h2 className="text-[1.75rem] leading-tight sm:text-[2.125rem]">Nakliye işinizi tek panelden yönetmeye hazır mısınız?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">Hesabınız varsa hemen girin. Yoksa bize yazın, firmanıza uygun bir demo planlayalım.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/giris" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-accent hover:bg-accent-soft">
                <LogIn className="size-5" />Giriş Yap
              </Link>
              <a href={DEMO_MAIL} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10">
                Demo iste<ArrowRight className="size-5" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Brand />
            <p className="mt-2 text-sm text-muted">Nakliye firmaları için sevkiyat, filo ve finans paneli.</p>
          </div>
          <nav aria-label="Alt menü" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/gizlilik" className="text-slate-600 hover:text-fg">Gizlilik</Link>
            <Link to="/hesap-silme" className="text-slate-600 hover:text-fg">Hesap silme</Link>
            <a href={DEMO_MAIL} className="text-slate-600 hover:text-fg">İletişim</a>
            <Link to="/giris" className="font-medium text-accent">Giriş Yap</Link>
          </nav>
        </div>
        <p className="border-t border-line px-4 py-4 text-center text-xs text-muted">© {new Date().getFullYear()} YES Lojistik</p>
      </footer>
    </div>
  )
}
