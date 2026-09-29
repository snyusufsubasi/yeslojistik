import { useController, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import type { CommissionStatus } from '../api/types'
import { useLookup } from '../lib/hooks'
import { commissionStatusLabel, options, vatRates, withholdingOptions } from '../lib/labels'
import { tl } from '../lib/format'
import { ControlledChoice } from './Choice'
import { Field } from './ui'
import { AmountInput, MoreFields } from './Inputs'
import { margin, type TermsForm, type TermsValues } from '../lib/tripTerms'

type AnyControl = Control<TermsForm>
type AnyRegister = UseFormRegister<TermsForm>
type AnyErrors = FieldErrors<TermsForm>

const vatOptions = vatRates.map((r) => ({ value: r, label: `%${r}` }))
const autoWithholding = [{ value: -1, label: 'Otomatik' }, ...withholdingOptions]

/** KDV oranı ve tevkifat seçimi (müşteri ya da taşeron fiyatı için). */
export function VatFields({ control, register, prefix, disabled }: { control: AnyControl; register: AnyRegister; prefix: 'sale' | 'cost'; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-sm text-slate-600">KDV
        <select className="input mt-1" disabled={disabled} {...register(`terms.${prefix}VatRate`, { valueAsNumber: true })}>
          {vatOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="text-sm text-slate-600">Tevkifat
        <WithholdingSelect control={control} name={`terms.${prefix}WithholdingTenths`} disabled={disabled} />
      </label>
    </div>
  )
}

/** Tevkifat: "Otomatik" (null) ya da n/10. */
function WithholdingSelect({ control, name, disabled }: { control: AnyControl; name: 'terms.saleWithholdingTenths' | 'terms.costWithholdingTenths'; disabled?: boolean }) {
  const { field } = useController({ control, name })
  const value = field.value as number | null | undefined
  return (
    <select className="input mt-1" disabled={disabled} value={value == null ? -1 : value} onBlur={field.onBlur}
      onChange={(e) => field.onChange(Number(e.target.value) === -1 ? null : Number(e.target.value))}>
      {autoWithholding.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

const commissionOptions = options(commissionStatusLabel) as { value: CommissionStatus; label: string }[]

/** Komisyon, masraf ve şoför primi (eski paneldeki "Komisyon Bilgileri"). */
export function CommissionFields({ control, register, errors }: { control: AnyControl; register: AnyRegister; errors: AnyErrors }) {
  const accounts = useLookup('cash-accounts')
  const commission = Number(useWatch({ control, name: 'terms.commission' })) || 0
  const extra = Number(useWatch({ control, name: 'terms.extraCharge' })) || 0
  const e = errors.terms ?? {}
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 text-sm font-medium text-navy-900">Komisyon, Masraf ve Prim</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Komisyon (TL)" hint="Taşerondan / şoförden alınan aracılık payı." error={e.commission?.message}>
          <AmountInput control={control} name="terms.commission" words={false} />
        </Field>
        <Field label="Şoför Primi (TL)" error={e.driverBonus?.message}>
          <AmountInput control={control} name="terms.driverBonus" words={false} />
        </Field>
      </div>
      {commission > 0 && (
        <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
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
      <div className="mt-3 grid grid-cols-2 gap-3">
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
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Masraf VKN/TCKN" error={e.extraChargeTaxNo?.message}><input className="input" inputMode="numeric" {...register('terms.extraChargeTaxNo')} /></Field>
          <Field label="Masraf Ünvanı" error={e.extraChargeTitle?.message}><input className="input" {...register('terms.extraChargeTitle')} /></Field>
        </div>
      )}
    </div>
  )
}

/** Evrak, fatura ve diğer sefer bilgileri (kapalı durur). */
export function DocumentFields({ register, errors }: { register: AnyRegister; errors: AnyErrors }) {
  const e = errors.terms ?? {}
  const hasError = Object.keys(e).length > 0
  return (
    <MoreFields title="Evrak, fatura notu ve diğer bilgiler" hasError={hasError}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teslim Evrak No" error={e.deliveryDocumentNo?.message}><input className="input" {...register('terms.deliveryDocumentNo')} /></Field>
        <Field label="İrsaliye No" error={e.waybillNo?.message}><input className="input" {...register('terms.waybillNo')} /></Field>
        <Field label="e-İrsaliye No" error={e.eWaybillNo?.message}><input className="input" {...register('terms.eWaybillNo')} /></Field>
        <Field label="e-İrsaliye Tarihi" error={e.eWaybillDate?.message}><input className="input" type="date" {...register('terms.eWaybillDate')} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" {...register('terms.deliveryDocumentApproved')} />Teslim evrakı onaylandı</label>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Firma Grup / Şantiye" hint="Müşterinin alt grubu veya proje no." error={e.customerGroup?.message}><input className="input" {...register('terms.customerGroup')} /></Field>
        <Field label="Mesafe (km)" error={e.distanceKm?.message}><input className="input" type="number" min="0" {...register('terms.distanceKm', { valueAsNumber: true })} /></Field>
        <Field label="Teslim Eden" error={e.deliveredBy?.message}><input className="input" {...register('terms.deliveredBy')} /></Field>
        <Field label="Ödeme Şekli" error={e.paymentTerms?.message}><input className="input" placeholder="Peşin, 30 gün…" {...register('terms.paymentTerms')} /></Field>
      </div>
      <Field label="Fatura Altı Not" error={e.invoiceFooterNote?.message}>
        <textarea className="input min-h-14" {...register('terms.invoiceFooterNote')} />
      </Field>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.showFooterNote')} />Notu faturaya yansıt</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.hideCarrierPrice')} />Sevk belgesinde taşeron fiyatı görünmesin</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4" {...register('terms.customerPays')} />Ödeme müşteride</label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Yükleme Enlem"><input className="input" type="number" step="any" {...register('terms.loadingLatitude', { valueAsNumber: true })} /></Field>
        <Field label="Yükleme Boylam"><input className="input" type="number" step="any" {...register('terms.loadingLongitude', { valueAsNumber: true })} /></Field>
        <Field label="Teslim Enlem"><input className="input" type="number" step="any" {...register('terms.deliveryLatitude', { valueAsNumber: true })} /></Field>
        <Field label="Teslim Boylam"><input className="input" type="number" step="any" {...register('terms.deliveryLongitude', { valueAsNumber: true })} /></Field>
      </div>
    </MoreFields>
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
      {terms.commission > 0 && row('Komisyon', terms.commission, '+ ')}
      {terms.extraCharge > 0 && !terms.extraChargeInvoiced && row('Masraf', terms.extraCharge, '− ')}
      {terms.driverBonus > 0 && row('Şoför primi', terms.driverBonus, '− ')}
      {expenses > 0 && row('Sefere bağlı giderler', expenses, '− ')}
      <div className="flex justify-between border-t border-slate-100 pt-1 font-medium">
        <span>Toplam Kazanç</span>
        <span className={total < 0 ? 'text-red-600' : 'text-emerald-700'}>{tl(total)}</span>
      </div>
    </div>
  )
}
