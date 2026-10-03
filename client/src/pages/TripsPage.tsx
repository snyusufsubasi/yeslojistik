import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardCopy, Columns3, Download, FileCheck2, FileText, HandCoins, List, Pencil, Plus, Printer, StepForward, Truck } from 'lucide-react'
import { download, errorMessage, get, post } from '../api/client'
import { ExportButton, PdfButton } from '../components/Exports'
import type { BulkResult, Driver, JobRequest, Trip, TripStatus, TripTotals } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { useRowSelection } from '../lib/selection'
import { BulkSupplierPaymentDialog } from '../components/BulkDialogs'
import { useBulkResult } from '../lib/useBulkResult'
import { Badge, Button, Card, ConfirmDialog, IconButton, PageHeader, Select, DateFilter } from '../components/ui'
import { SearchSelect } from '../components/FormSelect'
import { ImportButton } from '../components/ImportDialog'
import { TripForm } from '../components/TripForm'
import { TripBoard } from '../components/TripBoard'
import clsx from 'clsx'
import { useAuth } from '../lib/auth'
import { addDaysIso, date, monthEndIso, monthStartIso, tl, todayIso } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { commissionStatusLabel, options, tripStatusAction, tripStatusLabel, tripStatusTone } from '../lib/labels'
import { emptyTerms } from '../lib/tripTerms'
import { useToast } from '../components/Toast'

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
  // Eski paneldeki hazır listeler: fiyat girilmeyenler, onay bekleyen teslim evrakları, komisyonu beklenenler.
  const [preset, setPreset] = useState<Preset | ''>((params.get('list') as Preset) ?? '')
  const [group, setGroup] = useState('')
  const toast = useToast()
  const [sort, setSort] = useState({ key: 'loadingDate', desc: true })
  const [editing, setEditing] = useState<Trip | 'new' | null>(null)
  // Görünüm: liste ya da pano (tercih tarayıcıda hatırlanır).
  const [view, setViewState] = useState<'list' | 'board'>(() => { try { return localStorage.getItem('yes.tripView') === 'board' ? 'board' : 'list' } catch { return 'list' } })
  const setView = (v: 'list' | 'board') => { setViewState(v); try { localStorage.setItem('yes.tripView', v) } catch { /* gizli pencere */ } }
  useOpenNewFromUrl(() => setEditing('new'))
  const [copyOf, setCopyOf] = useState<Trip | null>(null)
  const [sourceRequest, setSourceRequest] = useState<JobRequest | null>(null)
  const [deleting, setDeleting] = useState<Trip | null>(null)
  const debounced = useDebounce(search)
  const customers = useLookup('customers')

  const debouncedGroup = useDebounce(group)
  const [page, setPage] = usePage([debounced, status, customerId, from, to, invoiced, preset, debouncedGroup])
  // Seçim sayfalar arasında korunur, filtre değişince boşalır.
  const selection = useRowSelection<Trip>((t) => t.id, [debounced, status, customerId, from, to, invoiced, preset, debouncedGroup])
  const bulkResult = useBulkResult()
  const [advancing, setAdvancing] = useState<Trip[] | null>(null)
  const [paying, setPaying] = useState<number[] | null>(null)
  useEffect(() => {
        // Başka sayfadan (ör. tedarikçi detayı) belirli bir seferi açmak için ?id=
    const openId = Number(params.get('id'))
    if (openId) {
      params.delete('id')
      setParams(params, { replace: true })
      get<Trip>(`/trips/${openId}`).then(setEditing).catch(() => undefined)
    }
  }, [params, setParams])
  useEffect(() => {
    const requestId = Number(params.get('requestId'))
    if (!requestId) return
    const next = new URLSearchParams(params)
    next.delete('requestId')
    setParams(next, { replace: true })
    get<JobRequest>(`/job-requests/${requestId}`).then((request) => {
      if (request.status !== 'Pending') return
      setSourceRequest(request)
      setEditing('new')
    }).catch(() => undefined)
  }, [params, setParams])

  const query = { page, pageSize: 20, search: debounced, status, customerId, from, to, invoiced: invoiced === 'yes' ? true : invoiced === 'no' ? false : undefined, missingCarrierInvoice: invoiced === 'carrier' || undefined,
    customerGroup: debouncedGroup || undefined, missingPrice: preset === 'price' || undefined, pendingDeliveryDocument: preset === 'document' || undefined,
    commissionStatus: preset === 'commission' ? 'Pending' : undefined, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<Trip>('trips', query)
  const { page: _p, pageSize: _s, sort: _o, desc: _d, ...filters } = query
  const { data: totals } = useQuery({ queryKey: ['trips', 'totals', filters], queryFn: () => get<TripTotals>('/trips/totals', filters) })
  const today = todayIso()
  const periods = [
    { label: 'Bugün', from: today, to: today },
    { label: 'Gelecek', from: addDaysIso(today, 1), to: '' },
    { label: 'Geçmiş', from: '', to: addDaysIso(today, -1) },
    { label: 'Bu ay', from: monthStartIso(), to: monthEndIso() },
    { label: 'Hepsi', from: '', to: '' },
  ]

  /** Eski paneldeki "kopyala": şoför, plaka ve güzergâh bilgisini panoya alır (mesajla göndermek için). */
  const copyDriver = async (t: Trip) => {
    try {
      const d = await get<Driver>(`/drivers/${t.driverId}`)
      const text = [
        d.nationalId && `TC: ${d.nationalId}`, `Plaka: ${t.vehiclePlate}`, d.phone && `Telefon: ${d.phone}`, `Şoför: ${t.driverName}`,
        `Yükleme yeri: ${route(t.loadingCity, t.loadingAddress)}`, `İndirme yeri: ${route(t.deliveryCity, t.deliveryAddress)}`,
        t.cargoType && `Taşınan mal: ${t.cargoType}`,
      ].filter(Boolean).join('\n')
      await navigator.clipboard.writeText(text)
      toast.success('Şoför ve sefer bilgisi kopyalandı.')
    } catch {
      toast.error('Kopyalanamadı.')
    }
  }

  const statusMut = useSave(({ id, s }: { id: number; s: TripStatus }) => post<Trip>(`/trips/${id}/status`, { status: s }),
    { invalidate: ['trips', 'vehicles', 'suppliers'], success: 'Sefer durumu güncellendi.' })
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['trips', 'vehicles', 'suppliers', 'job-requests'], success: 'Sefer silindi.', onSuccess: () => setDeleting(null) })

  // Toplu işlemler (alttaki seçim çubuğu).
  const approveMut = useSave((ids: number[]) => post<BulkResult>('/trips/bulk/approve-delivery-documents', { tripIds: ids }), {
    invalidate: ['trips'], onSuccess: (r) => { selection.clear(); bulkResult.show('Teslim evrakı onayı', 'seferin teslim evrakı onaylandı.', r) },
  })
  const advanceMut = useSave((ids: number[]) => post<BulkResult>('/trips/bulk/advance-status', { tripIds: ids }), {
    invalidate: ['trips', 'vehicles', 'suppliers'],
    onSuccess: (r) => { setAdvancing(null); selection.clear(); bulkResult.show('Durum güncelleme', 'seferin durumu ilerletildi.', r) },
  })
  /** Seçilenlerle fatura: hepsi aynı müşterinin, faturalanmamış ve iptal edilmemiş seferleri olmalı. */
  const invoiceSelected = (rows: Trip[]) => {
    if (new Set(rows.map((t) => t.customerId)).size > 1)
      return toast.error('Seçilen seferler farklı müşterilere ait. Fatura tek müşteriye kesilir; aynı müşterinin seferlerini seçin.')
    const invoicedCount = rows.filter((t) => t.invoiceId || t.isLegacy).length
    if (invoicedCount) return toast.error(`${invoicedCount} seferin faturası zaten kesilmiş. Bu seferleri seçimden çıkarın.`)
    const cancelledCount = rows.filter((t) => t.status === 'Cancelled').length
    if (cancelledCount) return toast.error(`${cancelledCount} sefer iptal edilmiş; iptal edilen sefer faturalanmaz. Seçimden çıkarın.`)
    navigate(`/faturalar/yeni?customerId=${rows[0].customerId}&tripIds=${rows.map((t) => t.id).join(',')}`)
  }
  const paySelected = (rows: Trip[]) => {
    if (!rows.some((t) => t.carrierSupplierId)) return toast.error('Seçilen seferlerin hiçbiri kiralık (taşeron) araçla yapılmamış; ödenecek tedarikçi yok.')
    setPaying(rows.map((t) => t.id))
  }
  const exportSelected = (rows: Trip[]) =>
    download('/trips/export', { ids: rows.map((t) => t.id).join(','), sort: sort.key, desc: sort.desc }, 'secilen-seferler.xlsx')
      .catch((e) => toast.error(errorMessage(e)))
  const bulkActions = (rows: Trip[]) => <>
    {can('operations') && <Button write size="sm" variant="secondary" icon={<FileCheck2 />} loading={approveMut.isPending}
      onClick={() => approveMut.mutate(rows.map((t) => t.id))}>Teslim evrakını onayla</Button>}
    {can('operations') && <Button write size="sm" variant="secondary" icon={<StepForward />} onClick={() => setAdvancing(rows)}>Durumu ilerlet</Button>}
    {can('accounting') && <Button write size="sm" variant="secondary" icon={<FileText />} onClick={() => invoiceSelected(rows)}>Fatura kes</Button>}
    {can('accounting') && <Button write size="sm" variant="secondary" icon={<HandCoins />} onClick={() => paySelected(rows)}>Toplu ödeme</Button>}
    <Button size="sm" variant="secondary" icon={<Download />} onClick={() => exportSelected(rows)}>Excel'e aktar</Button>
  </>

  const columns: Column<Trip>[] = [
    { key: 'date', header: 'Tarih / No', sortKey: 'loadingDate', render: (t) => <>{date(t.loadingDate)}<span className="block text-sm text-slate-500">No {t.terms?.externalRef ?? t.id}</span></> },
    { key: 'customer', header: 'Müşteri', sortKey: 'customer', className: 'whitespace-normal! min-w-32', render: (t) => <span className="font-medium">{t.customerTitle}</span> },
    { key: 'route', header: 'Güzergah', className: 'whitespace-normal! min-w-40', render: (t) => <span>{route(t.loadingCity, t.loadingAddress)} <span className="text-slate-500">→</span> {route(t.deliveryCity, t.deliveryAddress)}{t.customerReference && <span className="block text-sm text-slate-500">Ref: {t.customerReference}</span>}</span> },
    { key: 'vehicle', header: 'Araç / Şoför', sortKey: 'vehicle', render: (t) => <span><span className="whitespace-nowrap">{t.vehiclePlate}</span>{t.carrierSupplierTitle && <span className="ml-1"><Badge tone="purple">Kiralık</Badge></span>}<span className="block text-sm text-slate-500">{t.carrierSupplierTitle ?? t.driverName}</span></span> },
    { key: 'status', header: 'Durum', sortKey: 'status', render: (t) => <><Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge><InvoiceInfo t={t} />{t.isLegacy && <span className="mt-0.5 block"><Badge tone="gray">Eski kayıt</Badge></span>}</> },
    { key: 'price', header: 'Tutar / Kâr', sortKey: 'salePrice', align: 'right', render: (t) => <>{tl(t.salePrice)}<span className={`block text-sm ${t.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>Kâr {tl(t.profit)}</span>
      {t.terms && t.terms.commission > 0 && <span className="block text-sm text-slate-500">Kom. {tl(t.terms.commission)} · {commissionStatusLabel[t.terms.commissionStatus]}</span>}</> },
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
          <IconButton label="Şoför bilgisini kopyala" onClick={() => copyDriver(t)}><ClipboardCopy className="size-4" /></IconButton>
          <IconButton write label="Düzenle" onClick={() => setEditing(t)}><Pencil className="size-4" /></IconButton>
        </div>
      ),
    })
  }

  return (
    <>
      <PageHeader title="Sevkiyatlar" subtitle="Seferlerin takibi, durum güncelleme, fatura ve kazanç"
        actions={<>
          <ExportButton url="/trips/export" params={query} fileName="seferler.xlsx" />
          <PdfButton url="/trips/pdf" params={filters} fileName="sevkiyat-listesi.pdf" label="Sevkiyat PDF" icon={<Printer className="size-4" />} />
          <PdfButton url="/trips/summary" params={{ ...filters, format: 'pdf' }} fileName="icmal.pdf" label="İcmal" icon={<FileText className="size-4" />} />
          {can('operations') && <ImportButton entity="trips" />}
          {can('accounting') && <Button write variant="secondary" onClick={() => navigate('/faturalar/yeni')}>Fatura Kes</Button>}
          {can('operations') && <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni Sefer</Button>}
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
        <div role="radiogroup" aria-label="Dönem" className="flex flex-wrap gap-2 border-b border-slate-100 px-6 pt-4 pb-3">
          {periods.map((p) => {
            const on = from === p.from && to === p.to
            return (
              <button key={p.label} role="radio" aria-checked={on} onClick={() => { setFrom(p.from); setTo(p.to) }}
                className={clsx('min-h-9 rounded-full border px-4 text-[0.9375rem] font-medium transition',
                  on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <Select aria-label="Durum" value={status} onChange={setStatus} options={options(tripStatusLabel)} placeholder="Tüm durumlar" />
          <SearchSelect ariaLabel="Müşteri" value={customerId === "" ? null : customerId} onChange={(v) => setCustomerId(v ?? "")} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
          <Select aria-label="Fatura durumu" value={invoiced} onChange={setInvoiced} placeholder="Fatura: tümü"
            options={[{ value: 'no' as const, label: 'Faturalanmamış' }, { value: 'yes' as const, label: 'Faturalanmış' }, { value: 'carrier' as const, label: 'Taşeron faturası gelmedi' }]} />
          <Select aria-label="Hazır liste" value={preset} onChange={setPreset} placeholder="Liste: tüm seferler" options={presetOptions} />
          <input className="input" aria-label="Firma grubu" placeholder="Firma grubu / şantiye" value={group} onChange={(e) => setGroup(e.target.value)} />
        </div>
        {totals && totals.count > 0 && <EarningsStrip totals={totals} showMoney={can('accounting')}
          onUninvoiced={() => { setInvoiced('no'); setStatus('Delivered') }} />}
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(t) => t.id}
          onRowClick={can('operations') ? (t) => setEditing(t) : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} pageSize={20} total={data?.total} onPage={setPage}
          selectable selection={selection} bulkActions={bulkActions} rowLabel={(t) => `Sefer ${t.terms?.externalRef ?? t.id}, ${t.customerTitle}`}
          empty={debounced || status || customerId || from || to || invoiced || preset || group
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

      {editing && <TripForm key={editing === 'new' ? `new-${copyOf?.id ?? sourceRequest?.id ?? ''}` : editing.id} trip={editing === 'new' ? null : editing} copyOf={copyOf}
        defaults={sourceRequest ? {
          jobRequestId: sourceRequest.id, customerId: sourceRequest.customerId,
          loadingAddress: sourceRequest.loadingAddress, deliveryAddress: sourceRequest.deliveryAddress,
          loadingDate: sourceRequest.date, cargoType: sourceRequest.cargoType ?? '',
          cargoQuantity: sourceRequest.cargoQuantity != null && Number.isInteger(sourceRequest.cargoQuantity) ? sourceRequest.cargoQuantity : null,
          salePrice: sourceRequest.salePrice ?? 0, vehicleCost: sourceRequest.carrierPrice ?? 0,
          // Kesirli miktar (ör. 2,5) seferde tam sayı alanına sığmaz; kaybolmasın diye açıklamaya yazılır.
          description: [sourceRequest.description,
            sourceRequest.cargoQuantity != null && !Number.isInteger(sourceRequest.cargoQuantity) ? `Yük miktarı: ${sourceRequest.cargoQuantity.toLocaleString('tr-TR')}` : null,
          ].filter(Boolean).join('\n'),
          terms: {
            ...emptyTerms, commission: sourceRequest.commission ?? 0, driverBonus: sourceRequest.driverBonus ?? 0,
            extraCharge: sourceRequest.otherExpense ?? 0, customerPays: sourceRequest.customerPays,
            deliveryDocumentNo: sourceRequest.loadingDocumentNo ?? '', waybillNo: sourceRequest.waybillNo ?? '',
            invoiceFooterNote: sourceRequest.invoiceFooterNote ?? '', showFooterNote: !!sourceRequest.invoiceFooterNote,
            loadingLatitude: sourceRequest.loadingLatitude ?? null, loadingLongitude: sourceRequest.loadingLongitude ?? null,
            deliveryLatitude: sourceRequest.deliveryLatitude ?? null, deliveryLongitude: sourceRequest.deliveryLongitude ?? null,
          },
        } : undefined}
        onClose={() => { setEditing(null); setCopyOf(null); setSourceRequest(null) }}
        onDelete={(t) => { setEditing(null); setDeleting(t) }}
        onCopy={(t) => { setCopyOf(t); setEditing('new') }} />}
      {advancing && <ConfirmDialog open title="Durumu ilerlet" danger={false} confirmText="Durumu ilerlet" loading={advanceMut.isPending}
        message={<AdvanceSummary trips={advancing} />} onClose={() => setAdvancing(null)} onConfirm={() => advanceMut.mutate(advancing.map((t) => t.id))} />}
      {paying && <BulkSupplierPaymentDialog tripIds={paying} onClose={() => setPaying(null)} onDone={selection.clear} />}
      {bulkResult.dialog}
      <ConfirmDialog open={!!deleting} title="Seferi sil" loading={deleteMut.isPending}
        message={<>“{deleting?.customerTitle} – {deleting?.loadingAddress} → {deleting?.deliveryAddress}” seferi silinecek. Emin misiniz?</>}
        confirmText="Sil" onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}

/** Planlandı → Yüklendi → Yolda → Teslim Edildi (sunucudaki TripStatusRules.Forward ile aynı). */
const forward: Partial<Record<TripStatus, TripStatus>> = { Planned: 'Loaded', Loaded: 'OnRoad', OnRoad: 'Delivered' }

/** Toplu "Durumu ilerlet" onayı: hangi seferin hangi duruma geçeceği. */
function AdvanceSummary({ trips }: { trips: Trip[] }) {
  const counts = new Map<TripStatus, number>()
  for (const t of trips) { const n = forward[t.status]; if (n) counts.set(n, (counts.get(n) ?? 0) + 1) }
  const stay = trips.filter((t) => !forward[t.status]).length
  if (counts.size === 0) return <p>Seçilen seferlerin hiçbiri ilerletilemez: hepsi teslim edilmiş ya da iptal.</p>
  return <>
    <p>Seçilen seferler bir sonraki aşamaya geçecek:</p>
    <ul className="mt-2 list-disc space-y-1 pl-5">
      {[...counts].map(([s, n]) => <li key={s}><b>{n}</b> sefer → {tripStatusLabel[s]}</li>)}
    </ul>
    {stay > 0 && <p className="mt-2 text-slate-600">{stay} sefer değişmeyecek (teslim edilmiş ya da iptal).</p>}
    {counts.has('Delivered') && <p className="mt-2 text-slate-600">Teslim tarihi boş olanlara bugünün tarihi yazılır.</p>}
  </>
}

type Preset = 'price' | 'document' | 'commission'
const presetOptions: { value: Preset; label: string }[] = [
  { value: 'price', label: 'Fiyat girilmeyenler' },
  { value: 'document', label: 'Onay bekleyen teslim evrakları' },
  { value: 'commission', label: 'Komisyonu beklenenler' },
]

/** "İstanbul / Tuzla OSB" — adres zaten ili içeriyorsa tekrar yazılmaz. */
function route(city: string | null | undefined, address: string) {
  return city && !address.toLocaleLowerCase('tr').includes(city.toLocaleLowerCase('tr')) ? `${city} / ${address}` : address
}

/** Eski paneldeki "Fatura Bilgisi": yalnızca işe yarayan satırlar (kesilen fatura ya da bekleyen iş) durumun altında. */
function InvoiceInfo({ t }: { t: Trip }) {
  const open = t.status === 'Delivered' && !t.isLegacy
  return <>
    {t.invoiceNo ? <span className="mt-0.5 block text-sm text-slate-500">Fatura: {t.invoiceNo}</span>
      : open && <span className="mt-0.5 block text-sm font-medium text-violet-700">Fatura kesilecek</span>}
    {t.carrierSupplierId && (t.carrierInvoiceNo ? <span className="block text-sm text-slate-500">Taşeron fat.: {t.carrierInvoiceNo}</span>
      : open && <span className="block text-sm font-medium text-amber-700">Taşeron faturası gelmedi</span>)}
  </>
}

/** Eski paneldeki "Kazanç Tablosu": süzgece uyan seferlerin toplamı, listenin hemen üstünde. */
function EarningsStrip({ totals, showMoney, onUninvoiced }: { totals: TripTotals; showMoney: boolean; onUninvoiced: () => void }) {
  const cell = (label: string, value: string, tone?: string) => (
    <div className="min-w-0">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={clsx('truncate text-lg font-semibold tabular-nums', tone ?? 'text-slate-900')}>{value}</div>
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:grid-cols-3 xl:grid-cols-6" aria-label="Kazanç tablosu">
      {cell('Sefer', `${totals.count}`)}
      {showMoney && <>
        {cell('Satış', tl(totals.sale))}
        {cell('Araç / taşeron maliyeti', tl(totals.vehicleCost))}
        {totals.commission > 0 && cell('Komisyon', tl(totals.commission))}
        {totals.extraCharge > 0 && cell('Ek masraf', tl(totals.extraCharge))}
        {totals.driverBonus > 0 && cell('Şoför primi', tl(totals.driverBonus))}
        {cell('Masraf', tl(totals.expenses))}
        {cell('Kazanç', tl(totals.profit), totals.profit < 0 ? 'text-red-600' : 'text-emerald-700')}
      </>}
      {totals.uninvoicedCount > 0
        ? <button onClick={onUninvoiced} className="min-w-0 rounded-lg text-left hover:bg-violet-50">
            <div className="text-sm text-violet-700">Faturası kesilecek ({totals.uninvoicedCount} sefer)</div>
            <div className="truncate text-lg font-semibold tabular-nums text-violet-800">{tl(totals.uninvoicedTotal)}</div>
          </button>
        : cell('Faturası kesilecek', 'Yok', 'text-slate-400')}
    </div>
  )
}
