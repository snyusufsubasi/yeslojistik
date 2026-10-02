import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import clsx from 'clsx'
import { Pencil, Plus, Trash2, UserRound, Wallet } from 'lucide-react'
import { del, get, post, put } from '../api/client'
import type { Staff, StaffTransaction, StaffTransactionKind } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { ImportButton } from '../components/ImportDialog'
import { Badge, Button, Card, ConfirmDialog, Empty, Field, IconButton, Modal, PageHeader, Spinner, StatCard } from '../components/ui'
import { ControlledChoice, ControlledToggle } from '../components/Choice'
import { AmountInput, DateQuick } from '../components/Inputs'
import { applyServerErrors, nullify, optId, optStr, req } from '../lib/forms'
import { date, tl, tl2, todayIso } from '../lib/format'
import { useLookup, useSave } from '../lib/hooks'

const kindLabel: Record<StaffTransactionKind, string> = { Advance: 'Avans', Bonus: 'Prim', SalaryPayment: 'Maaş ödemesi' }
const kindTone: Record<StaffTransactionKind, 'orange' | 'green' | 'blue'> = { Advance: 'orange', Bonus: 'green', SalaryPayment: 'blue' }
const thisMonth = () => todayIso().slice(0, 7)

/** Eski paneldeki "Personeller": aylık maaş, avans, prim ve ay sonu kalan tek tabloda. */
export default function StaffPage() {
  const [month, setMonth] = useState(thisMonth)
  const staff = useQuery({ queryKey: ['staff', month], queryFn: () => get<Staff[]>('/staff', { month }) })
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)
  const [open, setOpen] = useState<Staff | null>(null)
  const rows = staff.data ?? []
  const active = rows.filter((s) => s.isActive)

  const columns: Column<Staff>[] = [
    { key: 'name', header: 'Personel', render: (s) => <>
      <span className="font-medium text-slate-900">{s.fullName}</span>{!s.isActive && <span className="ml-2"><Badge tone="gray">Çalışmıyor</Badge></span>}
      <span className="block text-sm text-slate-500">{[s.phone, s.notes].filter(Boolean).join(' · ') || (s.startDate ? `Başlangıç ${date(s.startDate)}` : '')}</span>
    </> },
    { key: 'salary', header: 'Maaş', align: 'right', render: (s) => tl(s.salary) },
    { key: 'advances', header: 'Avans', align: 'right', render: (s) => s.advances ? <span className="text-orange-700">−{tl(s.advances)}</span> : <span className="text-slate-400">—</span> },
    { key: 'bonuses', header: 'Prim', align: 'right', render: (s) => s.bonuses ? <span className="text-emerald-700">+{tl(s.bonuses)}</span> : <span className="text-slate-400">—</span> },
    { key: 'paid', header: 'Ödenen', align: 'right', render: (s) => s.paid ? tl(s.paid) : <span className="text-slate-400">—</span> },
    { key: 'remaining', header: 'Kalan', align: 'right', render: (s) => <span className={clsx('font-semibold', s.remaining > 0 ? 'text-slate-900' : 'text-emerald-700')}>{tl(s.remaining)}</span> },
    { key: 'actions', header: '', align: 'right', render: (s) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton write label="Düzenle" onClick={() => setEditing(s)}><Pencil className="size-4" /></IconButton>
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Personeller" subtitle="Aylık maaş, avans ve primler. Kalan = maaş + prim − avans − ödenen."
        actions={<>
          <ImportButton entity="staff" />
          <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Personel Ekle</Button>
        </>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Bu ayın maaşları" value={tl(active.reduce((s, x) => s + x.salary, 0))} icon={<UserRound />} color="blue" sub={`${active.length} çalışan`} />
        <StatCard title="Verilen avans" value={tl(rows.reduce((s, x) => s + x.advances, 0))} icon={<Wallet />} color="orange" />
        <StatCard title="Ödenecek kalan" value={tl(rows.reduce((s, x) => s + Math.max(0, x.remaining), 0))} icon={<Wallet />} color="green" />
      </div>
      <Card bodyClassName="p-0" title="Personel listesi" icon={<UserRound className="size-4" />}
        actions={<label className="input flex items-center gap-2"><span className="shrink-0 text-sm text-slate-500">Ay</span>
          <input type="month" aria-label="Ay" className="min-w-0 flex-1 bg-transparent outline-none" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} /></label>}>
        <DataTable columns={columns} rows={rows} loading={staff.isFetching} rowKey={(s) => s.id} onRowClick={setOpen}
          empty="Henüz personel yok. “Personel Ekle” ile ekleyin. Şoförler bu listeye değil Şoförler sayfasına girilir."
          mobileCard={(s) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><div className="truncate font-medium">{s.fullName}</div><div className="text-sm text-slate-500">Maaş {tl(s.salary)}</div></div>
              <span className="shrink-0 font-semibold">{tl(s.remaining)}</span>
            </div>
          )} />
      </Card>
      {editing && <StaffForm staff={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {open && <StaffLedger staff={open} onClose={() => setOpen(null)} />}
    </>
  )
}

const staffSchema = z.object({
  fullName: req('Ad soyad zorunlu.'),
  nationalId: optStr,
  phone: optStr,
  startDate: optStr,
  monthlySalary: z.number({ error: 'Maaş girin (yoksa 0).' }).min(0, 'Maaş eksi olamaz.'),
  notes: optStr,
  isActive: z.boolean(),
})
type StaffValues = z.infer<typeof staffSchema>

function StaffForm({ staff, onClose }: { staff: Staff | null; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: staff
      ? { fullName: staff.fullName, nationalId: staff.nationalId ?? '', phone: staff.phone ?? '', startDate: staff.startDate ?? '', monthlySalary: staff.monthlySalary, notes: staff.notes ?? '', isActive: staff.isActive }
      : { fullName: '', nationalId: '', phone: '', startDate: todayIso(), monthlySalary: 0, notes: '', isActive: true },
  })
  const save = useSave((v: StaffValues) => staff ? put(`/staff/${staff.id}`, nullify(v)) : post('/staff', nullify(v)),
    { invalidate: ['staff'], success: 'Personel kaydedildi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const remove = useSave(() => del(`/staff/${staff!.id}`), { invalidate: ['staff'], success: 'Personel silindi.', onSuccess: onClose })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={staff ? 'Personel Düzenle' : 'Personel Ekle'} size="sm"
      footer={<>
        {staff && <Button variant="danger" className="mr-auto" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>Sil</Button>}
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button>
      </>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Ad soyad" required error={errors.fullName?.message}><input className="input" {...register('fullName')} /></Field>
        <Field label="Aylık maaş" error={errors.monthlySalary?.message}><AmountInput control={control} name="monthlySalary" /></Field>
        <Field label="Telefon" error={errors.phone?.message}><input className="input" inputMode="tel" placeholder="0532 123 45 67" {...register('phone')} /></Field>
        <Field label="TC kimlik no" error={errors.nationalId?.message}><input className="input" inputMode="numeric" maxLength={11} {...register('nationalId')} /></Field>
        <Field label="İşe başlangıç"><DateQuick control={control} name="startDate" /></Field>
        <Field label="Not"><input className="input" placeholder="Görevi, çalıştığı yer" {...register('notes')} /></Field>
        <Field group label="Durum"><ControlledToggle control={control} name="isActive" label="Çalışma durumu" labels={['Çalışıyor', 'Çalışmıyor']} /></Field>
        <button type="submit" className="hidden" />
      </form>
      <ConfirmDialog open={deleting} title="Personeli sil" confirmText="Sil" loading={remove.isPending}
        message="Hareketi olan personel silinemez; “Çalışmıyor” olarak işaretleyebilirsiniz." onClose={() => setDeleting(false)} onConfirm={() => remove.mutate(undefined)} />
    </Modal>
  )
}

const txSchema = z.object({
  kind: z.enum(['Advance', 'Bonus', 'SalaryPayment']),
  date: req('Tarih zorunlu.'),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  note: optStr,
  cashAccountId: optId,
})
type TxValues = z.infer<typeof txSchema>

/** Personelin hareketleri ve yeni avans / prim / maaş ödemesi. */
function StaffLedger({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const list = useQuery({ queryKey: ['staff', 'tx', staff.id], queryFn: () => get<StaffTransaction[]>(`/staff/${staff.id}/transactions`) })
  const accounts = useLookup('cash-accounts')
  const { register, handleSubmit, setError, control, reset, formState: { errors } } = useForm<TxValues>({
    resolver: zodResolver(txSchema), defaultValues: { kind: 'SalaryPayment', date: todayIso(), note: '', cashAccountId: null },
  })
  const kind = useWatch({ control, name: 'kind' })
  const save = useSave((v: TxValues) => post(`/staff/${staff.id}/transactions`, nullify(v)),
    { invalidate: ['staff', 'cash-accounts'], success: 'Kaydedildi.', onSuccess: () => reset({ kind, date: todayIso(), note: '', cashAccountId: null }), onError: (e) => applyServerErrors(e, setError) })
  const remove = useSave((id: number) => del(`/staff/transactions/${id}`), { invalidate: ['staff', 'cash-accounts'], success: 'Kayıt silindi.' })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={staff.fullName} size="lg">
      <form onSubmit={submit} className="mb-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
        <Field group label="Ne kaydedilecek?" className="sm:col-span-2">
          <ControlledChoice control={control} name="kind" label="Hareket türü" columns={3}
            options={(Object.keys(kindLabel) as StaffTransactionKind[]).map((k) => ({ value: k, label: kindLabel[k],
              hint: k === 'Advance' ? 'Maaştan düşülür' : k === 'Bonus' ? 'Maaşa eklenir' : 'Maaşın ödenen kısmı' }))} />
        </Field>
        <Field label="Tutar" required error={errors.amount?.message}><AmountInput control={control} name="amount" /></Field>
        <Field label="Tarih" error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
        {kind !== 'Bonus' && <Field label="Hangi hesaptan ödendi?" hint="Seçerseniz kasa/banka bakiyesinden düşer.">
          <select className="input" {...register('cashAccountId', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}>
            <option value="">Seçilmedi</option>
            {(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>}
        <Field label="Not"><input className="input" {...register('note')} /></Field>
        <div className="flex justify-end sm:col-span-2"><Button type="submit" loading={save.isPending}>Kaydet</Button></div>
      </form>
      {list.isLoading ? <Spinner /> : (list.data ?? []).length === 0 ? <Empty>Henüz hareket yok.</Empty> : (
        <ul className="divide-y divide-slate-100">
          {list.data!.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span className="w-24 shrink-0 text-slate-600">{date(t.date)}</span>
              <Badge tone={kindTone[t.kind]}>{kindLabel[t.kind]}</Badge>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-500">{[t.note, t.cashAccountName].filter(Boolean).join(' · ')}</span>
              <span className="font-medium tabular-nums">{tl2(t.amount)}</span>
              <IconButton write label="Kaydı sil" onClick={() => remove.mutate(t.id)}><Trash2 className="size-4" /></IconButton>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
