import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { get } from '../api/client'
import type { Invoice, PagedResult, Payment } from '../api/types'
import { applyServerErrors, idField, nullify, optStr, req } from '../lib/forms'
import { tl, todayIso } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { paymentMethodLabel } from '../lib/labels'
import { Button, Field, Modal } from './ui'

const schema = z.object({
  customerId: idField('Müşteri seçin.'),
  invoiceId: z.number().nullable().or(z.nan().transform(() => null)),
  date: req('Tarih zorunlu.'),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  method: z.enum(['Cash', 'BankTransfer', 'Check', 'CreditCard']),
  description: optStr,
})
type FormValues = z.infer<typeof schema>
const api = crud<Payment, FormValues>('payments')

export function PaymentForm({ payment, defaults, onClose }: { payment: Payment | null; defaults?: Partial<FormValues>; onClose: () => void }) {
  const customers = useLookup('customers')
  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: payment
      ? { ...payment, invoiceId: payment.invoiceId ?? null, description: payment.description ?? '' }
      : { date: todayIso(), method: 'BankTransfer', description: '', invoiceId: null, ...defaults },
  })
  const customerId = watch('customerId')
  const invoiceId = watch('invoiceId')
  const invoices = useQuery({
    queryKey: ['invoices', 'open', customerId],
    queryFn: () => get<PagedResult<Invoice>>('/invoices', { customerId, status: 'Issued', pageSize: 200, sort: 'date', desc: false }),
    enabled: !!customerId && !Number.isNaN(customerId),
  })
  const selectable = invoices.data?.items.filter((i) => i.remaining > 0 || i.id === payment?.invoiceId) ?? []

  const save = useSave((v: FormValues) => payment ? api.update(payment.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['payments', 'invoices', 'customers'], success: payment ? 'Tahsilat güncellendi.' : 'Tahsilat kaydedildi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))

  return (
    <Modal open onClose={onClose} title={payment ? 'Tahsilat Düzenle' : 'Tahsilat Ekle'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Müşteri" required error={errors.customerId?.message}>
          <select className="input" {...register('customerId', { valueAsNumber: true, onChange: () => setValue('invoiceId', null) })}>
            <option value="">Seçiniz</option>
            {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field className="sm:col-span-2" label="Fatura" error={errors.invoiceId?.message}
          hint="Boş bırakılırsa tahsilat en eski açık faturalara sırayla dağıtılır.">
          <select className="input" {...register('invoiceId', {
            valueAsNumber: true,
            onChange: (e) => {
              const inv = selectable.find((i) => i.id === Number(e.target.value))
              if (inv && !watch('amount')) setValue('amount', inv.remaining)
            },
          })}>
            <option value="">— Faturaya bağlama —</option>
            {selectable.map((i) => <option key={i.id} value={i.id}>{i.invoiceNo} · Kalan {tl(i.remaining)}</option>)}
          </select>
        </Field>
        <Field label="Tarih" required error={errors.date?.message}><input className="input" type="date" {...register('date')} /></Field>
        <Field label="Tutar (TL)" required error={errors.amount?.message}>
          <input className="input text-right" type="number" step="0.01" min="0" inputMode="decimal" {...register('amount', { valueAsNumber: true })} />
        </Field>
        <Field label="Ödeme Yöntemi" error={errors.method?.message}>
          <select className="input" {...register('method')}>
            {Object.entries(paymentMethodLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Açıklama" error={errors.description?.message}><input className="input" {...register('description')} /></Field>
        {invoiceId && selectable.find((i) => i.id === invoiceId) && (
          <p className="text-xs text-slate-500 sm:col-span-2">Faturanın kalan tutarı: {tl(selectable.find((i) => i.id === invoiceId)!.remaining)}</p>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
