import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Supplier, SupplierKind } from '../api/types'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { crud, useSave } from '../lib/hooks'
import { supplierKindLabel } from '../lib/labels'
import { CityOptions } from './CityOptions'
import { Button, Field, Modal } from './ui'

const schema = z.object({
  title: req('Tedarikçi ünvanı zorunlu.'),
  kind: z.enum(['Carrier', 'Service', 'Fuel', 'Other']),
  taxNumber: z.string().trim().regex(/^(\d{10}|\d{11})?$/, 'VKN 10, TCKN 11 haneli olmalı.'),
  taxOffice: optStr,
  phone: optStr,
  email: z.string().trim().email('Geçerli bir e-posta girin.').or(z.literal('')),
  address: optStr,
  city: optStr,
  district: optStr,
  iban: z.string().trim().regex(/^(TR[\d ]{24,32})?$/i, 'IBAN TR ile başlamalı (26 karakter).'),
  contactName: optStr,
  paymentTermDays: z.number({ error: 'Gün girin.' }).int().min(0, '0-365 gün').max(365, '0-365 gün'),
  notes: optStr,
  openingBalance: z.number({ error: 'Tutar girin.' }).min(0, 'Negatif olamaz.').or(z.nan().transform(() => 0)),
  openingBalanceDate: optStr,
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>
const api = crud<Supplier, FormValues>('suppliers')

export function SupplierForm({ supplier, onClose, onSaved, defaultKind = 'Carrier' }:
  { supplier: Supplier | null; onClose: () => void; onSaved?: (s: Supplier) => void; defaultKind?: SupplierKind }) {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: supplier?.title ?? '', kind: supplier?.kind ?? defaultKind, taxNumber: supplier?.taxNumber ?? '', taxOffice: supplier?.taxOffice ?? '',
      phone: supplier?.phone ?? '', email: supplier?.email ?? '', address: supplier?.address ?? '', city: supplier?.city ?? '',
      district: supplier?.district ?? '', iban: supplier?.iban ?? '', contactName: supplier?.contactName ?? '',
      paymentTermDays: supplier?.paymentTermDays ?? 30, notes: supplier?.notes ?? '', openingBalance: supplier?.openingBalance ?? 0,
      openingBalanceDate: supplier?.openingBalanceDate ?? '', isActive: supplier?.isActive ?? true,
    },
  })
  const save = useSave((v: FormValues) => supplier ? api.update(supplier.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['suppliers', 'vehicles', 'trips'], success: supplier ? 'Tedarikçi güncellendi.' : 'Tedarikçi eklendi.',
    onSuccess: (s) => { onSaved?.(s); onClose() },
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={supplier ? supplier.title : 'Yeni Tedarikçi'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Ünvan" required error={errors.title?.message}><input className="input" placeholder="Demir Nakliyat" {...register('title')} /></Field>
        <Field label="Tür" error={errors.kind?.message}>
          <select className="input" {...register('kind')}>
            {Object.entries(supplierKindLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Yetkili Kişi" error={errors.contactName?.message}><input className="input" {...register('contactName')} /></Field>
        <Field label="VKN / TCKN" error={errors.taxNumber?.message}><input className="input" inputMode="numeric" maxLength={11} {...register('taxNumber')} /></Field>
        <Field label="Vergi Dairesi" error={errors.taxOffice?.message}><input className="input" {...register('taxOffice')} /></Field>
        <Field label="Telefon" error={errors.phone?.message}><input className="input" type="tel" placeholder="0532 111 22 33" {...register('phone')} /></Field>
        <Field label="E-posta" error={errors.email?.message}><input className="input" type="email" {...register('email')} /></Field>
        <Field className="sm:col-span-2" label="IBAN" error={errors.iban?.message} hint="Ödeme yaparken kopyalamak için.">
          <input className="input font-mono" placeholder="TR00 0000 0000 0000 0000 0000 00" {...register('iban')} />
        </Field>
        <Field label="İl" error={errors.city?.message}><select className="input" {...register('city')}><CityOptions /></select></Field>
        <Field label="İlçe" error={errors.district?.message}><input className="input" {...register('district')} /></Field>
        <Field className="sm:col-span-2" label="Adres" error={errors.address?.message}><input className="input" {...register('address')} /></Field>
        <Field label="Ödeme Vadesi (gün)" required error={errors.paymentTermDays?.message} hint="Sefer tarihinden itibaren kaç günde ödenir.">
          <input className="input" type="number" min="0" max="365" {...register('paymentTermDays', { valueAsNumber: true })} />
        </Field>
        <div />
        <Field label="Devir Borcu (TL)" error={errors.openingBalance?.message} hint="Sisteme geçerken bu tedarikçiye olan borcunuz.">
          <input className="input text-right" type="number" step="0.01" min="0" {...register('openingBalance', { valueAsNumber: true })} />
        </Field>
        <Field label="Devir Tarihi" error={errors.openingBalanceDate?.message}><input className="input" type="date" {...register('openingBalanceDate')} /></Field>
        <Field className="sm:col-span-2" label="Notlar" error={errors.notes?.message}><textarea className="input min-h-16" {...register('notes')} /></Field>
        <label className="flex items-center gap-3 sm:col-span-2">
          <input type="checkbox" className="size-4 accent-brand-600" {...register('isActive')} />
          <span className="text-base text-slate-800">Aktif <span className="text-sm text-slate-500">(pasif tedarikçiler seçim listelerinde görünmez)</span></span>
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
