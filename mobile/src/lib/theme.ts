export const colors = {
  navy: '#0b2a55',
  navy2: '#123a70',
  brand: '#1570cd',
  bg: '#f1f5f9',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
  green: '#059669',
  amber: '#d97706',
  red: '#dc2626',
  blueSoft: '#dbeafe',
}

export const statusLabel = {
  Planned: 'Planlandı',
  Loaded: 'Yüklendi',
  OnRoad: 'Yolda',
  Delivered: 'Teslim Edildi',
  Cancelled: 'İptal',
} as const

/** Duruma geçiş butonlarının metni */
export const statusAction = {
  Planned: 'Planlandı',
  Loaded: 'Yükü Aldım',
  OnRoad: 'Yola Çıktım',
  Delivered: 'Teslim Ettim',
  Cancelled: 'İptal',
} as const

export const statusColor = {
  Planned: colors.brand,
  Loaded: '#0d9488',
  OnRoad: colors.amber,
  Delivered: colors.green,
  Cancelled: colors.muted,
} as const

export function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}
