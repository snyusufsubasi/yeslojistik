import type { Permission } from './auth'

/**
 * Yeni görünümde sayfaların üstündeki sekmeler (pratikortam'daki gibi). Sekmeler mevcut sayfalara bağlantıdır;
 * adresler değişmez. docs/KOLAYLASTIRMA-UYGULAMA.md bölüm 3.
 */
export type SectionTab = { to: string; label: string; perm?: Permission }
export type Section = { key: string; tabs: SectionTab[] }

export const sections: Section[] = [
  { key: 'bugun', tabs: [{ to: '/', label: 'Bugün' }, { to: '/is-talepleri', label: 'İş Talepleri' }] },
  { key: 'efatura', tabs: [
    { to: '/faturalar?sekme=bekleyen', label: 'Faturalandırılacaklar' },
    { to: '/faturalar', label: 'Kesilen Faturalar' },
    { to: '/faturalar/yeni', label: 'Fatura Kes', perm: 'accounting' },
    { to: '/alinan-faturalar', label: 'Alınan Faturalar' },
  ] },
  { key: 'musteri-cari', tabs: [
    { to: '/cari/musteriler', label: 'Bakiyeler', perm: 'accounting' },
    { to: '/tahsilatlar', label: 'Tahsilatlar' },
  ] },
  { key: 'tedarikci-cari', tabs: [
    { to: '/cari/tedarikciler', label: 'Bakiyeler', perm: 'accounting' },
    { to: '/odemeler', label: 'Tedarikçi Ödemeleri' },
  ] },
  { key: 'sevkiyat', tabs: [{ to: '/seferler', label: 'Sevkiyat Listesi' }, { to: '/planlama', label: 'Planlama' }, { to: '/harita', label: 'Harita' }] },
  { key: 'ozmal', tabs: [
    { to: '/giderler', label: 'Giderler' },
    { to: '/mazotlar', label: 'Mazotlar' },
    { to: '/arac-masraflari', label: 'Araç Masrafları' },
    { to: '/araclar', label: 'Araçlar' },
  ] },
  { key: 'banka', tabs: [{ to: '/kasa-banka', label: 'Bankalar', perm: 'accounting' }, { to: '/cek-senet', label: 'Çekler' }] },
  { key: 'yonetici', tabs: [
    { to: '/ayarlar', label: 'Ayarlar' },
    { to: '/aktar', label: 'Veri Aktarımı' },
    { to: '/kurulum', label: 'Kurulum Sihirbazı', perm: 'admin' },
  ] },
]

/** Bir adresin ait olduğu bölüm. Sekme adresi sorgu taşıyabilir (`/faturalar?sekme=bekleyen`); yol karşılaştırılır. */
export function sectionFor(pathname: string): Section | undefined {
  return sections.find((s) => s.tabs.some((t) => t.to.split('?')[0] === pathname))
}

/** Yeni görünümde sayfa başlıkları pratikortam'daki adlarla (sayfanın kendi başlığının yerine). */
export const newTitles: Record<string, string> = {
  '/faturalar': 'e-Fatura',
  '/musteriler': 'Müşteri Listesi',
  '/tedarikciler': 'Tedarikçi Listesi',
  '/soforler': 'Şoför Listesi',
  '/personel': 'Personel Listesi',
  '/sabit-odemeler': 'Sabit Ödeme Listesi',
  '/raporlar': 'Analiz',
  '/kasa-banka': 'Bankalar',
  '/cek-senet': 'Çekler',
  '/mazotlar': 'Mazotlar',
  '/arac-masraflari': 'Araç Masrafları',
}
