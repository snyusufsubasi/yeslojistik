import { useState, type ReactNode } from 'react'
import { useController, useFormState, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import type { CommissionStatus } from '../api/types'
import { useLookup } from '../lib/hooks'
import { commissionStatusLabel, options, vatRateChoices, withholdingOptions } from '../lib/labels'
import { tl } from '../lib/format'
import { ControlledChoice } from './Choice'
import { Field } from './ui'
import { AmountInput } from './Inputs'
import { commissionNet, emptyTerms, extraCost, grossAmount, margin, type TermsForm, type TermsValues } from '../lib/tripTerms'

type AnyControl = Control<TermsForm>
type AnyRegister = UseFormRegister<TermsForm>
type AnyErrors = FieldErrors<TermsForm>

const autoWithholding = [{ value: -1, label: 'Otomatik' }, ...withholdingOptions]

/**
 * KDV oranı ve tevkifat (müşteri ya da taşeron fiyatı için). Varsayılan değerlerde tek satır özet görünür
 * ("KDV %20 · tevkifat otomatik · Ödenecek …"); "Değiştir" ile seçimler açılır. Değer varsayılandan farklıysa
 * ya da alanlarda hata varsa kendiliğinden açık gelir. Seçimler kapalıyken de formda kalır.
 */
export function VatFields({ control, register, prefix, disabled, net }: { control: AnyControl; register: AnyRegister; prefix: 'sale' | 'cost'; disabled?: boolean; net?: number }) {
  const rateName = `terms.${prefix}VatRate` as const
  const tenthsName = `terms.${prefix}WithholdingTenths` as const
  const rate = Number(useWatch({ control, name: rateName })) || 0
  const tenths = useWatch({ control, name: tenthsName }) as number | null | undefined
  const { errors } = useFormState({ control, name: [rateName, tenthsName] })
  const hasError = !!(errors.terms?.[`${prefix}VatRate`] || errors.terms?.[`${prefix}WithholdingTenths`])
  const isDefault = rate === emptyTerms[`${prefix}VatRate`] && tenths == null
  // Bir kez açılınca (elle ya da varsayılan dışı değerle) kullanıcı seçim yaparken kapanmaz.
  const [open, setOpen] = useState(!isDefault)
  const show = open || hasError || !isDefault
  const g = grossAmount(net ?? 0, rate, tenths)
  const side = prefix === 'cost' ? 'Maliyet' : 'Satış'
  const withholdingText = tenths == null ? `tevkifat otomatik${g.withholding > 0 ? ' (2/10)' : ''}`
    : tenths === 0 ? 'tevkifat yok' : `${tenths}/10 tevkifat`
  const totalText = !!net && rate > 0 ? `${prefix === 'cost' ? 'Ödenecek' : 'Alınacak'} ${tl(g.total)}` : null
  return (
    <div className="mt-2 space-y-2">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-slate-600">
        <span>KDV %{rate} · {withholdingText}{totalText && <> · <b className="font-medium text-slate-800">{totalText}</b></>}</span>
        {!show && !disabled && (
          <button type="button" onClick={() => setOpen(true)} aria-label={`${side} KDV ve tevkifatını değiştir`}
            className="font-medium text-accent underline underline-offset-2 hover:no-underline">Değiştir</button>
        )}
      </p>
      <div hidden={!show} className="grid grid-cols-2 gap-2">
        <label className="text-sm text-slate-600">KDV
          <select className="input mt-1" aria-label={`${side} KDV oranı`} disabled={disabled} {...register(rateName, { valueAsNumber: true })}>
            {vatRateChoices(rate).map((r) => <option key={r} value={r}>%{r}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-600">Tevkifat
          <WithholdingSelect control={control} name={tenthsName} disabled={disabled} ariaLabel={`${side} tevkifatı`} />
        </label>
      </div>
    </div>
  )
}

/** Tevkifat: "Otomatik" (null) ya da n/10. */
function WithholdingSelect({ control, name, disabled, ariaLabel }: { control: AnyControl; name: 'terms.saleWithholdingTenths' | 'terms.costWithholdingTenths'; disabled?: boolean; ariaLabel?: string }) {
  const { field } = useController({ control, name })
  const value = field.value as number | null | undefined
  return (
    <select className="input mt-1" aria-label={ariaLabel} disabled={disabled} value={value == null ? -1 : value} onBlur={field.onBlur}
      onChange={(e) => field.onChange(Number(e.target.value) === -1 ? null : Number(e.target.value))}>
      {autoWithholding.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

const commissionOptions = options(commissionStatusLabel) as { value: CommissionStatus; label: string }[]

/** Komisyon, masraf ve şoför primi (eski paneldeki "Komisyon Bilgileri"). Sefer formunda katlanır bölümün içinde durur. */
export function CommissionFields({ control, register, errors }: { control: AnyControl; register: AnyRegister; errors: AnyErrors }) {
  const accounts = useLookup('cash-accounts')
  const commission = Number(useWatch({ control, name: 'terms.commission' })) || 0
  const extra = Number(useWatch({ control, name: 'terms.extraCharge' })) || 0
  const e = errors.terms ?? {}
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Komisyon (TL)" hint="Taşerondan / şoförden alınan aracılık payı." error={e.commission?.message}>
          <AmountInput control={control} name="terms.commission" words={false} />
        </Field>
        <Field label="Şoför Primi (TL)" error={e.driverBonus?.message}>
          <AmountInput control={control} name="terms.driverBonus" words={false} />
        </Field>
      </div>
      {commission > 0 && (
        <div className="space-y-3 rounded-lg bg-slate-50 p-3">
          <ControlledChoice control={control} name="terms.commissionStatus" label="Komisyon durumu" variant="chips" options={commissionOptions} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alındığı Hesap" hint="Boşsa nakit.">
              <select className="input" {...register('terms.commissionAccountId', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}>
                <option value="">Nakit</option>
                {(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </Field>
            <div className="space-y-2 pt-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.commissionInvoiced')} />Faturalandır</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.commissionVatIncluded')} />KDV dahil</label>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Masraf (TL)" hint="Hamaliye, bekleme, köprü vb." error={e.extraCharge?.message}>
          <AmountInput control={control} name="terms.extraCharge" words={false} />
        </Field>
        {extra > 0 && (
          <div className="space-y-2 pt-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.extraChargeInvoiced')} />Müşteriye faturalandır</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.extraChargeVatIncluded')} />KDV dahil</label>
          </div>
        )}
      </div>
      {extra > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Masraf VKN/TCKN" error={e.extraChargeTaxNo?.message}><input className="input" inputMode="numeric" {...register('terms.extraChargeTaxNo')} /></Field>
          <Field label="Masraf Ünvanı" error={e.extraChargeTitle?.message}><input className="input" {...register('terms.extraChargeTitle')} /></Field>
        </div>
      )}
    </div>
  )
}

/**
 * Evrak ve fatura bilgileri (sefer formundaki "Ayrıntılar" bölümünün "Belgeler" kısmı).
 * `lead` en başa (ör. müşteri referans no), `carrier` evrak numaralarının ardına (kiralık araçta taşeron faturası) eklenir.
 */
export function DocumentFields({ register, errors, groups, lead, carrier }: { register: AnyRegister; errors: AnyErrors; groups?: string[]; lead?: ReactNode; carrier?: ReactNode }) {
  const e = errors.terms ?? {}
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {lead}
        <Field label="Firma Grup / Şantiye" hint="Müşterinin alt grubu veya proje no." error={e.customerGroup?.message}>
          <input className="input" list="customer-groups" {...register('terms.customerGroup')} />
          <datalist id="customer-groups">{(groups ?? []).map((g) => <option key={g} value={g} />)}</datalist>
        </Field>
        <Field label="Teslim Evrak No" error={e.deliveryDocumentNo?.message}><input className="input" {...register('terms.deliveryDocumentNo')} /></Field>
        <Field label="İrsaliye No" error={e.waybillNo?.message}><input className="input" {...register('terms.waybillNo')} /></Field>
        <Field label="e-İrsaliye No" error={e.eWaybillNo?.message}><input className="input" {...register('terms.eWaybillNo')} /></Field>
        <Field label="e-İrsaliye Tarihi" error={e.eWaybillDate?.message}><input className="input" type="date" {...register('terms.eWaybillDate')} /></Field>
        <Field label="Teslim Eden" error={e.deliveredBy?.message}><input className="input" {...register('terms.deliveredBy')} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" className="size-4" {...register('terms.deliveryDocumentApproved')} />Teslim evrakı onaylandı</label>
      </div>
      {carrier}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ödeme Şekli" error={e.paymentTerms?.message}><input className="input" placeholder="Peşin, 30 gün…" {...register('terms.paymentTerms')} /></Field>
        <Field className="sm:col-span-2" label="Fatura Altı Not" error={e.invoiceFooterNote?.message}>
          <textarea className="input min-h-14" {...register('terms.invoiceFooterNote')} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.showFooterNote')} />Notu faturaya yansıt</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.hideCarrierPrice')} />Sevk belgesinde taşeron fiyatı görünmesin</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.customerPays')} />Ödeme müşteride</label>
      </div>
    </div>
  )
}

/** Mesafe ve elle girilen koordinatlar ("Ayrıntılar" bölümünün en sonundaki "Konum" kısmı). */
export function LocationFields({ register, errors }: { register: AnyRegister; errors: AnyErrors }) {
  const e = errors.terms ?? {}
  return (
    <div className="space-y-4">
      <Field className="sm:max-w-[50%]" label="Mesafe (km)" error={e.distanceKm?.message}><input className="input" type="number" min="0" {...register('terms.distanceKm', { valueAsNumber: true })} /></Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Yükleme Enlem" error={e.loadingLatitude?.message}><input className="input" type="number" step="any" {...register('terms.loadingLatitude', { valueAsNumber: true })} /></Field>
        <Field label="Yükleme Boylam" error={e.loadingLongitude?.message}><input className="input" type="number" step="any" {...register('terms.loadingLongitude', { valueAsNumber: true })} /></Field>
        <Field label="Teslim Enlem" error={e.deliveryLatitude?.message}><input className="input" type="number" step="any" {...register('terms.deliveryLatitude', { valueAsNumber: true })} /></Field>
        <Field label="Teslim Boylam" error={e.deliveryLongitude?.message}><input className="input" type="number" step="any" {...register('terms.deliveryLongitude', { valueAsNumber: true })} /></Field>
      </div>
    </div>
  )
}

/** Eski paneldeki "Kazanç Tablosu": ara kazanç, komisyon, masraf, prim ve toplam. */
export function MarginSummary({ sale, cost, terms, expenses }: { sale: number; cost: number; terms: TermsValues; expenses: number }) {
  const gross = (sale || 0) - (cost || 0)
  const total = margin(sale, cost, terms) - expenses
  const row = (label: string, v: number, sign = '') => (
    <div className="flex justify-between"><span className="text-slate-600">{label}</span><span>{sign}{tl(v)}</span></div>
  )
  return (
    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-sm">
      {row('Ara kazanç (satış − maliyet)', gross)}
      {terms.commission > 0 && row('Komisyon (KDV hariç)', commissionNet(terms), '+ ')}
      {terms.extraCharge > 0 && !terms.extraChargeInvoiced && row('Masraf (KDV hariç)', extraCost(terms), '− ')}
      {terms.driverBonus > 0 && row('Şoför primi', terms.driverBonus, '− ')}
      {expenses > 0 && row('Sevkiyata bağlı giderler', expenses, '− ')}
      <div className="flex justify-between border-t border-slate-100 pt-1 font-medium">
        <span>Toplam Kazanç</span>
        <span className={total < 0 ? 'text-red-600' : 'text-emerald-700'}>{tl(total)}</span>
      </div>
    </div>
  )
}
