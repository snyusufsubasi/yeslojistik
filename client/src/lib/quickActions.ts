import { FileText, HandCoins, IdCard, Receipt, Truck, UserPlus, Wallet, Building2 } from 'lucide-react'
import type { Permission } from './auth'

export interface QuickAction { to: string; label: string; hint: string; icon: typeof Truck; tone: string; perm?: Permission; main?: boolean }

/** En sık yapılan işler: ana sayfadaki büyük kutular ve üst çubuktaki "+ Yeni" menüsü aynı listeyi kullanır. */
export const quickActions: QuickAction[] = [
  { to: '/is-talepleri?new=1', label: 'İş Talebi', hint: 'Araç ve şoför henüz belli değilse', icon: FileText, tone: 'from-cyan-500 to-cyan-700', perm: 'operations', main: true },
  { to: '/seferler?new=1', label: 'Yeni Sefer', hint: 'Yük ve araç bilgisini gir', icon: Truck, tone: 'from-brand-500 to-brand-700', perm: 'operations', main: true },
  { to: '/tahsilatlar?new=1', label: 'Tahsilat Gir', hint: 'Müşteriden gelen para', icon: Wallet, tone: 'from-emerald-500 to-emerald-700', perm: 'accounting', main: true },
  { to: '/odemeler?new=1', label: 'Taşerona Ödeme', hint: 'Araç sahibine yapılan ödeme', icon: HandCoins, tone: 'from-orange-500 to-orange-600', perm: 'accounting', main: true },
  { to: '/giderler?new=1', label: 'Gider Ekle', hint: 'Yakıt, bakım, otoyol…', icon: Receipt, tone: 'from-rose-500 to-rose-700', main: true },
  { to: '/faturalar/yeni', label: 'Fatura Kes', hint: 'Teslim edilen seferler için', icon: FileText, tone: 'from-violet-500 to-violet-700', perm: 'accounting', main: true },
  { to: '/musteriler?new=1', label: 'Müşteri Ekle', hint: 'Yeni firma kaydı', icon: UserPlus, tone: 'from-teal-500 to-teal-700', main: true },
  { to: '/araclar?new=1', label: 'Araç Ekle', hint: 'Özmal ya da kiralık', icon: Building2, tone: 'from-sky-500 to-sky-700', perm: 'operations' },
  { to: '/soforler?new=1', label: 'Şoför Ekle', hint: 'Personel ya da taşeron şoförü', icon: IdCard, tone: 'from-indigo-500 to-indigo-700', perm: 'operations' },
]
