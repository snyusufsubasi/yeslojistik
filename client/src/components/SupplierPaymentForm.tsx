import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { get } from '../api/client'
import type { PagedResult, SupplierPayment, Trip } from '../api/types'
import { applyServerErrors, idField, nullify, optStr, req } from '../lib/forms'
import { date, moneyHint, tl, todayIso } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { paymentMethodLabel } from '../lib/labels'
import { Button, Field, Modal } from './ui'
import { FormSelect } from './FormSelect'

const schema = z.object({
  supplierId: idField('Tedarikçi seçin.'),
  tripId: z.number().nullable().or(z.nan().transform(() => null)),
  date: req('Tarih zorunlu.'),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  method: z.enum(['Cash', 'BankTransfer', 'Check', 'CreditCard']),
  description: optStr,
})
type FormValues = z.infer<typeof schema>
const api = crud<SupplierPayment, FormValues>('supplier-payments')

/** Tedarikçiye (taşeron, servis, istasyon) ödeme. Sefer seçilirse ödeme önce o seferin borcunu kapatır. */
export function SupplierPaymentForm({ payment, defaults, onClose }: { payment: SupplierPayment | null; defaults?: Partial<FormValues>; onClose: () => void }) {
  const suppliers = useLookup('suppliers')
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: payment
      ? { ...payment, tripId: payment.tripId ?? null, description: payment.description ?? '' }
      : { date: todayIso(), method: 'BankTransfer', description: '', tripId: null, ...defaults },
  })
  const supplierId = useWatch({ control, name: 'supplierId' })
  const amount = useWatch({ control, name: 'amount' })
  const trips = useQuery({
    queryKey: ['trips', 'carrier', supplierId],
    queryFn: () => get<PagedResult<Trip>>('/trips', { carrierSupplierId: supplierId, pageSize: 100, sort: 'loadingDate', desc: true }),
    enabled: !!supplierId && !Number.isNaN(supplierId),
  })
  const save = useSave((v: FormValues) => payment ? api.update(payment.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['supplier-payments', 'suppliers'], success: payment ? 'Ödeme güncellendi.' : 'Ödeme kaydedildi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))

  return (
    <Modal open onClose={onClose} title={payment ? 'Ödeme Düzenle' : 'Ödeme Yap'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Tedarikçi" required error={errors.supplierId?.message}>
          <FormSelect control={control} name="supplierId" onValueChange={() => setValue('tripId', null)}
            options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.label }))} />
        </Field>
        <Field className="sm:col-span-2" label="Sefer (isteğe bağlı)" error={errors.tripId?.message}
          hint="Belirli bir seferin ödemesi ya da yükleme avansıysa seçin. Boşsa en eski borçlardan başlanarak düşülür.">
          <FormSelect control={control} name="tripId" placeholder="— Sefere bağlama —"
            options={(trips.data?.items ?? []).filter((t) => t.status !== 'Cancelled' && t.status !== 'Planned')
              .map((t) => ({ value: t.id, label: `${date(t.loadingDate)} · ${t.vehiclePlate} · ${t.loadingCity ?? t.loadingAddress} → ${t.deliveryCity ?? t.deliveryAddress} · ${tl(t.vehicleCost)}` }))} />
        </Field>
        <Field label="Tarih" required error={errors.date?.message}><input className="input" type="date" {...register('date')} /></Field>
        <Field label="Tutar (TL)" required error={errors.amount?.message} hint={moneyHint(amount)}>
          <input className="input text-right" type="number" step="0.01" min="0" inputMode="decimal" {...register('amount', { valueAsNumber: true })} />
        </Field>
        <Field label="Ödeme Yöntemi" error={errors.method?.message}>
          <select className="input" {...register('method')}>
            {Object.entries(paymentMethodLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Açıklama" error={errors.description?.message}><input className="input" {...register('description')} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
