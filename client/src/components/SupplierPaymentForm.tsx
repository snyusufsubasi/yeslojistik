import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { get } from '../api/client'
import type { PagedResult, SupplierPayment, SupplierSummary, Trip } from '../api/types'
import { applyServerErrors, idField, nullify, optStr, req } from '../lib/forms'
import { date, tl, todayIso } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { paymentMethodLabel } from '../lib/labels'
import { Button, Field, Modal } from './ui'
import { FormSelect } from './FormSelect'
import { SupplierForm } from './SupplierForm'
import { ControlledChoice } from './Choice'
import { AmountInput, DateQuick, MoreFields } from './Inputs'
import { choices } from '../lib/choices'
import { paymentMethodIcon } from '../lib/icons'

const schema = z.object({
  supplierId: idField('Tedarikçi seçin.'),
  tripId: z.number().nullable().or(z.nan().transform(() => null)),
  date: req('Tarih zorunlu.'),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  method: z.enum(['Cash', 'BankTransfer', 'Check', 'CreditCard', 'PromissoryNote']),
  description: optStr,
  cashAccountId: z.number().nullable().or(z.nan().transform(() => null)),
})
type FormValues = z.infer<typeof schema>
const api = crud<SupplierPayment, FormValues>('supplier-payments')

/** Tedarikçiye (taşeron, servis, istasyon) ödeme. Sefer seçilirse ödeme önce o seferin borcunu kapatır. */
export function SupplierPaymentForm({ payment, defaults, onClose }: { payment: SupplierPayment | null; defaults?: Partial<FormValues>; onClose: () => void }) {
  const suppliers = useLookup('suppliers')
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: payment
      ? { ...payment, tripId: payment.tripId ?? null, description: payment.description ?? '', cashAccountId: payment.cashAccountId ?? null }
      : { date: todayIso(), method: 'BankTransfer', description: '', tripId: null, cashAccountId: null, ...defaults },
  })
  const supplierId = useWatch({ control, name: 'supplierId' })
  const accounts = useLookup('cash-accounts')
  const summary = useQuery({
    queryKey: ['suppliers', 'summary', supplierId],
    queryFn: () => get<SupplierSummary>(`/suppliers/${supplierId}`),
    enabled: !!supplierId && !Number.isNaN(supplierId),
  })
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
  const [newSupplier, setNewSupplier] = useState<string | null>(null)

  return (
    <Modal open onClose={onClose} title={payment ? 'Ödeme Düzenle' : 'Ödeme Yap'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Kime ödüyorsunuz?" required error={errors.supplierId?.message}>
          <FormSelect control={control} name="supplierId" onValueChange={() => setValue('tripId', null)} placeholder="Tedarikçi adı yazın veya seçin"
            options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.label }))}
            onCreate={(t) => setNewSupplier(t)} createLabel="Yeni tedarikçi olarak ekle" />
        </Field>
        {!payment && (summary.data?.balance ?? 0) > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-[0.9375rem] text-amber-900 sm:col-span-2">
            <span>Borcunuz: <b>{tl(summary.data!.balance)}</b>{summary.data!.overdueAmount > 0 && <> · vadesi geçen <b className="text-red-700">{tl(summary.data!.overdueAmount)}</b></>}</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => setValue('amount', summary.data!.balance, { shouldValidate: true })}>Tamamını gir</Button>
          </div>
        )}
        <Field label="Tutar (TL)" required error={errors.amount?.message}><AmountInput control={control} name="amount" /></Field>
        <Field label="Tarih" required error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
        <Field group className="sm:col-span-2" label="Nasıl ödediniz?" required error={errors.method?.message}>
          <ControlledChoice control={control} name="method" label="Ödeme Yöntemi" columns={5} options={choices(paymentMethodLabel, paymentMethodIcon)} />
        </Field>
        {(accounts.data?.length ?? 0) > 0 && (
          <Field className="sm:col-span-2" label="Para hangi hesaptan çıktı?" hint="İsteğe bağlı.">
            <FormSelect control={control} name="cashAccountId" placeholder="— Seçilmedi —" options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.label }))} />
          </Field>
        )}
        <div className="sm:col-span-2">
          <MoreFields title="Sefer seçimi ve açıklama (isteğe bağlı)" defaultOpen={!!payment?.tripId || !!defaults?.tripId} hasError={!!errors.tripId}>
            <Field label="Sefer" error={errors.tripId?.message}
              hint="Belirli bir seferin ödemesi ya da yükleme avansıysa seçin. Boşsa en eski borçlardan başlanarak düşülür.">
              <FormSelect control={control} name="tripId" placeholder="— Sefere bağlama —"
                options={(trips.data?.items ?? []).filter((t) => t.status !== 'Cancelled' && t.status !== 'Planned')
                  .map((t) => ({ value: t.id, label: `${date(t.loadingDate)} · ${t.vehiclePlate} · ${t.loadingCity ?? t.loadingAddress} → ${t.deliveryCity ?? t.deliveryAddress} · ${tl(t.vehicleCost)}` }))} />
            </Field>
            <Field label="Açıklama" error={errors.description?.message}><input className="input" {...register('description')} /></Field>
          </MoreFields>
        </div>
        {payment?.endorsedFromPaymentId && <p className="text-sm text-amber-700 sm:col-span-2">Bu ödeme bir çek/senet cirosundan geldi; Çek/Senet sayfasından yönetin.</p>}
        <button type="submit" className="hidden" />
      </form>
      {newSupplier !== null && <SupplierForm supplier={null} initialTitle={newSupplier} onClose={() => setNewSupplier(null)}
        onSaved={(s) => { suppliers.refetch(); setValue('supplierId', s.id, { shouldValidate: true }) }} />}
    </Modal>
  )
}
