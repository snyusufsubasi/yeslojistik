import { z } from 'zod'
import type { Trip, TripUetds } from '../api/types'

/** Seferdeki U-ETDS hazırlığı alanları (ilçeler, yükleme saati, alıcı). Hepsi isteğe bağlıdır; hiçbir yere gönderilmez. */
export const uetdsSchema = z.object({
  loadingDistrict: z.string().trim().max(60, 'En fazla 60 karakter.'),
  deliveryDistrict: z.string().trim().max(60, 'En fazla 60 karakter.'),
  loadingTime: z.string().regex(/^(\d{2}:\d{2})?$/, 'Saat SS:DD biçiminde olmalı (ör. 08:30).'),
  consigneeTitle: z.string().trim().max(150, 'En fazla 150 karakter.'),
  consigneeTaxNumber: z.string().trim().regex(/^(\d{10}|\d{11})?$/, 'VKN 10, TCKN 11 hane olmalı.'),
})

export type UetdsForm = z.infer<typeof uetdsSchema>

export const emptyUetds: UetdsForm = { loadingDistrict: '', deliveryDistrict: '', loadingTime: '', consigneeTitle: '', consigneeTaxNumber: '' }

/** Sunucudaki değerden form değerine ("08:30:00" → "08:30"). */
export function uetdsToForm(u?: TripUetds | null): UetdsForm {
  if (!u) return { ...emptyUetds }
  return {
    loadingDistrict: u.loadingDistrict ?? '', deliveryDistrict: u.deliveryDistrict ?? '', loadingTime: u.loadingTime?.slice(0, 5) ?? '',
    consigneeTitle: u.consigneeTitle ?? '', consigneeTaxNumber: u.consigneeTaxNumber ?? '',
  }
}

/** Formdan API'ye: boşlar null olur. */
export function uetdsToApi(v: UetdsForm): TripUetds {
  const n = (s: string) => (s.trim() === '' ? null : s.trim())
  return {
    loadingDistrict: n(v.loadingDistrict), deliveryDistrict: n(v.deliveryDistrict), loadingTime: n(v.loadingTime),
    consigneeTitle: n(v.consigneeTitle), consigneeTaxNumber: n(v.consigneeTaxNumber),
  }
}

/** Sunucudaki alan adı (UetdsIssue.field) → sefer formundaki alan yolu. */
const nested = new Set(['loadingDistrict', 'deliveryDistrict', 'loadingTime', 'consigneeTitle', 'consigneeTaxNumber'])
export const uetdsFieldPath = (field: string) => (nested.has(field) ? `uetds.${field}` : field)

/** Panel yalnızca henüz teslim edilmemiş, iptal olmayan, eski sistemden aktarılmamış seferlerde gösterilir (sunucudaki kuralla aynı). */
export const uetdsApplies = (t: Pick<Trip, 'status' | 'isLegacy'>) =>
  !t.isLegacy && (t.status === 'Planned' || t.status === 'Loaded' || t.status === 'OnRoad')
