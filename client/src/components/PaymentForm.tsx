import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { get } from '../api/client'
import type { Invoice, PagedResult, Payment } from '../api/types'
import { applyServerErrors, idField, nullify, optStr, req } from '../lib/forms'
import { tl, todayIso } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { isInstrument, paymentMethodLabel } from '../lib/labels'
import { useAuth } from '../lib/auth'
import { Button, Field, Modal } from './ui'
import { FormSelect } from './FormSelect'
import { CustomerForm } from './CustomerForm'
import { ControlledChoice } from './Choice'
import { AmountInput, DateQuick, MoreFields } from './Inputs'
import { choices } from '../lib/choices'
import { paymentMethodIcon } from '../lib/icons'

const schema = z.object({
  customerId: idField('Müşteri seçin.'),
  invoiceId: z.number().nullable().or(z.nan().transform(() => null)),
  date: req('Tarih zorunlu.'),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  method: z.enum(['Cash', 'BankTransfer', 'Check', 'CreditCard', 'PromissoryNote']),
  description: optStr,
  cashAccountId: z.number().nullable().or(z.nan().transform(() => null)),
  instrumentNo: optStr,
  bank: optStr,
  instrumentDueDate: optStr,
}).refine((v) => !isInstrument(v.method) || !!v.instrumentDueDate, { path: ['instrumentDueDate'], message: 'Çek/senet için vade tarihini girin.' })
type FormValues = z.infer<typeof schema>
const api = crud<Payment, FormValues>('payments')

export function PaymentForm({ payment, defaults, onClose }: { payment: Payment | null; defaults?: Partial<FormValues>; onClose: () => void }) {
  const customers = useLookup('customers')
  const { register, handleSubmit, control, getValues, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: payment
      ? { ...payment, invoiceId: payment.invoiceId ?? null, description: payment.description ?? '', cashAccountId: payment.cashAccountId ?? null,
        instrumentNo: payment.instrumentNo ?? '', bank: payment.bank ?? '', instrumentDueDate: payment.instrumentDueDate ?? '' }
      : { date: todayIso(), method: 'BankTransfer', description: '', invoiceId: null, cashAccountId: null, instrumentNo: '', bank: '', instrumentDueDate: '', ...defaults },
  })
  const customerId = useWatch({ control, name: 'customerId' })
  const invoiceId = useWatch({ control, name: 'invoiceId' })
  const method = useWatch({ control, name: 'method' })
  const accounts = useLookup('cash-accounts')
  const { can } = useAuth()
  const invoices = useQuery({
    queryKey: ['invoices', 'open', customerId],
    queryFn: () => get<PagedResult<Invoice>>('/invoices', { customerId, status: 'Issued', pageSize: 200, sort: 'date', desc: false }),
    enabled: !!customerId && !Number.isNaN(customerId),
  })
  const selectable = invoices.data?.items.filter((i) => i.remaining > 0 || i.id === payment?.invoiceId) ?? []
  const openTotal = payment ? 0 : selectable.reduce((t, i) => t + i.remaining, 0)
  const date = useWatch({ control, name: 'date' })

  const save = useSave((v: FormValues) => payment ? api.update(payment.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['payments', 'invoices', 'customers'], success: payment ? 'Tahsilat güncellendi.' : 'Tahsilat kaydedildi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  const [newCustomer, setNewCustomer] = useState<string | null>(null)

  return (
    <Modal open onClose={onClose} title={payment ? 'Tahsilat Düzenle' : 'Tahsilat Ekle'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Hangi müşteriden?" required error={errors.customerId?.message}>
          <FormSelect control={control} name="customerId" onValueChange={() => setValue('invoiceId', null)} placeholder="Müşteri adı yazın veya seçin"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))}
            onCreate={(t) => setNewCustomer(t)} createLabel="Yeni müşteri olarak ekle" />
        </Field>
        {openTotal > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-[0.9375rem] text-amber-900 sm:col-span-2">
            <span>Açık faturalar: <b>{tl(openTotal)}</b> ({selectable.length} fatura)</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => { setValue('invoiceId', null); setValue('amount', openTotal, { shouldValidate: true }) }}>Tamamını gir</Button>
          </div>
        )}
        <Field label="Tutar (TL)" required error={errors.amount?.message}>
          <AmountInput control={control} name="amount" />
        </Field>
        <Field label="Tarih" required error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
        <Field group className="sm:col-span-2" label="Nasıl ödedi?" required error={errors.method?.message}>
          <ControlledChoice control={control} name="method" label="Ödeme Yöntemi" columns={5}
            options={choices(paymentMethodLabel, paymentMethodIcon)} />
        </Field>
        {isInstrument(method) ? <>
          <Field label={method === 'Check' ? 'Çek no' : 'Senet no'} error={errors.instrumentNo?.message}><input className="input" {...register('instrumentNo')} /></Field>
          {method === 'Check' && <Field label="Banka" error={errors.bank?.message}><input className="input" placeholder="Ziraat, Garanti..." {...register('bank')} /></Field>}
          <Field className="sm:col-span-2" label="Vade tarihi" required error={errors.instrumentDueDate?.message} hint="Portföye girer; Çek/Senet sayfasından tahsil, ciro ya da karşılıksız işaretlenir.">
            <DateQuick control={control} name="instrumentDueDate" quick="due" from={date} dueDays={[30, 60, 90, 120]} />
          </Field>
        </> : can('accounting') && (accounts.data?.length ?? 0) > 0 && (
          <Field className="sm:col-span-2" label="Para hangi hesaba girdi?" hint="İsteğe bağlı.">
            <FormSelect control={control} name="cashAccountId" placeholder="— Seçilmedi —" options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.label }))} />
          </Field>
        )}
        <div className="sm:col-span-2">
          <MoreFields title="Fatura seçimi ve açıklama (isteğe bağlı)" defaultOpen={!!payment?.invoiceId || !!defaults?.invoiceId} hasError={!!errors.invoiceId}>
            <Field label="Fatura" error={errors.invoiceId?.message}
              hint="Boş bırakılırsa tahsilat en eski açık faturalara sırayla dağıtılır.">
              <FormSelect control={control} name="invoiceId" placeholder="— Faturaya bağlama —"
                onValueChange={(id) => {
                  const inv = selectable.find((i) => i.id === id)
                  const amount = getValues('amount')
                  if (inv && (amount == null || Number.isNaN(amount))) setValue('amount', inv.remaining)
                }}
                options={selectable.map((i) => ({ value: i.id, label: `${i.invoiceNo} · Kalan ${tl(i.remaining)}` }))} />
            </Field>
            {invoiceId && selectable.find((i) => i.id === invoiceId) && (
              <p className="text-sm text-slate-600">Faturanın kalan tutarı: {tl(selectable.find((i) => i.id === invoiceId)!.remaining)}</p>
            )}
            <Field label="Açıklama" error={errors.description?.message}><input className="input" {...register('description')} /></Field>
          </MoreFields>
        </div>
        <button type="submit" className="hidden" />
      </form>
      {newCustomer !== null && <CustomerForm customer={null} initialTitle={newCustomer} onClose={() => setNewCustomer(null)}
        onSaved={(c) => { customers.refetch(); setValue('customerId', c.customer.id, { shouldValidate: true }) }} />}
    </Modal>
  )
}
