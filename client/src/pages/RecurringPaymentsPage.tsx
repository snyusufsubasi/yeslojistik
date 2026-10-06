import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { CalendarClock, CheckCircle2, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import { del, get, post, put } from '../api/client'
import type { ExpenseCategory, RecurringPayment } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { Badge, Button, ConfirmDialog, Card, Field, IconButton, Modal, StatCard } from '../components/ui'
import { PageShell } from '../components/shell/PageShell'
import { ControlledChoice, ControlledToggle } from '../components/Choice'
import { AmountInput, DateQuick } from '../components/Inputs'
import { applyServerErrors, nullify, optId, optStr, req } from '../lib/forms'
import { date, tl, todayIso } from '../lib/format'
import { useLookup, useSave } from '../lib/hooks'
import { expenseCategoryLabel } from '../lib/labels'
import { expenseCategoryIcon } from '../lib/icons'
import { choices } from '../lib/choices'

const thisMonth = () => todayIso().slice(0, 7)
const categories: ExpenseCategory[] = ['Other', 'Insurance', 'Tax', 'Maintenance', 'Fuel', 'Toll']

/** Eski paneldeki "Sabit Ödeme Listesi": kira, sigorta taksiti gibi her ay tekrarlanan ödemeler; "Ödendi" deyince gider olur. */
export default function RecurringPaymentsPage() {
  const [month, setMonth] = useState(thisMonth)
  const list = useQuery({ queryKey: ['recurring-payments', month], queryFn: () => get<RecurringPayment[]>('/recurring-payments', { month }) })
  const [editing, setEditing] = useState<RecurringPayment | 'new' | null>(null)
  const [paying, setPaying] = useState<RecurringPayment | null>(null)
  const rows = list.data ?? []
  const active = rows.filter((r) => r.isActive)
  const unpaid = active.filter((r) => !r.paidDate)
  const today = todayIso()

  const columns: Column<RecurringPayment>[] = [
    { key: 'day', header: 'Ödeme günü', render: (r) => <span className="whitespace-nowrap">{date(r.dueDate)}</span> },
    { key: 'title', header: 'Başlık', render: (r) => <>
      <span className="font-medium text-slate-900">{r.title}</span>{!r.isActive && <span className="ml-2"><Badge tone="gray">Pasif</Badge></span>}
      <span className="block text-sm text-slate-500">{[expenseCategoryLabel[r.category], r.detail, r.cashAccountName].filter(Boolean).join(' · ')}</span>
    </> },
    { key: 'amount', header: 'Tutar', align: 'right', render: (r) => tl(r.amount) },
    { key: 'status', header: 'Bu ay', render: (r) => r.paidDate
      ? <Badge tone="green">Ödendi · {date(r.paidDate)}</Badge>
      : !r.isActive ? <span className="text-slate-400">—</span>
      : r.dueDate < today ? <Badge tone="red">Gecikti</Badge> : <Badge tone="orange">Bekliyor</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        {r.isActive && !r.paidDate && <Button size="sm" variant="secondary" icon={<CheckCircle2 className="size-4" />} onClick={() => setPaying(r)}>Ödendi</Button>}
        <IconButton write label="Düzenle" onClick={() => setEditing(r)}><Pencil className="size-4" /></IconButton>
      </div>
    ) },
  ]

  return (
    <>
      <PageShell title="Sabit Ödemeler" subtitle="Her ay tekrarlanan ödemeler. “Ödendi” deyince gider olarak yazılır, seçilen hesaptan düşer."
        primary={<Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Sabit Ödeme Ekle</Button>}
        actions={<Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Sabit Ödeme Ekle</Button>}>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Bu ayın toplamı" value={tl(active.reduce((s, r) => s + r.amount, 0))} icon={<Repeat />} color="blue" sub={`${active.length} kalem`} />
        <StatCard title="Ödenmeyen" value={tl(unpaid.reduce((s, r) => s + r.amount, 0))} icon={<CalendarClock />} color="orange" sub={`${unpaid.length} kalem`} />
        <StatCard title="Ödenen" value={tl(rows.reduce((s, r) => s + (r.paidAmount ?? 0), 0))} icon={<CheckCircle2 />} color="green" />
      </div>
      <Card bodyClassName="p-0" title="Ödeme listesi" icon={<Repeat className="size-4" />}
        actions={<label className="input flex items-center gap-2"><span className="shrink-0 text-sm text-slate-500">Ay</span>
          <input type="month" aria-label="Ay" className="min-w-0 flex-1 bg-transparent outline-none" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} /></label>}>
        <DataTable columns={columns} rows={rows} loading={list.isFetching} error={list.error} onRetry={list.refetch} rowKey={(r) => r.id} onRowClick={setEditing}
          empty="Henüz sabit ödeme yok. Kira, sigorta taksiti, muhasebe ücreti gibi her ay ödenenleri ekleyin."
          mobileCard={(r) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><div className="truncate font-medium">{r.title}</div><div className="text-sm text-slate-500">{date(r.dueDate)} · {tl(r.amount)}</div></div>
              {r.paidDate ? <Badge tone="green">Ödendi</Badge> : <Badge tone="orange">Bekliyor</Badge>}
            </div>
          )} />
      </Card>
      </PageShell>
      {editing && <RecurringForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {paying && <PayForm item={paying} month={month} onClose={() => setPaying(null)} />}
    </>
  )
}

const schema = z.object({
  title: req('Başlık zorunlu.'),
  detail: optStr,
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  dueDay: z.number({ error: 'Gün girin.' }).int().min(1, '1 ile 28 arası').max(28, '1 ile 28 arası'),
  category: z.enum(['Fuel', 'Maintenance', 'Toll', 'DriverAllowance', 'DriverAdvance', 'Tire', 'Insurance', 'Tax', 'Other']),
  cashAccountId: optId,
  isActive: z.boolean(),
})
type Values = z.infer<typeof schema>

function AccountSelect({ register }: { register: ReturnType<typeof useForm<{ cashAccountId?: number | null }>>['register'] }) {
  const accounts = useLookup('cash-accounts')
  return (
    <select className="input" {...register('cashAccountId', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}>
      <option value="">Seçilmedi</option>
      {(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
    </select>
  )
}

function RecurringForm({ item, onClose }: { item: RecurringPayment | null; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: item
      ? { title: item.title, detail: item.detail ?? '', amount: item.amount, dueDay: item.dueDay, category: item.category, cashAccountId: item.cashAccountId, isActive: item.isActive }
      : { title: '', detail: '', dueDay: 1, category: 'Other', cashAccountId: null, isActive: true },
  })
  const save = useSave((v: Values) => item ? put(`/recurring-payments/${item.id}`, nullify(v)) : post('/recurring-payments', nullify(v)),
    { invalidate: ['recurring-payments'], success: 'Sabit ödeme kaydedildi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const remove = useSave(() => del(`/recurring-payments/${item!.id}`), { invalidate: ['recurring-payments'], success: 'Sabit ödeme silindi.', onSuccess: onClose })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={item ? 'Sabit Ödeme Düzenle' : 'Sabit Ödeme Ekle'} size="sm"
      footer={<>
        {item && <Button variant="danger" className="mr-auto" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>Sil</Button>}
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button>
      </>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Başlık" required error={errors.title?.message}><input className="input" placeholder="Ofis kirası, kasko taksiti" {...register('title')} /></Field>
        <Field label="Aylık tutar" required error={errors.amount?.message}><AmountInput control={control} name="amount" /></Field>
        <Field label="Ayın kaçında ödenir?" error={errors.dueDay?.message}><input className="input" type="number" min={1} max={28} {...register('dueDay', { valueAsNumber: true })} /></Field>
        <Field group label="Gider türü">
          <ControlledChoice control={control} name="category" label="Gider türü" columns={3}
            options={choices(Object.fromEntries(categories.map((c) => [c, expenseCategoryLabel[c]])) as Record<ExpenseCategory, string>, expenseCategoryIcon)} />
        </Field>
        <Field label="Genelde hangi hesaptan ödenir?"><AccountSelect register={register as never} /></Field>
        <Field label="Detay"><input className="input" {...register('detail')} /></Field>
        <Field group label="Durum"><ControlledToggle control={control} name="isActive" label="Durum" labels={['Aktif', 'Pasif']} /></Field>
        <button type="submit" className="hidden" />
      </form>
      <ConfirmDialog open={deleting} title="Sabit ödemeyi sil" confirmText="Sil" loading={remove.isPending}
        message="Geçmiş ödemeler gider olarak kalır; yalnızca bundan sonraki aylarda listelenmez." onClose={() => setDeleting(false)} onConfirm={() => remove.mutate(undefined)} />
    </Modal>
  )
}

const paySchema = z.object({ date: req('Tarih zorunlu.'), amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'), cashAccountId: optId })
type PayValues = z.infer<typeof paySchema>

function PayForm({ item, month, onClose }: { item: RecurringPayment; month: string; onClose: () => void }) {
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<PayValues>({
    resolver: zodResolver(paySchema),
    defaultValues: { date: month === thisMonth() ? todayIso() : item.dueDate, amount: item.amount, cashAccountId: item.cashAccountId },
  })
  const save = useSave((v: PayValues) => post(`/recurring-payments/${item.id}/pay`, nullify(v)),
    { invalidate: ['recurring-payments', 'expenses', 'cash-accounts'], success: 'Ödendi olarak işaretlendi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={`${item.title} ödendi`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Ödendi olarak kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Ödenen tutar" required error={errors.amount?.message}><AmountInput control={control} name="amount" /></Field>
        <Field label="Ödeme tarihi" error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
        <Field label="Hangi hesaptan?" hint="Seçerseniz kasa/banka bakiyesinden düşer."><AccountSelect register={register as never} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
