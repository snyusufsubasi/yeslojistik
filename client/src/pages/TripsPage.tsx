import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { download, post } from '../api/client'
import type { Trip, TripStatus } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, ConfirmDialog, IconButton, PageHeader, Select } from '../components/ui'
import { TripForm } from '../components/TripForm'
import { useAuth } from '../lib/auth'
import { date, tl } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave } from '../lib/hooks'
import { options, tripStatusAction, tripStatusLabel, tripStatusTone } from '../lib/labels'

const api = crud<Trip, unknown>('trips')

export default function TripsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TripStatus | ''>((params.get('status') as TripStatus) ?? '')
  const [customerId, setCustomerId] = useState<number | ''>(params.get('customerId') ? Number(params.get('customerId')) : '')
  const [from, setFrom] = useState(params.get('from') ?? '')
  const [to, setTo] = useState(params.get('to') ?? '')
  const [invoiced, setInvoiced] = useState<'yes' | 'no' | ''>('')
  const [sort, setSort] = useState({ key: 'loadingDate', desc: true })
  const [editing, setEditing] = useState<Trip | 'new' | null>(params.get('new') ? 'new' : null)
  const [deleting, setDeleting] = useState<Trip | null>(null)
  const debounced = useDebounce(search)
  const customers = useLookup('customers')

  const [page, setPage] = usePage([debounced, status, customerId, from, to, invoiced])
  useEffect(() => {
    if (params.get('new')) { params.delete('new'); setParams(params, { replace: true }) }
  }, [params, setParams])

  const query = { page, pageSize: 20, search: debounced, status, customerId, from, to, invoiced: invoiced === '' ? undefined : invoiced === 'yes', sort: sort.key, desc: sort.desc }
  const { data, isFetching } = usePaged<Trip>('trips', query)

  const statusMut = useSave(({ id, s }: { id: number; s: TripStatus }) => post<Trip>(`/trips/${id}/status`, { status: s }),
    { invalidate: ['trips', 'vehicles'], success: 'Sefer durumu güncellendi.' })
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['trips', 'vehicles'], success: 'Sefer silindi.', onSuccess: () => setDeleting(null) })

  const columns: Column<Trip>[] = [
    { key: 'date', header: 'Tarih', sortKey: 'loadingDate', render: (t) => date(t.loadingDate) },
    { key: 'customer', header: 'Müşteri', sortKey: 'customer', render: (t) => <span className="font-medium">{t.customerTitle}</span> },
    { key: 'route', header: 'Güzergah', render: (t) => <span>{t.loadingAddress} <span className="text-slate-400">→</span> {t.deliveryAddress}</span> },
    { key: 'vehicle', header: 'Araç / Şoför', sortKey: 'vehicle', render: (t) => <span>{t.vehiclePlate}<span className="block text-xs text-slate-500">{t.driverName}</span></span> },
    { key: 'status', header: 'Durum', sortKey: 'status', render: (t) => <Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge> },
    { key: 'price', header: 'Tutar', sortKey: 'salePrice', align: 'right', render: (t) => tl(t.salePrice) },
    { key: 'profit', header: 'Kâr', align: 'right', render: (t) => <span className={t.profit < 0 ? 'text-red-600' : 'text-emerald-700'}>{tl(t.profit)}</span> },
    { key: 'invoice', header: 'Fatura', render: (t) => t.invoiceNo ?? <span className="text-slate-400">—</span> },
  ]
  if (can('operations')) {
    columns.push({
      key: 'actions', header: '', align: 'right', render: (t) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {t.nextStatuses.filter((s) => s !== 'Planned' && s !== 'Cancelled' && !(t.status === 'Delivered')).slice(0, 1).map((s) => (
            <Button key={s} size="sm" variant="secondary" loading={statusMut.isPending && statusMut.variables?.id === t.id}
              onClick={() => statusMut.mutate({ id: t.id, s })}>{tripStatusAction[s]}</Button>
          ))}
          <IconButton label="Düzenle" onClick={() => setEditing(t)}><Pencil className="size-4" /></IconButton>
          <IconButton label="Sil" disabled={!!t.invoiceId} onClick={() => setDeleting(t)}><Trash2 className="size-4" /></IconButton>
        </div>
      ),
    })
  }

  return (
    <>
      <PageHeader title="Seferler" subtitle="Tüm seferlerin takibi, durum güncelleme ve kârlılık"
        actions={<>
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => download('/trips/export', query, 'seferler.xlsx')}>Excel</Button>
          {can('accounting') && <Button variant="secondary" onClick={() => navigate('/faturalar/yeni')}>Fatura Kes</Button>}
          {can('operations') && <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni Sefer</Button>}
        </>} />
      <Card bodyClassName="p-0" title="Sefer Listesi" icon={<Truck className="size-4" />}
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Müşteri, plaka, şoför, adres..." />}>
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-3 sm:grid-cols-5">
          <Select aria-label="Durum" value={status} onChange={setStatus} options={options(tripStatusLabel)} placeholder="Tüm durumlar" />
          <Select aria-label="Müşteri" value={customerId} onChange={setCustomerId} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <input className="input" type="date" aria-label="Başlangıç tarihi" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" aria-label="Bitiş tarihi" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select aria-label="Fatura durumu" value={invoiced} onChange={setInvoiced} placeholder="Fatura: tümü"
            options={[{ value: 'no' as const, label: 'Faturalanmamış' }, { value: 'yes' as const, label: 'Faturalanmış' }]} />
        </div>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(t) => t.id}
          onRowClick={can('operations') ? (t) => setEditing(t) : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} pageSize={20} total={data?.total} onPage={setPage}
          empty="Bu kriterlere uygun sefer yok." />
      </Card>

      {editing && <TripForm trip={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Seferi sil" loading={deleteMut.isPending}
        message={<>“{deleting?.customerTitle} – {deleting?.loadingAddress} → {deleting?.deliveryAddress}” seferi silinecek. Emin misiniz?</>}
        confirmText="Sil" onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}
