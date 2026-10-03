import { ClipboardList, FileInput, FileText, HandCoins, IdCard, Receipt, Truck, UserPlus, Wallet, Building2 } from 'lucide-react'
import type { Permission } from './auth'

/** `tone`: ikon kutusunun sakin rengi (Otoyol paletinin açık zemin + koyu yazı çiftleri; renkli degrade yok). */
export interface QuickAction { to: string; label: string; hint: string; icon: typeof Truck; tone: string; perm?: Permission; main?: boolean }

/** Sefer işleri yeşil, para girişi koyu yeşil, para çıkışı turuncu, gider kırmızı, fatura sarı, kayıt ekleme mavi. */
const tone = {
  trip: 'bg-accent-soft text-accent',
  moneyIn: 'bg-good-soft text-good',
  moneyOut: 'bg-warn-soft text-warn',
  expense: 'bg-bad-soft text-bad',
  invoice: 'bg-bill-soft text-bill',
  record: 'bg-info-soft text-info',
}

/** En sık yapılan işler: ana sayfadaki büyük kutular ve üst çubuktaki "+ Yeni" menüsü aynı listeyi kullanır. */
export const quickActions: QuickAction[] = [
  { to: '/is-talepleri?new=1', label: 'İş Talebi', hint: 'Araç ve şoför henüz belli değilse', icon: ClipboardList, tone: tone.trip, perm: 'operations', main: true },
  { to: '/seferler?new=1', label: 'Yeni Sefer', hint: 'Yük ve araç bilgisini gir', icon: Truck, tone: tone.trip, perm: 'operations', main: true },
  { to: '/tahsilatlar?new=1', label: 'Tahsilat Gir', hint: 'Müşteriden gelen para', icon: Wallet, tone: tone.moneyIn, perm: 'accounting', main: true },
  { to: '/odemeler?new=1', label: 'Taşerona Ödeme', hint: 'Araç sahibine yapılan ödeme', icon: HandCoins, tone: tone.moneyOut, perm: 'accounting', main: true },
  { to: '/giderler?new=1', label: 'Gider Ekle', hint: 'Yakıt, bakım, otoyol…', icon: Receipt, tone: tone.expense, main: true },
  { to: '/faturalar/yeni', label: 'Fatura Kes', hint: 'Teslim edilen seferler için', icon: FileText, tone: tone.invoice, perm: 'accounting', main: true },
  { to: '/alinan-faturalar?new=1', label: 'Alınan Fatura', hint: 'Taşeronun kestiği fatura', icon: FileInput, tone: tone.invoice, perm: 'accounting' },
  { to: '/musteriler?new=1', label: 'Müşteri Ekle', hint: 'Yeni firma kaydı', icon: UserPlus, tone: tone.record, main: true },
  { to: '/araclar?new=1', label: 'Araç Ekle', hint: 'Özmal ya da kiralık', icon: Building2, tone: tone.record, perm: 'operations' },
  { to: '/soforler?new=1', label: 'Şoför Ekle', hint: 'Personel ya da taşeron şoförü', icon: IdCard, tone: tone.record, perm: 'operations' },
]
