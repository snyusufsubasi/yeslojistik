import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Download, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react'
import { download, get } from '../api/client'
import type { Expense, ExpenseCategory, PagedResult, Trip } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal, PageHeader, Select, DateFilter } from '../components/ui'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { FormSelect } from '../components/FormSelect'
import { date, tl2, todayIso } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave } from '../lib/hooks'
import { expenseCategoryLabel, options } from '../lib/labels'

const schema = z.object({
  category: z.enum(['Fuel', 'Maintenance', 'Toll', 'DriverAllowance', 'Tire', 'Insurance', 'Tax', 'Other']),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  date: req('Tarih zorunlu.'),
  vehicleId: z.number().nullable().or(z.nan().transform(() => null)),
  tripId: z.number().nullable().or(z.nan().transform(() => null)),
  description: optStr,
})
type FormValues = z.infer<typeof schema>
const api = crud<Expense, FormValues>('expenses')

export default function ExpensesPage() {
  const [params, setParams] = useSearchParams()
  const tripId = params.get('tripId') ? Number(params.get('tripId')) : undefined
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [vehicleId, setVehicleId] = useState<number | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState({ key: 'date', desc: true })
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const debounced = useDebounce(search)
  const vehicles = useLookup('vehicles')
  const [page, setPage] = usePage([debounced, category, vehicleId, from, to, tripId])

  const query = { page, pageSize: 20, search: debounced, category, vehicleId, tripId, from, to, sort: sort.key, desc: sort.desc }
  const { data, isFetching } = usePaged<Expense>('expenses', query)
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['expenses', 'trips'], success: 'Gider silindi.', onSuccess: () => setDeleting(null) })

  const columns: Column<Expense>[] = [
    { key: 'date', header: 'Tarih', sortKey: 'date', render: (e) => date(e.date) },
    { key: 'cat', header: 'Kategori', sortKey: 'category', render: (e) => <Badge tone="blue">{expenseCategoryLabel[e.category]}</Badge> },
    { key: 'plate', header: 'Araç', render: (e) => e.vehiclePlate ?? '—' },
    { key: 'trip', header: 'Sefer', render: (e) => e.tripLabel ?? '—' },
    { key: 'desc', header: 'Açıklama', render: (e) => e.description ?? '' },
    { key: 'amount', header: 'Tutar', sortKey: 'amount', align: 'right', render: (e) => <span className="font-medium">{tl2(e.amount)}</span> },
    {
      key: 'actions', header: '', align: 'right', render: (e) => (
        <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
          <IconButton label="Düzenle" onClick={() => setEditing(e)}><Pencil className="size-4" /></IconButton>
          <IconButton label="Sil" onClick={() => setDeleting(e)}><Trash2 className="size-4" /></IconButton>
        </div>
      ),
    },
  ]
  const pageTotal = data?.items.reduce((s, e) => s + e.amount, 0) ?? 0

  return (
    <>
      <PageHeader title="Giderler" subtitle="Yakıt, bakım, otoyol ve diğer masraflar"
        actions={<>
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => download('/expenses/export', query, 'giderler.xlsx')}>Excel</Button>
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Gider Ekle</Button>
        </>} />
      {tripId && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
          #{tripId} numaralı sefere ait giderler gösteriliyor.
          <button className="ml-auto" aria-label="Filtreyi kaldır" onClick={() => { params.delete('tripId'); setParams(params) }}><X className="size-4" /></button>
        </div>
      )}
      <Card title="Gider Listesi" icon={<Receipt className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Açıklama, plaka..." />}>
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-3 md:grid-cols-4">
          <Select aria-label="Kategori" value={category} onChange={setCategory} options={options(expenseCategoryLabel)} placeholder="Tüm kategoriler" />
          <Select aria-label="Araç" value={vehicleId} onChange={setVehicleId} placeholder="Tüm araçlar"
            options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
        </div>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(e) => e.id} onRowClick={setEditing}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty="Gider bulunamadı."
          footer={data && data.items.length > 0 ? (
            <tr className="bg-slate-50 text-sm font-semibold"><td className="td" colSpan={5}>Sayfa toplamı</td><td className="td text-right">{tl2(pageTotal)}</td><td className="td" /></tr>
          ) : undefined} />
      </Card>
      {editing && <ExpenseForm expense={editing === 'new' ? null : editing} defaultTripId={tripId} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Gideri sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>{tl2(deleting?.amount)} tutarındaki gider silinecek. Emin misiniz?</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}

function ExpenseForm({ expense, defaultTripId, onClose }: { expense: Expense | null; defaultTripId?: number; onClose: () => void }) {
  const vehicles = useLookup('vehicles')
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? { ...expense, vehicleId: expense.vehicleId ?? null, tripId: expense.tripId ?? null, description: expense.description ?? '' }
      : { category: 'Fuel', date: todayIso(), vehicleId: null, tripId: defaultTripId ?? null, description: '' },
  })
  const vehicleId = useWatch({ control, name: 'vehicleId' })
  const trips = useQuery({
    queryKey: ['trips', 'for-expense', vehicleId],
    queryFn: () => get<PagedResult<Trip>>('/trips', { vehicleId: vehicleId || undefined, pageSize: 100, sort: 'loadingDate', desc: true }),
  })
  const save = useSave((v: FormValues) => expense ? api.update(expense.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['expenses', 'trips'], success: expense ? 'Gider güncellendi.' : 'Gider eklendi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={expense ? 'Gider Düzenle' : 'Gider Ekle'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Kategori" required error={errors.category?.message}>
          <select className="input" {...register('category')}>
            {Object.entries(expenseCategoryLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Tutar (TL)" required error={errors.amount?.message}>
          <input className="input text-right" type="number" step="0.01" min="0" inputMode="decimal" {...register('amount', { valueAsNumber: true })} />
        </Field>
        <Field label="Tarih" required error={errors.date?.message}><input className="input" type="date" {...register('date')} /></Field>
        <Field label="Araç" error={errors.vehicleId?.message}>
          <FormSelect control={control} name="vehicleId" placeholder="— Genel gider —"
            options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
        </Field>
        <Field className="sm:col-span-2" label="Sefer" error={errors.tripId?.message} hint="Sefere bağlanan giderler sefer kârından düşülür.">
          <FormSelect control={control} name="tripId" placeholder="— Sefere bağlama —"
            options={(trips.data?.items ?? []).map((t) => ({ value: t.id, label: `${date(t.loadingDate)} · ${t.customerTitle} · ${t.loadingAddress} → ${t.deliveryAddress} (${t.vehiclePlate})` }))} />
        </Field>
        <Field className="sm:col-span-2" label="Açıklama" error={errors.description?.message}><input className="input" {...register('description')} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
