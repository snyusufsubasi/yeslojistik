import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Customer, CustomerSummary } from '../api/types'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { crud, useSave } from '../lib/hooks'
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
})
type FormValues = z.infer<typeof schema>
const api = crud<CustomerSummary, FormValues>('customers')

export function CustomerForm({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved?: (c: CustomerSummary) => void }) {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: customer?.title ?? '', taxNumber: customer?.taxNumber ?? '', taxOffice: customer?.taxOffice ?? '',
      phone: customer?.phone ?? '', email: customer?.email ?? '', address: customer?.address ?? '', notes: customer?.notes ?? '',
      openingBalance: customer?.openingBalance ?? 0, openingBalanceDate: customer?.openingBalanceDate ?? '',
      notifyStatusByEmail: customer?.notifyStatusByEmail ?? false,
    },
  })
  const save = useSave((v: FormValues) => customer ? api.update(customer.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['customers'], success: customer ? 'Müşteri güncellendi.' : 'Müşteri eklendi.',
    onSuccess: (c) => { onSaved?.(c); onClose() },
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={customer ? customer.title : 'Yeni Müşteri'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Ünvan" required error={errors.title?.message}><input className="input" placeholder="Yıldız Mobilya" {...register('title')} /></Field>
        <Field label="VKN / TCKN" error={errors.taxNumber?.message}><input className="input" inputMode="numeric" maxLength={11} {...register('taxNumber')} /></Field>
        <Field label="Vergi Dairesi" error={errors.taxOffice?.message}><input className="input" {...register('taxOffice')} /></Field>
        <Field label="Telefon" error={errors.phone?.message}><input className="input" type="tel" placeholder="0216 555 44 33" {...register('phone')} /></Field>
        <Field label="E-posta" error={errors.email?.message}><input className="input" type="email" {...register('email')} /></Field>
        <Field className="sm:col-span-2" label="Adres" error={errors.address?.message}><input className="input" placeholder="İstanbul / Sultanbeyli" {...register('address')} /></Field>
        <Field label="Devir Bakiyesi (TL)" error={errors.openingBalance?.message} hint="Eski sistemden devreden borç. Cari bakiyeye eklenir.">
          <input className="input text-right" type="number" step="0.01" min="0" {...register('openingBalance', { valueAsNumber: true })} />
        </Field>
        <Field label="Devir Tarihi" error={errors.openingBalanceDate?.message}><input className="input" type="date" {...register('openingBalanceDate')} /></Field>
        <Field className="sm:col-span-2" label="Notlar" error={errors.notes?.message}><textarea className="input min-h-16" {...register('notes')} /></Field>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 sm:col-span-2">
          <input type="checkbox" className="mt-1 size-4 accent-brand-600" {...register('notifyStatusByEmail')} />
          <span>
            <span className="block text-[15px] font-medium text-slate-800">Sefer durumu değişince müşteriye e-posta gönder</span>
            <span className="block text-sm text-slate-600">Yük araca yüklendiğinde, yola çıktığında ve teslim edildiğinde yukarıdaki e-posta adresine takip linkiyle bilgi gider. Fiyat bilgisi gönderilmez. (Sunucuda e-posta ayarı yapılmış olmalı.)</span>
          </span>
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
