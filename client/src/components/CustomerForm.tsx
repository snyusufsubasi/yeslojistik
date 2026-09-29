import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Customer, CustomerSummary } from '../api/types'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { crud, useSave } from '../lib/hooks'
import { CityOptions } from './CityOptions'
import { Button, Field, Modal } from './ui'

const schema = z.object({
  title: req('Müşteri ünvanı zorunlu.'),
  taxNumber: z.string().trim().regex(/^(\d{10}|\d{11})?$/, 'VKN 10, TCKN 11 haneli olmalı.'),
  taxOffice: optStr,
  phone: optStr,
  email: z.string().trim().email('Geçerli bir e-posta girin.').or(z.literal('')),
  address: optStr,
  notes: optStr,
  openingBalance: z.number({ error: 'Tutar girin.' }).min(0, 'Negatif olamaz.').or(z.nan().transform(() => 0)),
  openingBalanceDate: optStr,
  notifyStatusByEmail: z.boolean(),
  city: optStr,
  district: optStr,
  contactName: optStr,
  isEInvoiceUser: z.boolean(),
  eInvoiceAlias: optStr,
  paymentTermDays: z.number().int().min(0, '0-365 gün').max(365, '0-365 gün').nullable().or(z.nan().transform(() => null)),
  creditLimit: z.number().min(0, 'Negatif olamaz.').nullable().or(z.nan().transform(() => null)),
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>
const api = crud<CustomerSummary, FormValues>('customers')

export function CustomerForm({ customer, onClose, onSaved, initialTitle }: { customer: Customer | null; onClose: () => void; onSaved?: (c: CustomerSummary) => void
  /** Seçim kutusunda yazılan ad: yeni müşterinin ünvanı olarak gelir. */
  initialTitle?: string }) {
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: customer?.title ?? initialTitle ?? '', taxNumber: customer?.taxNumber ?? '', taxOffice: customer?.taxOffice ?? '',
      phone: customer?.phone ?? '', email: customer?.email ?? '', address: customer?.address ?? '', notes: customer?.notes ?? '',
      openingBalance: customer?.openingBalance ?? 0, openingBalanceDate: customer?.openingBalanceDate ?? '',
      notifyStatusByEmail: customer?.notifyStatusByEmail ?? false,
      city: customer?.city ?? '', district: customer?.district ?? '', contactName: customer?.contactName ?? '',
      isEInvoiceUser: customer?.isEInvoiceUser ?? false, eInvoiceAlias: customer?.eInvoiceAlias ?? '',
      paymentTermDays: customer?.paymentTermDays ?? null, isActive: customer?.isActive ?? true, creditLimit: customer?.creditLimit ?? null,
    },
  })
  const save = useSave((v: FormValues) => customer ? api.update(customer.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['customers'], success: customer ? 'Müşteri güncellendi.' : 'Müşteri eklendi.',
    onSuccess: (c) => { onSaved?.(c); onClose() },
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  const isEInvoice = useWatch({ control, name: 'isEInvoiceUser' })
  return (
    <Modal open onClose={onClose} title={customer ? customer.title : 'Yeni Müşteri'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Ünvan" required error={errors.title?.message}><input className="input" placeholder="Yıldız Mobilya" {...register('title')} /></Field>
        <Field label="VKN / TCKN" error={errors.taxNumber?.message}><input className="input" inputMode="numeric" maxLength={11} {...register('taxNumber')} /></Field>
        <Field label="Vergi Dairesi" error={errors.taxOffice?.message}><input className="input" {...register('taxOffice')} /></Field>
        <Field label="Telefon" error={errors.phone?.message}><input className="input" type="tel" placeholder="0216 555 44 33" {...register('phone')} /></Field>
        <Field label="E-posta" error={errors.email?.message}><input className="input" type="email" {...register('email')} /></Field>
        <Field label="İl" error={errors.city?.message}><select className="input" {...register('city')}><CityOptions /></select></Field>
        <Field label="İlçe" error={errors.district?.message}><input className="input" placeholder="Sultanbeyli" {...register('district')} /></Field>
        <Field className="sm:col-span-2" label="Adres" error={errors.address?.message}><input className="input" placeholder="Mahalle, cadde, no" {...register('address')} /></Field>
        <Field label="Yetkili Kişi" error={errors.contactName?.message}><input className="input" {...register('contactName')} /></Field>
        <Field label="Vade (gün)" error={errors.paymentTermDays?.message} hint="Boşsa firma ayarındaki vade kullanılır.">
          <input className="input" type="number" min="0" max="365" {...register('paymentTermDays', { valueAsNumber: true })} />
        </Field>
        <Field label="Risk limiti (TL)" error={errors.creditLimit?.message} hint="Açık bakiye + faturalanmamış seferler bu tutarı aşınca uyarı verilir.">
          <input className="input text-right" type="number" min="0" step="0.01" inputMode="decimal" {...register('creditLimit', { valueAsNumber: true })} />
        </Field>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 sm:col-span-2">
          <input type="checkbox" className="mt-1 size-4 accent-brand-600" {...register('isEInvoiceUser')} />
          <span className="flex-1">
            <span className="block text-[0.9375rem] font-medium text-slate-800">e-Fatura mükellefi</span>
            <span className="block text-sm text-slate-600">İşaretliyse fatura e-Fatura, değilse e-Arşiv olarak kesilir.</span>
            {isEInvoice && <input className="input mt-2" placeholder="PK etiketi (ör. urn:mail:defaultpk@firma.com)" {...register('eInvoiceAlias')} />}
          </span>
        </label>
        <Field label="Devir Bakiyesi (TL)" error={errors.openingBalance?.message} hint="Eski sistemden devreden borç. Cari bakiyeye eklenir.">
          <input className="input text-right" type="number" step="0.01" min="0" {...register('openingBalance', { valueAsNumber: true })} />
        </Field>
        <Field label="Devir Tarihi" error={errors.openingBalanceDate?.message}><input className="input" type="date" {...register('openingBalanceDate')} /></Field>
        <Field className="sm:col-span-2" label="Notlar" error={errors.notes?.message}><textarea className="input min-h-16" {...register('notes')} /></Field>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 sm:col-span-2">
          <input type="checkbox" className="mt-1 size-4 accent-brand-600" {...register('notifyStatusByEmail')} />
          <span>
            <span className="block text-[0.9375rem] font-medium text-slate-800">Sefer durumu değişince müşteriye e-posta gönder</span>
            <span className="block text-sm text-slate-600">Yük araca yüklendiğinde, yola çıktığında ve teslim edildiğinde yukarıdaki e-posta adresine takip linkiyle bilgi gider. Fiyat bilgisi gönderilmez. (Sunucuda e-posta ayarı yapılmış olmalı.)</span>
          </span>
        </label>
        <label className="flex items-center gap-3 sm:col-span-2">
          <input type="checkbox" className="size-4 accent-brand-600" {...register('isActive')} />
          <span className="text-[0.9375rem] text-slate-800">Aktif müşteri <span className="text-sm text-slate-500">(pasif müşteriler yeni seferde listelenmez)</span></span>
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
