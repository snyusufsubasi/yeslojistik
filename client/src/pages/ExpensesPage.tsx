import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Check, Download, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react'
import { api as apiClient, download, errorMessage, get, openPdf, post } from '../api/client'
import { useToast } from '../components/Toast'
import { compressImage } from '../lib/image'
import type { ApprovalStatus, Expense, ExpenseCategory, ExpenseCategoryTotal, ExpenseDetails, PagedResult, Trip } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal, PageHeader, Select, DateFilter } from '../components/ui'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { FormSelect } from '../components/FormSelect'
import { SupplierForm } from '../components/SupplierForm'
import { ChoiceChips, ControlledChoice } from '../components/Choice'
import { AmountInput, DateQuick, MoreFields } from '../components/Inputs'
import { choices } from '../lib/choices'
import { expenseCategoryIcon } from '../lib/icons'
import { date, tl2, todayIso } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { approvalStatusLabel, expenseCategoryLabel, options } from '../lib/labels'
import { ImportButton } from '../components/ImportDialog'
import { useAuth } from '../lib/auth'

const schema = z.object({
  category: z.enum(['Fuel', 'Maintenance', 'Toll', 'DriverAllowance', 'DriverAdvance', 'Tire', 'Insurance', 'Tax', 'Other']),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  date: req('Tarih zorunlu.'),
  vehicleId: z.number().nullable().or(z.nan().transform(() => null)),
  tripId: z.number().nullable().or(z.nan().transform(() => null)),
  description: optStr,
  driverId: z.number().nullable().or(z.nan().transform(() => null)),
  liters: z.number().positive('Litre sıfırdan büyük olmalı.').nullable().or(z.nan().transform(() => null)),
  odometer: z.number().int('Tam sayı girin.').min(0).nullable().or(z.nan().transform(() => null)),
  supplierId: z.number().nullable().or(z.nan().transform(() => null)),
  isOnCredit: z.boolean(),
  cashAccountId: z.number().nullable().or(z.nan().transform(() => null)),
}).refine((v) => v.category !== 'DriverAdvance' || v.driverId != null || v.tripId != null, { path: ['driverId'], message: 'Avans için şoför seçin.' })
  .refine((v) => !v.isOnCredit || v.supplierId != null, { path: ['supplierId'], message: 'Vadeli gider için tedarikçi seçin.' })
type FormValues = z.infer<typeof schema>
const api = crud<Expense, FormValues>('expenses')

export default function ExpensesPage() {
  const [params, setParams] = useSearchParams()
  const tripId = params.get('tripId') ? Number(params.get('tripId')) : undefined
  const { can } = useAuth()
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | ''>((params.get('onay') as ApprovalStatus) || '')
  const [rejecting, setRejecting] = useState<Expense | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [vehicleId, setVehicleId] = useState<number | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState({ key: 'date', desc: true })
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  useOpenNewFromUrl(() => setEditing('new'))
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const debounced = useDebounce(search)
  const vehicles = useLookup('vehicles')
  const [page, setPage] = usePage([debounced, category, vehicleId, from, to, tripId, approvalStatus])

  const query = { page, pageSize: 20, search: debounced, category, vehicleId, tripId, from, to, approvalStatus, sort: sort.key, desc: sort.desc }
  const { data, isFetching } = usePaged<Expense>('expenses', query)
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['expenses', 'trips', 'suppliers'], success: 'Gider silindi.', onSuccess: () => setDeleting(null) })
  const approveMut = useSave((id: number) => post(`/expenses/${id}/approve`), { invalidate: ['expenses', 'trips', 'driver-ledger'], success: 'Masraf onaylandı.' })

  const columns: Column<Expense>[] = [
    { key: 'date', header: 'Tarih', sortKey: 'date', render: (e) => date(e.date) },
    { key: 'cat', header: 'Kategori', sortKey: 'category', render: (e) => <><Badge tone="blue">{expenseCategoryLabel[e.category]}</Badge>
      {e.approvalStatus === 'Pending' && <span className="mt-1 block"><Badge tone="yellow">Onay bekliyor</Badge></span>}
      {e.approvalStatus === 'Rejected' && <span className="mt-1 block" title={e.rejectionReason ?? ''}><Badge tone="red">Reddedildi</Badge></span>}
      {e.approvalStatus === 'Rejected' && e.rejectionReason && <span className="mt-0.5 block max-w-48 truncate text-sm text-red-600">{e.rejectionReason}</span>}
      {e.paidBy === 'Driver' && <span className="mt-0.5 block text-sm text-slate-500">Şoför ödedi</span>}</> },
    { key: 'plate', header: 'Araç / Şoför', render: (e) => <>{e.vehiclePlate ?? (e.driverName ? '' : '—')}{e.driverName && <span className="block text-sm text-slate-500">{e.driverName}</span>}</> },
    { key: 'trip', header: 'Sefer', render: (e) => e.tripLabel ?? '—' },
    { key: 'desc', header: 'Açıklama', render: (e) => <>{e.description ?? ''}{e.supplierTitle && <span className="block text-sm text-slate-500">{e.supplierTitle}{e.isOnCredit && ' · vadeli'}</span>}
      {e.hasReceipt && <button className="block text-sm font-medium text-brand-700 underline" onClick={(ev) => { ev.stopPropagation(); openPdf(`/expenses/${e.id}/receipt`, `fis-${e.id}`).catch(() => undefined) }}>Fişi gör</button>}</> },
    { key: 'amount', header: 'Tutar', sortKey: 'amount', align: 'right', render: (e) => <><span className="font-medium">{tl2(e.amount)}</span>{e.liters ? <span className="block text-sm text-slate-500">{e.liters.toLocaleString('tr-TR')} L{e.odometer ? ` · ${e.odometer.toLocaleString('tr-TR')} km` : ''}</span> : null}</> },
    {
      key: 'actions', header: '', align: 'right', render: (e) => (
        <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
          {e.approvalStatus === 'Pending' && can('accounting') && <>
            <Button size="sm" icon={<Check className="size-4" />} loading={approveMut.isPending && approveMut.variables === e.id} onClick={() => approveMut.mutate(e.id)}>Onayla</Button>
            <Button size="sm" variant="secondary" onClick={() => setRejecting(e)}>Reddet</Button>
          </>}
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
          <ImportButton entity="expenses" />
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
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <Select aria-label="Onay durumu" value={approvalStatus} onChange={setApprovalStatus} options={options(approvalStatusLabel)} placeholder="Tüm onay durumları" />
          <Select aria-label="Kategori" value={category} onChange={setCategory} options={options(expenseCategoryLabel)} placeholder="Tüm kategoriler" />
          <Select aria-label="Araç" value={vehicleId} onChange={setVehicleId} placeholder="Tüm araçlar"
            options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
        </div>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(e) => e.id} onRowClick={setEditing}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty={debounced || category || vehicleId || from || to || approvalStatus ? "Aramanıza uyan kayıt yok." : "Henüz gider yok. Yakıt, otoyol gibi masrafları “Gider Ekle” ile girin."}
          footer={data && data.items.length > 0 ? (
            <tr className="bg-slate-50 text-sm font-medium"><td className="td" colSpan={5}>Sayfa toplamı</td><td className="td text-right">{tl2(pageTotal)}</td><td className="td" /></tr>
          ) : undefined} />
      </Card>
      {editing && <ExpenseForm expense={editing === 'new' ? null : editing} defaultTripId={tripId} onClose={() => setEditing(null)} />}
      {rejecting && <RejectDialog expense={rejecting} onClose={() => setRejecting(null)} />}
      <ConfirmDialog open={!!deleting} title="Gideri sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>{tl2(deleting?.amount)} tutarındaki gider silinecek. Emin misiniz?</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}

function RejectDialog({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const reject = useSave((r: string) => post(`/expenses/${expense.id}/reject`, { reason: r }),
    { invalidate: ['expenses', 'trips', 'driver-ledger'], success: 'Masraf reddedildi; şoföre bildirildi.', onSuccess: onClose })
  return (
    <Modal open onClose={onClose} title="Masrafı reddet" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button variant="danger" loading={reject.isPending} disabled={!reason.trim()} onClick={() => reject.mutate(reason.trim())}>Reddet</Button></>}>
      <p className="mb-3 text-sm text-slate-600">{expense.driverName ?? 'Şoför'} · {expenseCategoryLabel[expense.category]} · {tl2(expense.amount)}.
        Reddedilen masraf raporlara ve şoför hesabına girmez; gerekçe şoföre bildirim olarak gider.</p>
      <Field label="Gerekçe" required>
        <input className="input" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ör. Fiş okunmuyor, tekrar çekin." autoFocus />
      </Field>
    </Modal>
  )
}

function ExpenseForm({ expense, defaultTripId, onClose }: { expense: Expense | null; defaultTripId?: number; onClose: () => void }) {
  const vehicles = useLookup('vehicles')
  const drivers = useLookup('drivers')
  const suppliers = useLookup('suppliers')
  const accounts = useLookup('cash-accounts')
  const [newSupplier, setNewSupplier] = useState<string | null>(null)
  const toast = useToast()
  const [receipt, setReceipt] = useState<File | null>(null)
  // Eski paneldeki ayrıntılar (gider adı, kullanıcı kategorisi, dönem, istasyon…) ayrı tutulur, kayıtta "details" olarak gider.
  const [details, setDetails] = useState<ExpenseDetails>({ ...expense?.details })
  const setD = (k: keyof ExpenseDetails, num = false) => (e: { target: { value: string } }) =>
    setDetails((d) => ({ ...d, [k]: e.target.value === '' ? null : num ? Number(e.target.value) : e.target.value }))
  const categoryNames = useQuery({ queryKey: ['expenses', 'categories'], queryFn: () => get<ExpenseCategoryTotal[]>('/expenses/categories'), staleTime: 60_000 })
  const { register, handleSubmit, control, setError, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? { ...expense, vehicleId: expense.vehicleId ?? null, tripId: expense.tripId ?? null, description: expense.description ?? '',
        driverId: expense.driverId ?? null, liters: expense.liters ?? null, odometer: expense.odometer ?? null,
        supplierId: expense.supplierId ?? null, isOnCredit: expense.isOnCredit ?? false, cashAccountId: expense.cashAccountId ?? null }
      : { category: 'Fuel', date: todayIso(), vehicleId: null, tripId: defaultTripId ?? null, description: '', driverId: null, liters: null, odometer: null,
        supplierId: null, isOnCredit: false, cashAccountId: null },
  })
  const amount = useWatch({ control, name: 'amount' })
  const category = useWatch({ control, name: 'category' })
  const liters = useWatch({ control, name: 'liters' })
  const odometer = useWatch({ control, name: 'odometer' })
  const kmDiff = details.previousOdometer && odometer ? odometer - details.previousOdometer : null
  const isFuel = category === 'Fuel'
  const forDriver = category === 'DriverAdvance' || category === 'DriverAllowance'
  const perLiter = isFuel && liters && amount ? amount / liters : null
  const vehicleId = useWatch({ control, name: 'vehicleId' })
  const trips = useQuery({
    queryKey: ['trips', 'for-expense', vehicleId],
    queryFn: () => get<PagedResult<Trip>>('/trips', { vehicleId: vehicleId || undefined, pageSize: 100, sort: 'loadingDate', desc: true }),
  })
  const save = useSave(async (v: FormValues) => {
    const body = { ...nullify(v), details } as unknown as FormValues
    const saved = expense ? await api.update(expense.id, body) : await api.create(body)
    if (receipt) {
      const form = new FormData()
      form.append('file', await compressImage(receipt))
      try { await apiClient.post(`/expenses/${saved.id}/receipt`, form) } catch (e) { toast.error(`Gider kaydedildi ama fiş yüklenemedi: ${errorMessage(e)}`) }
    }
    return saved
  }, {
    invalidate: ['expenses', 'trips', 'suppliers'], success: expense ? 'Gider güncellendi.' : 'Gider eklendi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={expense ? 'Gider Düzenle' : 'Gider Ekle'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field group className="sm:col-span-2" label="Ne için harcandı?" required error={errors.category?.message}>
          <ControlledChoice control={control} name="category" label="Kategori" columns={3}
            options={choices(expenseCategoryLabel, expenseCategoryIcon)} />
        </Field>
        <Field label="Tutar (TL)" required error={errors.amount?.message}>
          <AmountInput control={control} name="amount" />
        </Field>
        <Field label="Tarih" required error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
        <Field label="Araç" error={errors.vehicleId?.message} hint="Boş bırakılırsa genel gider sayılır.">
          <FormSelect control={control} name="vehicleId" placeholder="— Genel gider —"
            options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
        </Field>
        <Field label="Şoför" error={errors.driverId?.message}
          hint={forDriver ? 'Avans/harcırahta zorunlu. Sefer seçerseniz seferin şoförü atanır.' : 'İsteğe bağlı: harcamayı yapan şoför.'}>
          <FormSelect control={control} name="driverId" placeholder="— Şoför seçilmedi —"
            options={(drivers.data ?? []).map((d) => ({ value: d.id, label: d.label }))} />
        </Field>
        {isFuel && <>
          <Field label="Litre" error={errors.liters?.message} hint={perLiter ? `Litre fiyatı: ${perLiter.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL` : 'Tüketim hesabı için girin.'}>
            <input className="input text-right" type="number" step="0.01" min="0" inputMode="decimal" {...register('liters', { valueAsNumber: true })} />
          </Field>
          <Field label="Araç kilometresi" error={errors.odometer?.message} hint="Depo doldururken göstergedeki km. Araç km'si de güncellenir.">
            <input className="input text-right" type="number" step="1" min="0" inputMode="numeric" {...register('odometer', { valueAsNumber: true })} />
          </Field>
          <Field label="İstasyon"><input className="input" placeholder="Shell Gebze" value={details.fuelStation ?? ''} onChange={setD('fuelStation')} /></Field>
          <Field label="Yakıt Türü"><input className="input" placeholder="Dizel" value={details.fuelType ?? ''} onChange={setD('fuelType')} /></Field>
          <Field label="Önceki km" hint={kmDiff && kmDiff > 0 ? `Fark ${kmDiff.toLocaleString('tr-TR')} km${amount ? ` · km başı ${(amount / kmDiff).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL` : ''}` : 'Km başı maliyet için önceki depodaki km.'}>
            <input className="input text-right" type="number" min="0" inputMode="numeric" value={details.previousOdometer ?? ''} onChange={setD('previousOdometer', true)} />
          </Field>
        </>}
        <Field label="Gider Adı" hint="Ör. Ofis kirası, HGS"><input className="input" value={details.title ?? ''} onChange={setD('title')} /></Field>
        <Field label="Kategori (kendi listeniz)" hint="Kategori analizinde bu ada göre toplanır.">
          <input className="input" list="expense-category-names" value={details.categoryName ?? ''} onChange={setD('categoryName')} />
          <datalist id="expense-category-names">{(categoryNames.data ?? []).map((c) => <option key={c.name} value={c.name} />)}</datalist>
        </Field>
        <Field className="sm:col-span-2" label="Açıklama" error={errors.description?.message}><input className="input" placeholder="Ör. Shell Gebze, 34 VES 01 depo" {...register('description')} /></Field>
        <div className="sm:col-span-2">
          <MoreFields title="Sefer, tedarikçi, ödeme ve fiş (isteğe bağlı)" defaultOpen={!!expense?.tripId || !!expense?.supplierId || !!defaultTripId}
            hasError={!!(errors.tripId || errors.supplierId)}>
            <Field label="Sefer" error={errors.tripId?.message} hint="Sefere bağlanan giderler sefer kârından düşülür.">
              <FormSelect control={control} name="tripId" placeholder="— Sefere bağlama —"
                options={(trips.data?.items ?? []).map((t) => ({ value: t.id, label: `${date(t.loadingDate)} · ${t.customerTitle} · ${t.loadingAddress} → ${t.deliveryAddress} (${t.vehiclePlate})` }))} />
            </Field>
            <Field label="Tedarikçi (servis, istasyon)" error={errors.supplierId?.message}>
              <FormSelect control={control} name="supplierId" placeholder="— Seçilmedi —"
                options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.label }))}
                onCreate={(t) => setNewSupplier(t)} createLabel="Yeni tedarikçi olarak ekle" />
            </Field>
            <Field group label="Ödendi mi?">
              <Controller control={control} name="isOnCredit" render={({ field }) => (
                <ChoiceChips label="Ödeme durumu" value={field.value ? 'credit' : 'paid'} onChange={(v) => field.onChange(v === 'credit')}
                  options={[{ value: 'paid', label: 'Ödendi' }, { value: 'credit', label: 'Vadeli (tedarikçiye borç yaz)' }]} />
              )} />
            </Field>
            {(accounts.data?.length ?? 0) > 0 && (
              <Field label="Kasa / Banka" hint="Firmanın ödediği giderde paranın çıktığı hesap (vadelide dikkate alınmaz).">
                <FormSelect control={control} name="cashAccountId" placeholder="— Seçilmedi —" options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.label }))} />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dönem başlangıcı" hint="Kira, sigorta gibi dönemsel giderlerde"><input className="input" type="date" value={details.periodStart ?? ''} onChange={setD('periodStart')} /></Field>
              <Field label="Dönem bitişi"><input className="input" type="date" value={details.periodEnd ?? ''} onChange={setD('periodEnd')} /></Field>
            </div>
            <Field label="Fiş / fatura görseli" hint={expense?.hasReceipt ? 'Bu giderin fişi var; yeni dosya seçerseniz yerine geçer.' : 'Fotoğraf veya PDF (en fazla 10 MB).'}>
              <input className="input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
            </Field>
          </MoreFields>
        </div>
        <button type="submit" className="hidden" />
      </form>
      {newSupplier !== null && <SupplierForm supplier={null} defaultKind="Service" initialTitle={newSupplier} onClose={() => setNewSupplier(null)}
        onSaved={(x) => { suppliers.refetch(); setValue('supplierId', x.id, { shouldValidate: true }) }} />}
    </Modal>
  )
}
