import {
  Handshake, HandCoins, BarChart3, Building2, FileText, Home, Receipt, Settings, Truck, Users, Wallet, IdCard, Map as MapIcon,
  HelpCircle, CalendarRange, Landmark, ScrollText, Scale, ClipboardList, UserRound, Repeat, FileInput, FileSpreadsheet, ShieldCheck, Sun, Fuel, Wrench,
} from 'lucide-react'
import type { Alert, Dashboard } from '../api/types'
import type { Permission } from './auth'

export type Badge = { count: number; title: string }
export type NavGroup = { title?: string; items: NavItem[] }
export type NavItem = { to: string; label: string; icon: typeof Home; perm?: Permission; badge?: (d: Dashboard | undefined, alerts: Alert[]) => Badge | null }

export const alertsAt = (alerts: Alert[], path: string) => alerts.filter((a) => a.link.startsWith(path)).length
export const badge = (count: number, title: string): Badge | null => (count > 0 ? { count, title } : null)

/**
 * Menü, eski paneldeki (pratikortam) gruplamayı izler ki alışkanlık bozulmasın: Sevkiyat, Cari, Listeler, Öz Mal, Banka & Çek.
 * Ama daha sade: gruplar hep açık (katlanmaz), bekleyen işler sarı sayaçla görünür.
 */
export const classicNav: NavGroup[] = [
  { items: [
    { to: '/', label: 'Bugün', icon: Sun },
    { to: '/pano', label: 'Genel Bakış', icon: Home },
    { to: '/harita', label: 'Araç Takip Haritası', icon: MapIcon },
  ] },
  { title: 'Sevkiyat', items: [
    { to: '/is-talepleri', label: 'İş Talepleri', icon: ClipboardList },
    { to: '/seferler', label: 'Sevkiyatlar', icon: Truck,
      badge: (d) => badge(d?.activeTripCount ?? 0, 'bekleyen ve yoldaki sevkiyat') },
    { to: '/planlama', label: 'Planlama', icon: CalendarRange },
  ] },
  { title: 'Cari', items: [
    { to: '/cari/musteriler', label: 'Müşteriler Cari', icon: Scale, perm: 'accounting',
      badge: (_, a) => badge(alertsAt(a, '/musteriler'), 'vadesi geçen alacak') },
    { to: '/cari/tedarikciler', label: 'Tedarikçiler Cari', icon: Scale, perm: 'accounting',
      badge: (_, a) => badge(alertsAt(a, '/tedarikciler'), 'taşeron uyarısı') },
    { to: '/faturalar', label: 'Faturalar', icon: FileText,
      badge: (d) => badge(d?.uninvoicedTripCount ?? 0, 'faturası kesilmemiş teslim sevkiyat') },
    { to: '/tahsilatlar', label: 'Tahsilatlar', icon: Wallet },
    { to: '/alinan-faturalar', label: 'Alınan Faturalar', icon: FileInput },
    { to: '/odemeler', label: 'Tedarikçi Ödemeleri', icon: HandCoins },
  ] },
  { title: 'Listeler', items: [
    { to: '/musteriler', label: 'Müşteriler', icon: Users },
    { to: '/tedarikciler', label: 'Tedarikçiler', icon: Handshake },
    { to: '/soforler', label: 'Şoförler', icon: IdCard,
      badge: (_, a) => badge(alertsAt(a, '/soforler'), 'belge uyarısı') },
    { to: '/personel', label: 'Personeller', icon: UserRound, perm: 'accounting' },
    { to: '/sabit-odemeler', label: 'Sabit Ödemeler', icon: Repeat, perm: 'accounting' },
    { to: '/aktar', label: 'Veri Aktarımı', icon: FileSpreadsheet },
  ] },
  { title: 'Öz Mal', items: [
    { to: '/araclar', label: 'Araçlar', icon: Building2,
      badge: (_, a) => badge(alertsAt(a, '/araclar'), 'belge veya bakım uyarısı') },
    { to: '/giderler', label: 'Giderler', icon: Receipt,
      badge: (d) => badge(d?.pendingExpenseCount ?? 0, 'onay bekleyen masraf') },
  ] },
  { title: 'Banka & Çek', items: [
    { to: '/kasa-banka', label: 'Kasa / Banka', icon: Landmark, perm: 'accounting' },
    { to: '/cek-senet', label: 'Çek / Senet', icon: ScrollText,
      badge: (_, a) => badge(alertsAt(a, '/cek-senet'), 'vadesi yaklaşan çek/senet') },
  ] },
  { title: 'Rapor ve Yönetim', items: [
    { to: '/raporlar', label: 'Raporlar', icon: BarChart3, perm: 'accounting' },
    { to: '/ayarlar', label: 'Ayarlar', icon: Settings,
      badge: (_, a) => badge(alertsAt(a, '/ayarlar'), 'firma belgesi uyarısı') },
    { to: '/yardim', label: 'Yardım', icon: HelpCircle },
  ] },
]

/**
 * Yeni görünümün menüsü: pratikortam'ın sol menüsüyle aynı adlar ve sıra (docs/KOLAYLASTIRMA-UYGULAMA.md bölüm 2).
 * Adresler değişmez; menüden çıkan sayfalar (Tahsilatlar, Alınan Faturalar, İş Talepleri, Harita…) ilgili bölümün sekmesinden açılır.
 */
export const newNav: NavGroup[] = [
  { items: [
    { to: '/', label: 'Bugün', icon: Sun },
    { to: '/faturalar', label: 'e-Fatura', icon: FileText,
      badge: (d) => badge(d?.uninvoicedTripCount ?? 0, 'faturası kesilmemiş teslim sevkiyat') },
  ] },
  { title: 'Raporlar', items: [
    { to: '/cari/musteriler', label: 'Müşteriler Cari', icon: Scale, perm: 'accounting',
      badge: (_, a) => badge(alertsAt(a, '/musteriler'), 'vadesi geçen alacak') },
    { to: '/cari/tedarikciler', label: 'Tedarikçiler Cari', icon: Scale, perm: 'accounting',
      badge: (_, a) => badge(alertsAt(a, '/tedarikciler'), 'taşeron uyarısı') },
    { to: '/odemeler', label: 'Tedarikçi Ödemeleri', icon: HandCoins },
    { to: '/raporlar', label: 'Analiz', icon: BarChart3, perm: 'accounting' },
  ] },
  { items: [
    { to: '/seferler', label: 'Sevkiyatlar', icon: Truck,
      badge: (d) => badge(d?.activeTripCount ?? 0, 'bekleyen ve yoldaki sevkiyat') },
    { to: '/planlama', label: 'Planlama', icon: CalendarRange },
  ] },
  { title: 'Listeler', items: [
    { to: '/musteriler', label: 'Müşteri Listesi', icon: Users },
    { to: '/tedarikciler', label: 'Tedarikçi Listesi', icon: Handshake },
    { to: '/soforler', label: 'Şoför Listesi', icon: IdCard,
      badge: (_, a) => badge(alertsAt(a, '/soforler'), 'belge uyarısı') },
    { to: '/personel', label: 'Personel Listesi', icon: UserRound, perm: 'accounting' },
    { to: '/sabit-odemeler', label: 'Sabit Ödeme Listesi', icon: Repeat, perm: 'accounting' },
  ] },
  { title: 'Öz Mal', items: [
    { to: '/mazotlar', label: 'Mazotlar', icon: Fuel },
    { to: '/giderler', label: 'Giderler', icon: Receipt,
      badge: (d) => badge(d?.pendingExpenseCount ?? 0, 'onay bekleyen masraf') },
    { to: '/arac-masraflari', label: 'Araç Masrafları', icon: Wrench },
    { to: '/araclar', label: 'Araçlar', icon: Building2,
      badge: (_, a) => badge(alertsAt(a, '/araclar'), 'belge veya bakım uyarısı') },
  ] },
  { items: [
    { to: '/ayarlar', label: 'Yönetici', icon: ShieldCheck, perm: 'admin',
      badge: (_, a) => badge(alertsAt(a, '/ayarlar'), 'firma belgesi uyarısı') },
  ] },
  { title: 'Banka & Çek', items: [
    { to: '/kasa-banka', label: 'Bankalar', icon: Landmark, perm: 'accounting' },
    { to: '/cek-senet', label: 'Çekler', icon: ScrollText,
      badge: (_, a) => badge(alertsAt(a, '/cek-senet'), 'vadesi yaklaşan çek/senet') },
  ] },
]

