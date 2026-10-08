import type { TripTemplate } from '../api/types'
import { emptyTerms } from './tripTerms'
import { emptyUetds } from './tripUetds'

export const emptyOps = { transportMode: '', trailerType: '', problemReason: '', problemNote: '' }

/** Şablondan yeni sevkiyat formunun başlangıç değerleri (tarih bugün; durum, belge ve fatura numaraları boş). */
export function templateToDefaults(t: TripTemplate): Record<string, unknown> {
  const s = (v?: string | null) => v ?? ''
  return {
    customerId: t.customerId ?? undefined, vehicleId: t.vehicleId ?? undefined, driverId: t.driverId ?? undefined,
    loadingCity: s(t.loadingCity), loadingAddress: t.loadingAddress, loadingContact: s(t.loadingContact),
    deliveryCity: s(t.deliveryCity), deliveryAddress: t.deliveryAddress, deliveryContact: s(t.deliveryContact),
    cargoType: s(t.cargoType), cargoUnit: s(t.cargoUnit), cargoQuantity: t.cargoQuantity ?? null, cargoWeightKg: t.cargoWeightKg ?? null,
    salePrice: t.salePrice ?? undefined, vehicleCost: t.vehicleCost ?? undefined, description: s(t.description),
    terms: { ...emptyTerms, paymentTerms: s(t.paymentTerms) },
    uetds: { ...emptyUetds, loadingDistrict: s(t.loadingDistrict), deliveryDistrict: s(t.deliveryDistrict) },
    ops: { ...emptyOps, transportMode: s(t.transportMode), trailerType: s(t.trailerType) },
  }
}

