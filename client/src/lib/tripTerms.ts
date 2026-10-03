import { z } from 'zod'
import type { TripTerms } from '../api/types'

const optNum = z.number().nullable().optional().or(z.nan().transform(() => null))
const optText = z.string().trim().optional().or(z.literal('')).nullable()
const amount = z.number({ error: 'Geçerli bir tutar girin.' }).min(0, 'Tutar negatif olamaz.').or(z.nan().transform(() => 0))

/** Seferin ticari koşulları: KDV/tevkifat, komisyon, masraf, prim ve evrak alanları. */
export const termsSchema = z.object({
  saleVatRate: z.number(),
  saleWithholdingTenths: optNum,
  costVatRate: z.number(),
  costWithholdingTenths: optNum,
  commission: amount,
  commissionAccountId: optNum,
  commissionStatus: z.enum(['Pending', 'Received', 'DeductFromInvoice']),
  commissionInvoiced: z.boolean(),
  commissionVatIncluded: z.boolean(),
  extraCharge: amount,
  extraChargeInvoiced: z.boolean(),
  extraChargeVatIncluded: z.boolean(),
  extraChargeTaxNo: optText,
  extraChargeTitle: optText,
  driverBonus: amount,
  customerPays: z.boolean(),
  customerGroup: optText,
  deliveryDocumentNo: optText,
  deliveryDocumentApproved: z.boolean(),
  waybillNo: optText,
  eWaybillNo: optText,
  eWaybillDate: optText,
  loadingLatitude: optNum,
  loadingLongitude: optNum,
  deliveryLatitude: optNum,
  deliveryLongitude: optNum,
  distanceKm: z.number().int('Tam sayı girin.').min(0, 'Negatif olamaz.').nullable().optional().or(z.nan().transform(() => null)),
  hideCarrierPrice: z.boolean(),
  invoiceFooterNote: optText,
  showFooterNote: z.boolean(),
  deliveredBy: optText,
  paymentTerms: optText,
  externalRef: optText,
})

export type TermsValues = z.infer<typeof termsSchema>

export const emptyTerms: TermsValues = {
  saleVatRate: 20, saleWithholdingTenths: null, costVatRate: 20, costWithholdingTenths: null,
  commission: 0, commissionAccountId: null, commissionStatus: 'Pending', commissionInvoiced: false, commissionVatIncluded: true,
  extraCharge: 0, extraChargeInvoiced: false, extraChargeVatIncluded: true, extraChargeTaxNo: '', extraChargeTitle: '',
  driverBonus: 0, customerPays: false, customerGroup: '', deliveryDocumentNo: '', deliveryDocumentApproved: false,
  waybillNo: '', eWaybillNo: '', eWaybillDate: '', loadingLatitude: null, loadingLongitude: null,
  deliveryLatitude: null, deliveryLongitude: null, distanceKm: null, hideCarrierPrice: false,
  invoiceFooterNote: '', showFooterNote: false, deliveredBy: '', paymentTerms: '', externalRef: '',
}

/** API'den gelen koşulları forma çevirir (boş metinler '' olur). */
export function termsToForm(t?: TripTerms | null, keepRefs = true): TermsValues {
  if (!t) return { ...emptyTerms }
  const s = (v?: string | null) => v ?? ''
  return {
    ...emptyTerms, ...t,
    extraChargeTaxNo: s(t.extraChargeTaxNo), extraChargeTitle: s(t.extraChargeTitle), customerGroup: s(t.customerGroup),
    deliveryDocumentNo: keepRefs ? s(t.deliveryDocumentNo) : '', waybillNo: keepRefs ? s(t.waybillNo) : '',
    eWaybillNo: keepRefs ? s(t.eWaybillNo) : '', eWaybillDate: keepRefs ? s(t.eWaybillDate) : '',
    deliveryDocumentApproved: keepRefs ? t.deliveryDocumentApproved : false,
    invoiceFooterNote: s(t.invoiceFooterNote), deliveredBy: keepRefs ? s(t.deliveredBy) : '', paymentTerms: s(t.paymentTerms),
    externalRef: keepRefs ? s(t.externalRef) : '',
  }
}

/** Formdaki koşulları API'ye gönderilecek hale getirir. */
export function termsToApi(v: TermsValues): TripTerms {
  const n = (s?: string | null) => (s == null || s.trim() === '' ? null : s.trim())
  return {
    ...v,
    commission: v.commission || 0, extraCharge: v.extraCharge || 0, driverBonus: v.driverBonus || 0,
    commissionAccountId: v.commission > 0 ? v.commissionAccountId ?? null : null,
    extraChargeTaxNo: n(v.extraChargeTaxNo), extraChargeTitle: n(v.extraChargeTitle), customerGroup: n(v.customerGroup),
    deliveryDocumentNo: n(v.deliveryDocumentNo), waybillNo: n(v.waybillNo), eWaybillNo: n(v.eWaybillNo), eWaybillDate: n(v.eWaybillDate),
    invoiceFooterNote: n(v.invoiceFooterNote), deliveredBy: n(v.deliveredBy), paymentTerms: n(v.paymentTerms), externalRef: n(v.externalRef),
  } as TripTerms
}

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

/** Komisyon KDV oranı (aracılık hizmeti). */
export const COMMISSION_VAT_RATE = 20

/** KDV dahil tutarın KDV hariç karşılığı (sunucudaki TripProfit.NetOf ile aynı). */
export const netOf = (gross: number, vatRate: number) => (vatRate > 0 ? round2((gross || 0) * 100 / (100 + vatRate)) : gross || 0)

type MarginTerms = Pick<TermsValues, 'commission' | 'commissionVatIncluded' | 'driverBonus' | 'extraCharge' | 'extraChargeInvoiced' | 'extraChargeVatIncluded' | 'saleVatRate'>

/** Kâra giren komisyon (KDV hariç). */
export const commissionNet = (t: Pick<TermsValues, 'commission' | 'commissionVatIncluded'>) =>
  t.commissionVatIncluded ? netOf(t.commission, COMMISSION_VAT_RATE) : t.commission || 0

/** Kâra yük olan ek masraf (faturalanmıyorsa, KDV hariç). */
export const extraCost = (t: Pick<TermsValues, 'extraCharge' | 'extraChargeInvoiced' | 'extraChargeVatIncluded' | 'saleVatRate'>) =>
  t.extraChargeInvoiced ? 0 : t.extraChargeVatIncluded ? netOf(t.extraCharge, Number(t.saleVatRate) || 0) : t.extraCharge || 0

/** Kâra katkı (KDV hariç): satış − maliyet + komisyon − prim − (faturalanmayan) masraf. Sunucudaki TripProfit ile aynı. */
export function margin(sale: number, cost: number, t: MarginTerms) {
  return round2((sale || 0) - (cost || 0) + commissionNet(t) - (t.driverBonus || 0) - extraCost(t))
}

/** Koşul alanlarını içeren herhangi bir form (sefer ya da iş talebi). Çağıran taraf kendi kontrolünü bu tipe daraltır. */
export type TermsForm = { terms: TermsValues }

/** Tevkifat "otomatik" ise KDV dahil tutar bu sınırı aşınca 2/10 uygulanır (sunucudaki InvoiceCalculator ile aynı). */
export const AUTO_WITHHOLDING_LIMIT = 12_000

/**
 * "Otomatik" tevkifat: KDV dahil tutar 12.000 TL'yi aşarsa 2/10; alıcı şahıssa (TCKN) ya da KDV %0 ise yok.
 * Sunucudaki InvoiceCalculator.WithholdingFor ile aynı.
 */
export function autoWithholding(net: number, vatRate: number, buyerIsCompany = true) {
  const base = Math.round((net || 0) * 100) / 100
  const vat = Math.round(base * vatRate) / 100
  return buyerIsCompany && vatRate > 0 && base + vat > AUTO_WITHHOLDING_LIMIT ? 2 : 0
}

/** Tutar + KDV − tevkifat. withholdingTenths null ise otomatik. */
export function grossAmount(net: number, vatRate: number, withholdingTenths?: number | null) {
  const base = Math.round((net || 0) * 100) / 100
  const vat = Math.round(base * vatRate) / 100
  const tenths = withholdingTenths ?? autoWithholding(base, vatRate)
  const withholding = Math.round(vat * tenths * 10) / 100
  return { vat, withholding, total: base + vat - withholding }
}
