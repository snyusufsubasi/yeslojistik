import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Pencil, Plus, Truck, XCircle } from 'lucide-react'
import { del, post, put } from '../api/client'
import type { JobRequest, JobRequestStatus } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { SearchSelect } from '../components/FormSelect'
import { CustomerForm } from '../components/CustomerForm'
import { MoreFields } from '../components/Inputs'
import { Badge, Button, Card, ConfirmDialog, DateFilter, Field, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../lib/auth'
import { date, tl, todayIso } from '../lib/format'
import { useDebounce, useLookup, useOpenNewFromUrl, usePage, usePaged, useSave } from '../lib/hooks'

type SaveValues = Omit<JobRequest, 'id' | 'customerTitle' | 'status' | 'tripId'>

const statusNames: Record<JobRequestStatus, string> = {
  Pending: 'Bekliyor', Cancelled: 'İptal', Converted: 'Sevk edildi',
}

export default function JobRequestsPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<JobRequestStatus | ''>('Pending')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editing, setEditing] = useState<JobRequest | 'new' | null>(null)
  const [cancelling, setCancelling] = useState<JobRequest | null>(null)
  const [deleting, setDeleting] = useState<JobRequest | null>(null)
  useOpenNewFromUrl(() => setEditing('new'))
  const debounced = useDebounce(search)
  const [page, setPage] = usePage([debounced, status, from, to])
  const { data, isFetching } = usePaged<JobRequest>('job-requests', {
    page, pageSize: 20, search: debounced, status: status || undefined, from, to,
  })
  const cancel = useSave((id: number) => post<JobRequest>(`/job-requests/${id}/cancel`, {}), {
    invalidate: ['job-requests'], success: 'İş talebi iptal edildi.', onSuccess: () => setCancelling(null),
  })
  const remove = useSave((id: number) => del(`/job-requests/${id}`), {
    invalidate: ['job-requests'], success: 'İş talebi silindi.', onSuccess: () => setDeleting(null),
  })

  const columns: Column<JobRequest>[] = [
    { key: 'date', header: 'Tarih', render: (r) => date(r.date) },
    { key: 'customer', header: 'Müşteri', render: (r) => <span className="font-medium">{r.customerTitle}</span> },
    { key: 'route', header: 'Güzergâh', className: 'min-w-40 whitespace-normal!', render: (r) => <>{r.loadingAddress} <span className="text-slate-500">→</span> {r.deliveryAddress}</> },
    { key: 'cargo', header: 'Yük / Araç', render: (r) => <>{r.cargoType || '—'}<span className="block text-sm text-slate-500">{r.vehicleType}</span></> },
    { key: 'price', header: 'Müşteri Fiyatı', align: 'right', render: (r) => r.salePrice == null ? '—' : tl(r.salePrice) },
    { key: 'status', header: 'Durum', render: (r) => <Badge tone={r.status === 'Pending' ? 'orange' : r.status === 'Converted' ? 'green' : 'gray'}>{statusNames[r.status]}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {r.status === 'Pending' && can('operations') && <>
          <Button size="sm" onClick={() => navigate(`/seferler?requestId=${r.id}`)}>Sevk Et</Button>
          <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(r)}>Düzenle</Button>
          <Button size="sm" variant="secondary" icon={<XCircle className="size-3.5" />} onClick={() => setCancelling(r)}>İptal</Button>
          <Button size="sm" variant="secondary" onClick={() => setDeleting(r)}>Sil</Button>
        </>}
        {r.status === 'Converted' && r.tripId && <Button size="sm" variant="secondary" icon={<Truck className="size-3.5" />} onClick={() => navigate(`/seferler?id=${r.tripId}`)}>Seferi Aç</Button>}
        {r.status === 'Cancelled' && can('operations') && <Button size="sm" variant="secondary" onClick={() => setDeleting(r)}>Sil</Button>}
      </div>
    ) },
  ]

  return <>
    <PageHeader title="İş Talepleri" subtitle="Araç ve şoför belirlenmeden önce gelen işler"
      actions={can('operations') && <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni İş Talebi</Button>} />
    <Card title="İş Talebi Listesi" icon={<ClipboardList className="size-4" />} bodyClassName="p-0"
      actions={<SearchBox value={search} onChange={setSearch} placeholder="Müşteri, yükleme, teslimat..." />}>
      <div className="grid gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-3">
        <Select aria-label="Durum" value={status} onChange={setStatus} placeholder="Tüm durumlar"
          options={Object.entries(statusNames).map(([value, label]) => ({ value: value as JobRequestStatus, label }))} />
        <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
        <DateFilter label="Bitiş" value={to} onChange={setTo} />
      </div>
      <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(r) => r.id}
        onRowClick={can('operations') ? (r) => { if (r.status === 'Pending') setEditing(r) } : undefined} page={page} pageSize={20} total={data?.total} onPage={setPage}
        empty="Bu filtrelere uyan iş talebi yok. Yeni İş Talebi ile kayıt açabilirsiniz."
        mobileCard={(r) => <div className="space-y-1"><div className="flex justify-between gap-2"><b>{r.customerTitle}</b><Badge tone={r.status === 'Pending' ? 'orange' : r.status === 'Converted' ? 'green' : 'gray'}>{statusNames[r.status]}</Badge></div><div>{r.loadingAddress} → {r.deliveryAddress}</div><div className="text-sm text-slate-500">{date(r.date)} · {r.cargoType || 'Yük belirtilmedi'}</div></div>} />
    </Card>
    {editing && <RequestForm key={editing === 'new' ? 'new' : editing.id} request={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    <ConfirmDialog open={!!cancelling} title="İş talebini iptal et" message={`${cancelling?.customerTitle} için açılan talep iptal edilecek.`}
      confirmText="İptal Et" loading={cancel.isPending} onClose={() => setCancelling(null)} onConfirm={() => cancelling && cancel.mutate(cancelling.id)} />
    <ConfirmDialog open={!!deleting} title="İş talebini sil" message={`${deleting?.customerTitle} için açılan talep silinecek.`}
      confirmText="Sil" loading={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} />
  </>
}

function RequestForm({ request, onClose }: { request: JobRequest | null; onClose: () => void }) {
  const customers = useLookup('customers')
  const [values, setValues] = useState<SaveValues>(() => ({
    customerId: request?.customerId ?? 0,
    date: request?.date ?? todayIso(),
    loadingAddress: request?.loadingAddress ?? '', deliveryAddress: request?.deliveryAddress ?? '',
    deliveryWindow: request?.deliveryWindow ?? '', cargoType: request?.cargoType ?? '',
    cargoQuantity: request?.cargoQuantity ?? null, vehicleType: request?.vehicleType ?? '',
    salePrice: request?.salePrice ?? null, carrierPrice: request?.carrierPrice ?? null,
    commission: request?.commission ?? null, driverBonus: request?.driverBonus ?? null,
    otherExpense: request?.otherExpense ?? null, customerPays: request?.customerPays ?? false,
    loadingDocumentNo: request?.loadingDocumentNo ?? '', waybillNo: request?.waybillNo ?? '',
    invoiceFooterNote: request?.invoiceFooterNote ?? '', description: request?.description ?? '',
    loadingLatitude: request?.loadingLatitude ?? null, loadingLongitude: request?.loadingLongitude ?? null,
    deliveryLatitude: request?.deliveryLatitude ?? null, deliveryLongitude: request?.deliveryLongitude ?? null,
  }))
  const [error, setError] = useState('')
  const [newCustomer, setNewCustomer] = useState<string | null>(null)
  const set = <K extends keyof SaveValues>(key: K, value: SaveValues[K]) => setValues((v) => ({ ...v, [key]: value }))
  const save = useSave(() => request
    ? put<JobRequest>(`/job-requests/${request.id}`, values)
    : post<JobRequest>('/job-requests', values), {
    invalidate: ['job-requests'], success: request ? 'İş talebi güncellendi.' : 'İş talebi oluşturuldu.', onSuccess: onClose,
  })
  const submit = () => {
    if (!values.customerId || !values.date || !values.loadingAddress.trim() || !values.deliveryAddress.trim()) {
      setError('Müşteri, tarih, yükleme ve indirme yeri zorunludur.'); return
    }
    setError('')
    save.mutate(undefined)
  }
  const textField = (label: string, key: keyof SaveValues, placeholder?: string) =>
    <Field label={label}><input className="input" placeholder={placeholder} value={String(values[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} /></Field>
  const numberField = (label: string, key: keyof SaveValues) =>
    <Field label={label}><input className="input text-right" type="number" min="0" step="0.01" value={values[key] == null ? '' : String(values[key])}
      onChange={(e) => set(key, (e.target.value === '' ? null : Number(e.target.value)) as never)} /></Field>
  const coordField = (label: string, key: keyof SaveValues) =>
    <Field label={label}><input className="input" type="number" step="0.000001" value={values[key] == null ? '' : String(values[key])}
      onChange={(e) => set(key, (e.target.value === '' ? null : Number(e.target.value)) as never)} /></Field>

  return <Modal open onClose={onClose} title={request ? 'İş Talebi Düzenle' : 'Yeni İş Talebi'} size="lg"
    footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="space-y-3"><h3 className="font-semibold text-navy-900">Müşteri Bilgileri</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Müşteri" required group><SearchSelect ariaLabel="Müşteri" value={values.customerId || null}
            onChange={(id) => set('customerId', id ?? 0)} options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} placeholder="Müşteri ara"
            onCreate={(t) => setNewCustomer(t)} createLabel="Yeni müşteri olarak ekle" /></Field>
          <Field label="Tarih" required><input className="input" type="date" value={values.date} onChange={(e) => set('date', e.target.value)} /></Field>
          {textField('Teslim Süresi', 'deliveryWindow', 'Örn. 2 gün')}
          <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-lg border border-slate-300 bg-white px-3">
            <input type="checkbox" className="size-5" checked={values.customerPays} onChange={(e) => set('customerPays', e.target.checked)} />
            <span>Ödeme müşteride</span>
          </label>
        </div>
      </section>
      <section className="space-y-3"><h3 className="font-semibold text-navy-900">Yer Bilgileri</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Yükleme Yeri" required><input className="input" value={values.loadingAddress} onChange={(e) => set('loadingAddress', e.target.value)} /></Field>
          <Field label="İndirme Yeri" required><input className="input" value={values.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} /></Field>
        </div>
        <MoreFields title="Harita konumu (isteğe bağlı)">
          <div className="grid gap-3 sm:grid-cols-2">
            {coordField('Yükleme Enlem', 'loadingLatitude')}{coordField('Yükleme Boylam', 'loadingLongitude')}
            {coordField('İndirme Enlem', 'deliveryLatitude')}{coordField('İndirme Boylam', 'deliveryLongitude')}
          </div>
        </MoreFields>
      </section>
      <section className="space-y-3"><h3 className="font-semibold text-navy-900">Sevkiyat ve Evrak</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {textField('Yükün Cinsi', 'cargoType')}{numberField('Yükün Miktarı', 'cargoQuantity')}
          {textField('Araç Cinsi', 'vehicleType')}{textField('Yükleme Evrak No', 'loadingDocumentNo')}
          {textField('İrsaliye No', 'waybillNo')}
        </div>
        <Field label="Fatura Altı Not"><textarea className="input min-h-16" value={values.invoiceFooterNote ?? ''} onChange={(e) => set('invoiceFooterNote', e.target.value)} /></Field>
        <Field label="İş Açıklaması"><textarea className="input min-h-20" value={values.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
      </section>
      <section className="space-y-3"><h3 className="font-semibold text-navy-900">Fiyat Bilgileri</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {numberField('Müşteri Fiyatı (TL)', 'salePrice')}{numberField('Sevkiyat Fiyatı (TL)', 'carrierPrice')}
          {numberField('Komisyon (TL)', 'commission')}{numberField('Şoför Primi (TL)', 'driverBonus')}
          {numberField('Masraf (TL)', 'otherExpense')}
        </div>
      </section>
    </div>
    {newCustomer != null && <CustomerForm customer={null} initialTitle={newCustomer} onClose={() => setNewCustomer(null)}
      onSaved={(c) => { customers.refetch(); set('customerId', c.customer.id) }} />}
  </Modal>
}
