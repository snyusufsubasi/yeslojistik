import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Columns3, Download, List, Pencil, Plus, Truck } from 'lucide-react'
import { download, get, post } from '../api/client'
import type { Trip, TripStatus } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, ConfirmDialog, IconButton, PageHeader, Select, DateFilter } from '../components/ui'
import { SearchSelect } from '../components/FormSelect'
import { ImportButton } from '../components/ImportDialog'
import { TripForm } from '../components/TripForm'
import { TripBoard } from '../components/TripBoard'
import clsx from 'clsx'
import { useAuth } from '../lib/auth'
import { date, tl } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
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
  const [invoiced, setInvoiced] = useState<'yes' | 'no' | 'carrier' | ''>(params.get('carrierInvoice') === 'missing' ? 'carrier' : '')
  const [sort, setSort] = useState({ key: 'loadingDate', desc: true })
  const [editing, setEditing] = useState<Trip | 'new' | null>(null)
  // Görünüm: liste ya da pano (tercih tarayıcıda hatırlanır).
  const [view, setViewState] = useState<'list' | 'board'>(() => { try { return localStorage.getItem('yes.tripView') === 'board' ? 'board' : 'list' } catch { return 'list' } })
  const setView = (v: 'list' | 'board') => { setViewState(v); try { localStorage.setItem('yes.tripView', v) } catch { /* gizli pencere */ } }
  useOpenNewFromUrl(() => setEditing('new'))
  const [copyOf, setCopyOf] = useState<Trip | null>(null)
  const [deleting, setDeleting] = useState<Trip | null>(null)
  const debounced = useDebounce(search)
  const customers = useLookup('customers')

  const [page, setPage] = usePage([debounced, status, customerId, from, to, invoiced])
  useEffect(() => {
        // Başka sayfadan (ör. tedarikçi detayı) belirli bir seferi açmak için ?id=
    const openId = Number(params.get('id'))
    if (openId) {
      params.delete('id')
      setParams(params, { replace: true })
      get<Trip>(`/trips/${openId}`).then(setEditing).catch(() => undefined)
    }
  }, [params, setParams])

  const query = { page, pageSize: 20, search: debounced, status, customerId, from, to, invoiced: invoiced === 'yes' ? true : invoiced === 'no' ? false : undefined, missingCarrierInvoice: invoiced === 'carrier' || undefined, sort: sort.key, desc: sort.desc }
  const { data, isFetching } = usePaged<Trip>('trips', query)

  const statusMut = useSave(({ id, s }: { id: number; s: TripStatus }) => post<Trip>(`/trips/${id}/status`, { status: s }),
    { invalidate: ['trips', 'vehicles', 'suppliers'], success: 'Sefer durumu güncellendi.' })
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['trips', 'vehicles', 'suppliers'], success: 'Sefer silindi.', onSuccess: () => setDeleting(null) })

  const columns: Column<Trip>[] = [
    { key: 'date', header: 'Tarih', sortKey: 'loadingDate', render: (t) => date(t.loadingDate) },
    { key: 'customer', header: 'Müşteri', sortKey: 'customer', className: 'whitespace-normal! min-w-32', render: (t) => <span className="font-medium">{t.customerTitle}</span> },
    { key: 'route', header: 'Güzergah', className: 'whitespace-normal! min-w-40', render: (t) => <span>{route(t.loadingCity, t.loadingAddress)} <span className="text-slate-500">→</span> {route(t.deliveryCity, t.deliveryAddress)}{t.customerReference && <span className="block text-sm text-slate-500">Ref: {t.customerReference}</span>}</span> },
    { key: 'vehicle', header: 'Araç / Şoför', sortKey: 'vehicle', render: (t) => <span><span className="whitespace-nowrap">{t.vehiclePlate}</span>{t.carrierSupplierTitle && <span className="ml-1"><Badge tone="purple">Kiralık</Badge></span>}<span className="block text-sm text-slate-500">{t.carrierSupplierTitle ?? t.driverName}</span></span> },
    { key: 'status', header: 'Durum', sortKey: 'status', render: (t) => <><Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge>{t.invoiceNo && <span className="mt-0.5 block text-sm text-slate-500">Fatura: {t.invoiceNo}</span>}</> },
    { key: 'price', header: 'Tutar / Kâr', sortKey: 'salePrice', align: 'right', render: (t) => <>{tl(t.salePrice)}<span className={`block text-sm ${t.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>Kâr {tl(t.profit)}</span></> },
  ]
  if (can('operations')) {
    columns.push({
      key: 'actions', header: '', align: 'right', render: (t) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {t.nextStatuses.filter((s) => s !== 'Planned' && s !== 'Cancelled' && !(t.status === 'Delivered')).slice(0, 1).map((s) => (
            <Button key={s} size="sm" variant="secondary" loading={statusMut.isPending && statusMut.variables?.id === t.id}
              title={`Durumu “${tripStatusLabel[s]}” yap`}
              onClick={() => statusMut.mutate({ id: t.id, s })}>{tripStatusAction[s]}</Button>
          ))}
          <IconButton label="Düzenle" onClick={() => setEditing(t)}><Pencil className="size-4" /></IconButton>
        </div>
      ),
    })
  }

  return (
    <>
      <PageHeader title="Seferler" subtitle="Tüm seferlerin takibi, durum güncelleme ve kârlılık"
        actions={<>
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => download('/trips/export', query, 'seferler.xlsx')}>Excel</Button>
          {can('operations') && <ImportButton entity="trips" />}
          {can('accounting') && <Button variant="secondary" onClick={() => navigate('/faturalar/yeni')}>Fatura Kes</Button>}
          {can('operations') && <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni Sefer</Button>}
        </>} />
      <div role="tablist" aria-label="Görünüm" className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {([['list', 'Liste', List], ['board', 'Pano', Columns3]] as const).map(([v, label, Icon]) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={clsx('inline-flex min-h-9 items-center gap-2 rounded-lg px-4 text-[0.9375rem] font-medium transition', view === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            <Icon className="size-4" />{label}
          </button>
        ))}
      </div>
      {view === 'board' && <>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
          <SearchBox value={search} onChange={setSearch} placeholder="Müşteri, plaka, şoför, adres..." />
          <SearchSelect ariaLabel="Müşteri" value={customerId === "" ? null : customerId} onChange={(v) => setCustomerId(v ?? "")} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
        </div>
        <TripBoard search={debounced} customerId={customerId} canEdit={can('operations')} onOpen={can('operations') ? (t) => setEditing(t) : undefined} />
      </>}
      {view === 'list' && <Card bodyClassName="p-0" title="Sefer Listesi" icon={<Truck className="size-4" />}
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Müşteri, plaka, şoför, adres..." />}>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <Select aria-label="Durum" value={status} onChange={setStatus} options={options(tripStatusLabel)} placeholder="Tüm durumlar" />
          <SearchSelect ariaLabel="Müşteri" value={customerId === "" ? null : customerId} onChange={(v) => setCustomerId(v ?? "")} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
          <Select aria-label="Fatura durumu" value={invoiced} onChange={setInvoiced} placeholder="Fatura: tümü"
            options={[{ value: 'no' as const, label: 'Faturalanmamış' }, { value: 'yes' as const, label: 'Faturalanmış' }, { value: 'carrier' as const, label: 'Taşeron faturası gelmedi' }]} />
        </div>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(t) => t.id}
          onRowClick={can('operations') ? (t) => setEditing(t) : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} pageSize={20} total={data?.total} onPage={setPage}
          empty={debounced || status || customerId || from || to || invoiced
            ? 'Bu filtrelere uyan sefer yok. Filtreleri temizlemeyi deneyin.'
            : 'Henüz sefer yok. Sağ üstteki “Yeni Sefer” ile ilk seferi ekleyin.'}
          mobileCard={(t) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-500">{date(t.loadingDate)} · {t.vehiclePlate}</span>
                <Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge>
              </div>
              <div className="font-medium text-navy-900">{t.customerTitle}</div>
              <div className="text-sm">{route(t.loadingCity, t.loadingAddress)} <span className="text-slate-500">→</span> {route(t.deliveryCity, t.deliveryAddress)}</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t.driverName}</span>
                <span><span className="font-medium">{tl(t.salePrice)}</span> <span className={t.profit < 0 ? 'text-red-600' : 'text-emerald-700'}>({tl(t.profit)})</span></span>
              </div>
            </div>
          )} />
      </Card>}

      {editing && <TripForm key={editing === 'new' ? `new-${copyOf?.id ?? ''}` : editing.id} trip={editing === 'new' ? null : editing} copyOf={copyOf}
        onClose={() => { setEditing(null); setCopyOf(null) }}
        onDelete={(t) => { setEditing(null); setDeleting(t) }}
        onCopy={(t) => { setCopyOf(t); setEditing('new') }} />}
      <ConfirmDialog open={!!deleting} title="Seferi sil" loading={deleteMut.isPending}
        message={<>“{deleting?.customerTitle} – {deleting?.loadingAddress} → {deleting?.deliveryAddress}” seferi silinecek. Emin misiniz?</>}
        confirmText="Sil" onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}

/** "İstanbul / Tuzla OSB" — adres zaten ili içeriyorsa tekrar yazılmaz. */
function route(city: string | null | undefined, address: string) {
  return city && !address.toLocaleLowerCase('tr').includes(city.toLocaleLowerCase('tr')) ? `${city} / ${address}` : address
}
