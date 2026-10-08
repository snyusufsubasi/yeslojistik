import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const ACCENT = '#4652c9'

const features = [
  { t: 'Sevkiyat yönetimi', d: 'Sevkiyatı 60 saniyede gir. Şablon, tekrarla, taşıma şekli, dorse tipi ve durum geçmişi tek ekranda.' },
  { t: '“Bugün” ekranı', d: 'Geciken işler, eksik evrak, faturalanacaklar ve vadesi gelen tahsilatlar güne başlarken önünde.' },
  { t: 'Cari, fatura ve tahsilat', d: 'Teslimden faturaya, faturadan tahsilata kesintisiz akış. Müşteri ve tedarikçi ekstreleri hazır.' },
  { t: 'Araç, şoför ve belgeler', d: 'Muayene, sigorta, SRC, psikoteknik ve K belgesi bitişleri 30 gün önceden uyarı verir.' },
  { t: 'U-ETDS hazırlığı', d: 'Bakanlığa bildirilecek alanlar sevkiyat girilirken kontrol edilir; eksikler anında görünür.' },
  { t: 'Şoför uygulaması ve takip linki', d: 'Şoför mobil uygulamadan durum günceller, müşteri tek linkle yükünü takip eder.' },
]

const stats = [
  { n: '35+', l: 'veri modülü' },
  { n: '320+', l: 'otomatik test' },
  { n: '7/24', l: 'şifreli gece yedeği' },
  { n: 'TR', l: 'mevzuata uygun alanlar' },
]

export default function LandingPage() {
  useEffect(() => {
    document.title = 'YES Lojistik – Nakliye firmaları için yönetim paneli'
  }, [])
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-semibold text-slate-900">YES Lojistik</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-5 text-sm">
            <a href="#ozellikler" className="hidden sm:inline text-slate-600 hover:text-slate-900">Özellikler</a>
            <a href="#neden" className="hidden sm:inline text-slate-600 hover:text-slate-900">Neden YES</a>
            <a href="#iletisim" className="hidden sm:inline text-slate-600 hover:text-slate-900">İletişim</a>
            <Link to="/giris" className="rounded-xl px-4 py-2 font-medium text-white shadow-sm" style={{ background: ACCENT }}>
              Giriş Yap
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
          <p className="mb-4 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium" style={{ color: ACCENT }}>
            Türkiye'deki nakliye ve lojistik firmaları için
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            Seferden faturaya, tüm nakliye operasyonun tek panelde.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            YES Lojistik; sevkiyat, araç, şoför, cari, fatura, tahsilat, mazot ve U-ETDS işlerini Excel ve WhatsApp
            karmaşasından çıkarıp ofis ekibinin her sabah açtığı sade bir ekrana dönüştürür.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/giris" className="rounded-xl px-6 py-3 font-medium text-white shadow-sm" style={{ background: ACCENT }}>
              Panele Giriş Yap
            </Link>
            <a href="#iletisim" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-800">
              Demo İste
            </a>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-2xl font-bold" style={{ color: ACCENT }}>{s.n}</div>
                <div className="mt-1 text-sm text-slate-600">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="ozellikler" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-3xl font-bold text-slate-900">Ofisin her gün yaptığı iş, daha az tıklamayla</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.t} className="rounded-2xl border border-slate-200 bg-[#f7f8fb] p-6">
                  <h3 className="text-lg font-semibold text-slate-900">{f.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="neden" className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl font-bold text-slate-900">Neden YES Lojistik?</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="font-semibold text-slate-900">Sahada doğdu</h3>
              <p className="mt-2 text-sm text-slate-600">Gerçek bir nakliye firmasının günlük akışından tasarlandı ve canlı veriyle kullanılıyor.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Akıllı alanlar</h3>
              <p className="mt-2 text-sm text-slate-600">Form alanları sektör varsayılanlarını ve sık kullandıklarını öğrenir; yazmak yerine seçersin.</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Güvenli ve yedekli</h3>
              <p className="mt-2 text-sm text-slate-600">Rol bazlı yetkiler, şifreli gece yedeği ve geri yükleme provası her gün otomatik.</p>
            </div>
          </div>
        </section>

        <section id="iletisim" className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 py-14 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Firmanda denemek ister misin?</h2>
              <p className="mt-1 text-slate-600">Kısa bir demo için yaz, hesabını aynı gün açalım.</p>
            </div>
            <a href="mailto:ysufsubasi@yeslojistik.net" className="rounded-xl px-6 py-3 font-medium text-white" style={{ background: ACCENT }}>
              ysufsubasi@yeslojistik.net
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} YES Lojistik · <Link to="/gizlilik" className="hover:underline">Gizlilik</Link> ·{' '}
        <Link to="/giris" className="hover:underline">Giriş Yap</Link>
      </footer>
    </div>
  )
}
