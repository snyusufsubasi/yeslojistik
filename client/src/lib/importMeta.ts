/** Genel içe aktarma sihirbazının ortak tanımları. */
export type WizardEntity = 'customers' | 'suppliers' | 'vehicles' | 'drivers'

export interface ImportRowInfo {
  row: number
  status: 'ok' | 'warning' | 'error' | 'duplicate'
  label?: string | null
  message?: string | null
}
export interface ImportResult {
  totalRows: number
  created: number
  skipped: number
  errors: { row: number; message: string }[]
  warnings: string[]
  dryRun: boolean
  rows?: ImportRowInfo[]
}

export const wizardEntities: { value: WizardEntity; label: string; one: string; list: string; perm: 'any' | 'operations'; hint: string }[] = [
  { value: 'customers', label: 'Müşteriler', one: 'müşteri', list: '/musteriler', perm: 'any',
    hint: 'Zorunlu: Ünvan. Eski borcu “Devir Bakiyesi” sütununa (açılış bakiyesi), tarihini “Devir Tarihi”ne yazın. VKN 10, TCKN 11 hane olmalı.' },
  { value: 'suppliers', label: 'Tedarikçiler', one: 'tedarikçi', list: '/tedarikciler', perm: 'any',
    hint: 'Zorunlu: Ünvan. Firmanın tedarikçiye olan eski borcunu “Devir Borcu” sütununa yazın. Kiralık araç sahibi taşeronlar buraya girer.' },
  { value: 'vehicles', label: 'Araçlar', one: 'araç', list: '/araclar', perm: 'operations',
    hint: 'Zorunlu: Plaka, Araç Tipi. Kiralık araçta “Araç Sahibi” sütununa tedarikçi ünvanını yazın (önce tedarikçileri aktarın).' },
  { value: 'drivers', label: 'Şoförler', one: 'şoför', list: '/soforler', perm: 'operations',
    hint: 'Zorunlu: Ad Soyad. Taşeronun şoförüyse “Tedarikçi” sütununa tedarikçi ünvanını yazın; kendi şoförünüzse boş bırakın.' },
]

export const statusInfo = {
  ok: { label: 'Hazır', tone: 'green' as const },
  warning: { label: 'Uyarı', tone: 'yellow' as const },
  error: { label: 'Hatalı', tone: 'red' as const },
  duplicate: { label: 'Tekrar', tone: 'gray' as const },
}

/** Hata raporu: Excel'de çift tıkla açılır (UTF-8 BOM, ; ayraç). Veri tarayıcıdan çıkmaz. */
export function errorReportCsv(rows: ImportRowInfo[]) {
  const cell = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [['Satır', 'Durum', 'Kayıt', 'Açıklama'].map(cell).join(';')]
  for (const r of rows.filter((x) => x.status !== 'ok'))
    lines.push([r.row, statusInfo[r.status].label, r.label, r.message].map(cell).join(';'))
  return '﻿' + lines.join('\r\n')
}

