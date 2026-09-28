const money = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const money2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 45000 → "45.000 TL" */
export const tl = (v: number | null | undefined) => `${money.format(v ?? 0)} TL`
/** 45000 → "45.000,00 TL" */
export const tl2 = (v: number | null | undefined) => `${money2.format(v ?? 0)} TL`

/** "2026-09-06" → "06.09.2026" */
export function date(v: string | null | undefined) {
  if (!v) return '—'
  const [y, m, d] = v.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDaysIso(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function monthStartIso() {
  return todayIso().slice(0, 8) + '01'
}

export function yearStartIso() {
  return todayIso().slice(0, 5) + '01-01'
}

/** Bugünden kaç gün sonra (negatifse geçmiş). */
export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null
  const target = new Date(iso + 'T00:00:00').getTime()
  const now = new Date(todayIso() + 'T00:00:00').getTime()
  return Math.round((target - now) / 86_400_000)
}

export const longDate = (d = new Date()) =>
  d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' })

export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
