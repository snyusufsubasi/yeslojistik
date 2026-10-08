/** gg.aa.yyyy ↔ ISO tarih dönüşümleri (components/DateInput.tsx ve testler kullanır). */
export const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-07" → "07.10.2026" (boş/geçersizse ""). */
export function isoToTr(iso: string | null | undefined) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

/** "07.10.2026", "7.10.26", "07102026" → "2026-10-07"; geçersizse null. */
export function trToIso(text: string): string | null {
  const t = text.trim()
  if (!t) return null
  let d: number, m: number, y: number
  const parts = t.split(/[./\-\s]+/).filter(Boolean)
  if (parts.length === 3) {
    ;[d, m, y] = parts.map(Number)
    if (parts[2].length === 2) y += 2000
  } else if (/^\d{8}$/.test(t)) {
    d = Number(t.slice(0, 2)); m = Number(t.slice(2, 4)); y = Number(t.slice(4))
  } else return null
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return null
  if (d > new Date(y, m, 0).getDate()) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

