import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookmarkPlus, ClipboardCopy, Columns3, Download, Eye, FileSpreadsheet, Trash2, FileCheck2, FileText, HandCoins, LayoutTemplate, List, Pencil, Plus, Printer, Repeat2, Rows3, SlidersHorizontal, StepForward, TableProperties, TriangleAlert, X } from 'lucide-react'
import { del, download, errorMessage, get, openPdf, post, withQuery } from '../api/client'
import type { BulkResult, Dashboard, Driver, JobRequest, TodayAgenda, Trip, TripStatus, TripTemplate, TripTotals, VehicleOwnership } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { useRowSelection } from '../lib/selection'
import { BulkSupplierPaymentDialog } from '../components/BulkDialogs'
import { useBulkResult } from '../lib/useBulkResult'
import { Badge, Button, Card, ConfirmDialog, IconButton, Loading, Modal, PageHeader, Select, DateFilter } from '../components/ui'
import { SearchSelect } from '../components/FormSelect'
import { ImportDialog } from '../components/ImportDialog'
import { useIsNewUi } from '../lib/uiMode'
import { MoreMenu, RowMenu, type MenuItem } from '../components/shell/Menu'
import { FilterBar, FilterPanel, type FilterChip } from '../components/shell/FilterPanel'
import { DetailDrawer } from '../components/shell/DetailDrawer'
import { MobileCards } from '../components/shell/MobileCards'
import { FirstUse } from '../components/FirstUse'
import { SaveTemplateDialog, TripForm, TripTimeline, type TripFormDefaults } from '../components/TripForm'
import { templateToDefaults } from '../lib/tripTemplate'
import { TripBoard } from '../components/TripBoard'
import clsx from 'clsx'
import { useAuth } from '../lib/auth'
import { addDaysIso, date, monthEndIso, monthStartIso, tl, todayIso } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { commissionStatusLabel, options, todayAgendaLabel, tripStatusAction, tripStatusLabel, tripStatusTone } from '../lib/labels'
import { emptyTerms } from '../lib/tripTerms'
import { UETDS_READINESS } from '../lib/features'
import { useToast } from '../components/Toast'
import { PlateBadge } from '../components/ui'
import { SumStrip, type SumItem } from '../components/SumStrip'
import { trailerTypeOptions, transportModeOptions, type SectorOption } from '../lib/sectorOptions'

const api = crud<Trip, unknown>('trips')

/** Listede küçük "U-ETDS hazır / N eksik" işareti (yalnızca henüz teslim edilmemiş seferlerde gelir). */
function UetdsBadge({ missing }: { missing?: number | null }) {
  if (missing == null) return null
  return (
    <span className="mt-0.5 block" title="U-ETDS bildirimi için bilgiler tam mı? (Hazırlık kontrolü; hiçbir şey gönderilmez.)">
      {missing === 0 ? <Badge tone="green">UETDS hazır</Badge> : <Badge tone="yellow">UETDS {missing} eksik</Badge>}
    </span>
  )
}

export default function TripsPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  // Süzgeçler adreste durur (?status=...&ownership=...): sayfa yenilenince, geri gelince ya da link paylaşılınca kaybolmaz.
  const textParam = (k: string) => params.get(k) ?? ''
  const idParam = (k: string) => (Number(params.get(k)) || '') as number | ''
  const [search, setSearch] = useState(textParam('q'))
  const [status, setStatus] = useState<TripStatus | ''>(oneOf(params.get('status'), Object.keys(tripStatusLabel) as TripStatus[]))
  const [customerId, setCustomerId] = useState<number | ''>(idParam('customerId'))
  const [from, setFrom] = useState(textParam('from'))
  const [to, setTo] = useState(textParam('to'))
  const [invoiced, setInvoiced] = useState<Invoiced | ''>(params.get('carrierInvoice') === 'missing' ? 'carrier' : oneOf<Invoiced>(params.get('invoiced'), ['yes', 'no', 'carrier']))
  // Eski paneldeki hazır listeler: fiyat girilmeyenler, onay bekleyen teslim evrakları, komisyonu beklenenler.
  const [preset, setPreset] = useState<Preset | ''>(oneOf(params.get('list'), presetOptions.map((o) => o.value)))
  const [group, setGroup] = useState(textParam('group'))
  // Eski paneldeki "Filtrele" alanları: tedarikçi, plaka, Piyasa / Öz Araç, komisyon işi, yer, numaralar, teslim evrakı.
  const [supplierId, setSupplierId] = useState<number | ''>(idParam('supplierId'))
  const [vehicleId, setVehicleId] = useState<number | ''>(idParam('vehicleId'))
  const [ownership, setOwnership] = useState<VehicleOwnership | ''>(oneOf<VehicleOwnership>(params.get('ownership'), ['Own', 'Rented']))
  const [commission, setCommission] = useState<YesNo | ''>(oneOf<YesNo>(params.get('commission'), ['yes', 'no']))
  const [documentState, setDocumentState] = useState<YesNo | ''>(oneOf<YesNo>(params.get('document'), ['yes', 'no']))
  const [loadingPlace, setLoadingPlace] = useState(textParam('loading'))
  const [deliveryPlace, setDeliveryPlace] = useState(textParam('delivery'))
  const [tripNo, setTripNo] = useState(textParam('tripNo'))
  const [docNo, setDocNo] = useState(textParam('docNo'))
  const [invoiceNo, setInvoiceNo] = useState(textParam('invoiceNo'))
  // U-ETDS hazırlığı eksik olanlar (yalnızca hazırlık kontrolü; Bakanlığa bir şey gönderilmez).
  const [uetdsMissing, setUetdsMissing] = useState<'missing' | ''>(UETDS_READINESS && params.get('uetds') === 'missing' ? 'missing' : '')
  // Faz 1 alanları: taşıma şekli, dorse/kasa tipi, iptal/sorun nedeni olanlar.
  const [transportMode, setTransportMode] = useState(textParam('transport'))
  const [trailerType, setTrailerType] = useState(textParam('trailer'))
  const [problem, setProblem] = useState<YesNo | ''>(oneOf<YesNo>(params.get('problem'), ['yes', 'no']))
  // "Bugün" ekranından gelen liste (?bugun=late…): kartın sayısıyla aynı sunucu süzgeci.
  const [agenda, setAgenda] = useState<TodayAgenda | ''>(oneOf(params.get('bugun'), Object.keys(todayAgendaLabel) as TodayAgenda[]))
  const advancedCount = [preset, group, commission, documentState, loadingPlace, deliveryPlace, tripNo, docNo, invoiceNo, uetdsMissing,
    transportMode, trailerType, problem, agenda].filter(Boolean).length
  // Süzgeç kutuları katlanır: liste ekranın üstünde başlasın. Açık süzgeçler çip olarak görünür.
  const [showMore, setShowMore] = useState(false)
  const toast = useToast()
  const [sort, setSort] = useState({ key: 'loadingDate', desc: true })
  const [editing, setEditing] = useState<Trip | 'new' | null>(null)
  // Görünüm: liste ya da pano (tercih tarayıcıda hatırlanır).
  const [view, setViewState] = useState<'list' | 'board'>(() => { try { return localStorage.getItem('yes.tripView') === 'board' ? 'board' : 'list' } catch { return 'list' } })
  const setView = (v: 'list' | 'board') => { setViewState(v); try { localStorage.setItem('yes.tripView', v) } catch { /* gizli pencere */ } }
  // Sütunlar: Özet ya da Detay (eski paneldeki geniş liste; tercih tarayıcıda hatırlanır).
  const [detail, setDetailState] = useState(() => { try { return localStorage.getItem('yes.tripColumns') === 'detail' } catch { return false } })
  const setDetail = (on: boolean) => { setDetailState(on); try { localStorage.setItem('yes.tripColumns', on ? 'detail' : 'summary') } catch { /* gizli pencere */ } }
  useOpenNewFromUrl(() => setEditing('new'))
  const [copyOf, setCopyOf] = useState<Trip | null>(null)
  // Şablon: "Şablondan" seçici, seçilen şablonun formu ve "Şablon olarak kaydet".
  const [pickingTemplate, setPickingTemplate] = useState(false)
  const [template, setTemplate] = useState<{ id: number; name: string; defaults: TripFormDefaults } | null>(null)
  const [templateOf, setTemplateOf] = useState<Trip | null>(null)
  const [sourceRequest, setSourceRequest] = useState<JobRequest | null>(null)
  const [deleting, setDeleting] = useState<Trip | null>(null)
  const isNew = useIsNewUi()
  const [filterOpen, setFilterOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const customers = useLookup('customers')
  const suppliers = useLookup('suppliers')
  const vehicles = useLookup('vehicles')

  // Yazılan süzgeçler (arama, yer, numaralar) yazmayı bitirince uygulanır.
  const [debounced, debouncedGroup, dLoading, dDelivery, dTripNo, dDocNo, dInvoiceNo, dTransport, dTrailer] = JSON.parse(
    useDebounce(JSON.stringify([search, group, loadingPlace, deliveryPlace, tripNo, docNo, invoiceNo, transportMode, trailerType]))) as string[]
  const yesNo = (v: YesNo | '') => (v === 'yes' ? true : v === 'no' ? false : undefined)
  const filters = { search: debounced, status, customerId, from, to,
    invoiced: invoiced === 'yes' ? true : invoiced === 'no' ? false : undefined, missingCarrierInvoice: invoiced === 'carrier' || undefined,
    customerGroup: debouncedGroup || undefined, missingPrice: preset === 'price' || undefined, pendingDeliveryDocument: preset === 'document' || undefined,
    commissionStatus: preset === 'commission' ? 'Pending' : undefined,
    carrierSupplierId: supplierId, vehicleId, ownership, hasCommission: yesNo(commission), hasDeliveryDocument: yesNo(documentState),
    loadingPlace: dLoading || undefined, deliveryPlace: dDelivery || undefined, tripNo: dTripNo || undefined,
    deliveryDocumentNo: dDocNo || undefined, invoiceNo: dInvoiceNo || undefined, uetdsMissing: uetdsMissing === 'missing' || undefined,
    transportMode: dTransport || undefined, trailerType: dTrailer || undefined, hasProblem: yesNo(problem), agenda: agenda || undefined }
  const [page, setPage] = usePage([filters])
  // Seçim sayfalar arasında korunur, filtre değişince boşalır.
  const selection = useRowSelection<Trip>((t) => t.id, [filters])

  // Süzgeçleri adrese yaz (yalnızca değişince; diğer parametrelere dokunmadan).
  const urlState = JSON.stringify({ q: debounced, status, customerId, from, to, invoiced, list: preset, group: debouncedGroup, supplierId, vehicleId,
    ownership, commission, document: documentState, loading: dLoading, delivery: dDelivery, tripNo: dTripNo, docNo: dDocNo, invoiceNo: dInvoiceNo, uetds: uetdsMissing,
    transport: dTransport, trailer: dTrailer, problem, bugun: agenda })
  useEffect(() => {
    const next = new URLSearchParams(params)
    next.delete('carrierInvoice')
    for (const [k, v] of Object.entries(JSON.parse(urlState) as Record<string, string | number>)) {
      if (v === '' || v == null) next.delete(k)
      else next.set(k, String(v))
    }
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [urlState, params, setParams])
  const clearFilters = () => {
    setSearch(''); setStatus(''); setCustomerId(''); setFrom(''); setTo(''); setInvoiced(''); setPreset(''); setGroup('')
    setSupplierId(''); setVehicleId(''); setOwnership(''); setCommission(''); setDocumentState('')
    setLoadingPlace(''); setDeliveryPlace(''); setTripNo(''); setDocNo(''); setInvoiceNo(''); setUetdsMissing('')
    setTransportMode(''); setTrailerType(''); setProblem(''); setAgenda('')
  }
  // Gerçekten hiç sefer yoksa (yalnız süzgeç/sekme yüzünden boş değilse) ilk adım kartı gösterilir.
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), staleTime: 30_000 })
  const noTripsAtAll = dash.data?.setup.tripCount === 0
  const anyFilter = !!(search || status || customerId || from || to || invoiced || supplierId || vehicleId || ownership) || advancedCount > 0
  const bulkResult = useBulkResult()
  const [advancing, setAdvancing] = useState<Trip[] | null>(null)
  const [paying, setPaying] = useState<number[] | null>(null)
  // Detay çekmecesi adresle eşlenir: `?id=<kayıt>` açıkken görünür (docs/plan/28-ORTAK-PARCALAR.md §4).
  const detailId = Number(params.get('id')) || 0
  /** Satıra tıklama ya da "⋯ → Detay": kaydı adrese yazar, çekmece sağdan açılır. */
  const openDetail = useCallback((t: Trip) => {
    const next = new URLSearchParams(params)
    next.set('id', String(t.id))
    setParams(next)
  }, [params, setParams])
  /** Kapanışta `?id=` adresten silinir (bağlantı paylaşılırsa çekmece yine açılır). */
  const closeDetail = useCallback(() => {
    const next = new URLSearchParams(params)
    next.delete('id')
    setParams(next, { replace: true })
  }, [params, setParams])
  useEffect(() => {
    // Klasik görünüm: bugünkü davranış aynen korunur — başka sayfadan (ör. tedarikçi detayı) gelen ?id=
    // sefer düzenleme penceresini açar ve parametre hemen adresten silinir.
    // Yeni görünümde aynı parametre DetailDrawer'ı açar; adres kapanışa kadar korunur.
    if (isNew) return
    const openId = Number(params.get('id'))
    if (openId) {
      params.delete('id')
      setParams(params, { replace: true })
      get<Trip>(`/trips/${openId}`).then(setEditing).catch(() => undefined)
    }
  }, [isNew, params, setParams])
  // Çekmece içeriği mevcut uçtan gelir (`/trips/{id}`); liste sorgusundan ayrı anahtar kullanır.
  const detailTrip = useQuery({
    queryKey: ['trips', 'detail', detailId],
    queryFn: () => get<Trip>(`/trips/${detailId}`),
    enabled: detailId > 0,
    retry: false,
  })
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

  const query = { page, pageSize: 20, ...filters, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<Trip>('trips', query)
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
      toast.success('Şoför ve sevkiyat bilgisi kopyalandı.')
    } catch {
      toast.error('Kopyalanamadı.')
    }
  }

  /**
   * Satır "⋯" menüsü: masaüstü tablosu (`RowMenu`) ve telefon kartı (`MobileCards`) aynı listeyi kullanır.
   * `write` maddeleri ayna modunda gizlenir; yetkisi olmayan kullanıcıda yalnız "Detay" kalır (`useVisibleItems`).
   */
  const rowMenuItems = (t: Trip): MenuItem[] => [
    { label: 'Detay', icon: <Eye />, onClick: () => openDetail(t) },
    ...(can('operations') ? [
      { label: 'Düzenle', icon: <Pencil />, write: true, onClick: () => setEditing(t) },
      { label: 'Tekrarla (aynısından yeni sevkiyat)', icon: <Repeat2 />, write: true, onClick: () => { setCopyOf(t); setEditing('new') } },
      { label: 'Şablon olarak kaydet', icon: <BookmarkPlus />, onClick: () => setTemplateOf(t) },
      { label: 'Şoför bilgisini kopyala', icon: <ClipboardCopy />, onClick: () => copyDriver(t) },
      { label: 'Sil', icon: <Trash2 />, write: true, danger: true, onClick: () => setDeleting(t) },
    ] : []),
  ]

  const statusMut = useSave(({ id, s }: { id: number; s: TripStatus }) => post<Trip>(`/trips/${id}/status`, { status: s }),
    { invalidate: ['trips', 'vehicles', 'suppliers'], success: 'Sevkiyat durumu güncellendi.' })
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['trips', 'vehicles', 'suppliers', 'job-requests'], success: 'Sevkiyat silindi.', onSuccess: () => { setDeleting(null); if (isNew) closeDetail() } })

  // Toplu işlemler (alttaki seçim çubuğu).
  const approveMut = useSave((ids: number[]) => post<BulkResult>('/trips/bulk/approve-delivery-documents', { tripIds: ids }), {
    invalidate: ['trips'], onSuccess: (r) => { selection.clear(); bulkResult.show('Teslim evrakı onayı', 'sevkiyatın teslim evrakı onaylandı.', r) },
  })
  const advanceMut = useSave((ids: number[]) => post<BulkResult>('/trips/bulk/advance-status', { tripIds: ids }), {
    invalidate: ['trips', 'vehicles', 'suppliers'],
    onSuccess: (r) => { setAdvancing(null); selection.clear(); bulkResult.show('Durum güncelleme', 'sevkiyatın durumu ilerletildi.', r) },
  })
  /** Seçilenlerle fatura: hepsi aynı müşterinin, faturalanmamış ve iptal edilmemiş seferleri olmalı. */
  const invoiceSelected = (rows: Trip[]) => {
    if (new Set(rows.map((t) => t.customerId)).size > 1)
      return toast.error('Seçilen sevkiyatlar farklı müşterilere ait. Fatura tek müşteriye kesilir; aynı müşterinin sevkiyatlarını seçin.')
    const invoicedCount = rows.filter((t) => t.invoiceId || t.isLegacy).length
    if (invoicedCount) return toast.error(`${invoicedCount} sevkiyatın faturası zaten kesilmiş. Bu sevkiyatları seçimden çıkarın.`)
    const cancelledCount = rows.filter((t) => t.status === 'Cancelled').length
    if (cancelledCount) return toast.error(`${cancelledCount} sevkiyat iptal edilmiş; iptal edilen sevkiyat faturalanmaz. Seçimden çıkarın.`)
    navigate(`/faturalar/yeni?customerId=${rows[0].customerId}&tripIds=${rows.map((t) => t.id).join(',')}`)
  }
  const paySelected = (rows: Trip[]) => {
    if (!rows.some((t) => t.carrierSupplierId)) return toast.error('Seçilen sevkiyatların hiçbiri kiralık (taşeron) araçla yapılmamış; ödenecek tedarikçi yok.')
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
    ...(detail ? [groupColumn] : []),
    { key: 'route', header: 'Güzergah', className: 'whitespace-normal! min-w-40', render: (t) => <span>{route(t.loadingCity, t.loadingAddress)} <span className="text-slate-500">→</span> {route(t.deliveryCity, t.deliveryAddress)}{t.customerReference && <span className="block text-sm text-slate-500">Ref: {t.customerReference}</span>}</span> },
    { key: 'vehicle', header: 'Araç / Şoför', sortKey: 'vehicle', render: (t) => <span><PlateBadge plate={t.vehiclePlate} />{t.carrierSupplierTitle && <span className="ml-1"><Badge tone="purple">Kiralık</Badge></span>}<span className="block text-sm text-slate-500">{t.carrierSupplierTitle ?? t.driverName}</span></span> },
    ...(detail ? detailColumns : []),
    { key: 'status', header: 'Durum', sortKey: 'status', render: (t) => <><Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge>{!detail && <InvoiceInfo t={t} />}{t.isLegacy && <span className="mt-0.5 block"><Badge tone="gray">Eski kayıt</Badge></span>}<ProblemInfo t={t} /></> },
    { key: 'price', header: 'Tutar / Kâr', sortKey: 'salePrice', align: 'right', render: (t) => <>{tl(t.salePrice)}<span className={`block text-sm ${t.profit < 0 ? 'text-bad' : 'text-good'}`}><Word>Kâr </Word>{tl(t.profit)}</span>
      {!detail && t.terms && t.terms.commission > 0 && <span className="block text-sm text-slate-500"><Word>Kom. </Word>{tl(t.terms.commission)}<Word> · {commissionStatusLabel[t.terms.commissionStatus]}</Word></span>}</> },
    ...(detail ? detailMoneyColumns : []),
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
          {isNew ? (
            <RowMenu items={rowMenuItems(t)} />
          ) : (<>
            <IconButton write label="Tekrarla (aynısından yeni sevkiyat)" onClick={() => { setCopyOf(t); setEditing('new') }}><Repeat2 className="size-4" /></IconButton>
            <IconButton label="Şoför bilgisini kopyala" onClick={() => copyDriver(t)}><ClipboardCopy className="size-4" /></IconButton>
            <IconButton write label="Düzenle" onClick={() => setEditing(t)}><Pencil className="size-4" /></IconButton>
          </>)}
        </div>
      ),
    })
  }

  const mainFilters = <>
          <Select aria-label="Durum" value={status} onChange={setStatus} options={options(tripStatusLabel)} placeholder="Tüm durumlar" />
          <SearchSelect ariaLabel="Müşteri" value={customerId === "" ? null : customerId} onChange={(v) => setCustomerId(v ?? "")} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
          <SearchSelect ariaLabel="Tedarikçi" value={supplierId === '' ? null : supplierId} onChange={(v) => setSupplierId(v ?? '')} placeholder="Tüm tedarikçiler"
            options={(suppliers.data ?? []).map((x) => ({ value: x.id, label: x.label }))} />
          <SearchSelect ariaLabel="Plaka" value={vehicleId === '' ? null : vehicleId} onChange={(v) => setVehicleId(v ?? '')} placeholder="Tüm araçlar (plaka)"
            options={(vehicles.data ?? []).map((x) => ({ value: x.id, label: x.label }))} />
          <Select aria-label="Araç durumu" value={ownership} onChange={setOwnership} placeholder="Araç: Piyasa ve Öz Araç"
            options={[{ value: 'Rented' as const, label: 'Piyasa (kiralık araç)' }, { value: 'Own' as const, label: 'Öz Araç' }]} />
          <Select aria-label="Fatura durumu" value={invoiced} onChange={setInvoiced} placeholder="Fatura: tümü"
            options={[{ value: 'no' as const, label: 'Faturalanmamış' }, { value: 'yes' as const, label: 'Faturalanmış' }, { value: 'carrier' as const, label: 'Taşeron faturası gelmedi' }]} />
  </>
  const moreFilters = <>
          <Select aria-label="Komisyon işi" value={commission} onChange={setCommission} placeholder="Komisyon: tümü"
            options={[{ value: 'yes' as const, label: 'Komisyon işi' }, { value: 'no' as const, label: 'Komisyonsuz' }]} />
          <Select aria-label="Teslim evrakı" value={documentState} onChange={setDocumentState} placeholder="Teslim evrakı: tümü"
            options={[{ value: 'yes' as const, label: 'Teslim evrakı eklenenler' }, { value: 'no' as const, label: 'Teslim evrakı beklenenler' }]} />
          <Select aria-label="Hazır liste" value={preset} onChange={setPreset} placeholder="Liste: tüm sevkiyatlar" options={presetOptions} />
          <input className="input" aria-label="Firma grubu" placeholder="Firma grubu / şantiye" value={group} onChange={(e) => setGroup(e.target.value)} />
          <input className="input" aria-label="Yükleme yeri" placeholder="Yükleme yeri (il ya da adres)" value={loadingPlace} onChange={(e) => setLoadingPlace(e.target.value)} />
          <input className="input" aria-label="İndirme yeri" placeholder="İndirme yeri (il ya da adres)" value={deliveryPlace} onChange={(e) => setDeliveryPlace(e.target.value)} />
          <input className="input" aria-label="Sevkiyat no" placeholder="Sevkiyat no" value={tripNo} onChange={(e) => setTripNo(e.target.value)} />
          <input className="input" aria-label="Teslim evrak no" placeholder="Teslim evrak no" value={docNo} onChange={(e) => setDocNo(e.target.value)} />
          <input className="input" aria-label="Fatura no" placeholder="Fatura no (satış ya da taşeron)" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          {UETDS_READINESS && <Select aria-label="U-ETDS hazırlığı" value={uetdsMissing} onChange={setUetdsMissing} placeholder="U-ETDS: tüm sevkiyatlar"
            options={[{ value: 'missing' as const, label: 'U-ETDS eksik olanlar' }]} />}
          <OptionInput ariaLabel="Taşıma şekli" placeholder="Taşıma şekli (komple, parsiyel…)" value={transportMode} onChange={setTransportMode} list={transportModeOptions} />
          <OptionInput ariaLabel="Dorse / kasa tipi" placeholder="Dorse / kasa tipi" value={trailerType} onChange={setTrailerType} list={trailerTypeOptions} />
          <Select aria-label="İptal / sorun" value={problem} onChange={setProblem} placeholder="Sorun: tümü"
            options={[{ value: 'yes' as const, label: 'İptal / sorun nedeni olanlar' }, { value: 'no' as const, label: 'Sorunsuz olanlar' }]} />
  </>
  const label = (list: { value: number; label: string }[] | undefined, id: number | '') => list?.find((x) => x.value === id)?.label ?? String(id)
  const lookupOpts = (d?: { id: number; label: string }[]) => d?.map((x) => ({ value: x.id, label: x.label }))
  const chips: FilterChip[] = [
    agenda && { label: `Bugün: ${todayAgendaLabel[agenda]}`, onClear: () => setAgenda('') },
    status && { label: `Durum: ${tripStatusLabel[status]}`, onClear: () => setStatus('') },
    customerId !== '' && { label: `Müşteri: ${label(lookupOpts(customers.data), customerId)}`, onClear: () => setCustomerId('') },
    supplierId !== '' && { label: `Tedarikçi: ${label(lookupOpts(suppliers.data), supplierId)}`, onClear: () => setSupplierId('') },
    vehicleId !== '' && { label: `Plaka: ${label(lookupOpts(vehicles.data), vehicleId)}`, onClear: () => setVehicleId('') },
    ownership && { label: ownership === 'Own' ? 'Öz Araç' : 'Piyasa (kiralık)', onClear: () => setOwnership('') },
    invoiced && { label: invoiced === 'yes' ? 'Faturalanmış' : invoiced === 'no' ? 'Faturalanmamış' : 'Taşeron faturası gelmedi', onClear: () => setInvoiced('') },
    commission && { label: commission === 'yes' ? 'Komisyon işi' : 'Komisyonsuz', onClear: () => setCommission('') },
    documentState && { label: documentState === 'yes' ? 'Teslim evrakı var' : 'Teslim evrakı bekleniyor', onClear: () => setDocumentState('') },
    preset && { label: presetOptions.find((o) => o.value === preset)?.label ?? preset, onClear: () => setPreset('') },
    group && { label: `Grup: ${group}`, onClear: () => setGroup('') },
    loadingPlace && { label: `Yükleme: ${loadingPlace}`, onClear: () => setLoadingPlace('') },
    deliveryPlace && { label: `İndirme: ${deliveryPlace}`, onClear: () => setDeliveryPlace('') },
    tripNo && { label: `Sevkiyat no: ${tripNo}`, onClear: () => setTripNo('') },
    docNo && { label: `Evrak no: ${docNo}`, onClear: () => setDocNo('') },
    invoiceNo && { label: `Fatura no: ${invoiceNo}`, onClear: () => setInvoiceNo('') },
    uetdsMissing && { label: 'U-ETDS eksik olanlar', onClear: () => setUetdsMissing('') },
    transportMode && { label: `Taşıma: ${transportMode}`, onClear: () => setTransportMode('') },
    trailerType && { label: `Dorse: ${trailerType}`, onClear: () => setTrailerType('') },
    problem && { label: problem === 'yes' ? 'İptal / sorunlu' : 'Sorunsuz', onClear: () => setProblem('') },
  ].filter(Boolean) as FilterChip[]
  // Tarih aralığı zaman düğmelerinden biri değilse çip olarak görünür.
  if ((from || to) && !periods.some((p) => p.from === from && p.to === to))
    chips.unshift({ label: `Tarih: ${from ? date(from) : '…'} – ${to ? date(to) : '…'}`, onClear: () => { setFrom(''); setTo('') } })
  const periodButtons = (
    <div role="radiogroup" aria-label="Dönem" className={clsx(segmentGroup, 'flex w-full sm:inline-flex sm:w-auto')}>
      {periods.map((p) => {
        const on = from === p.from && to === p.to
        return (
          <button key={p.label} role="radio" aria-checked={on} onClick={() => { setFrom(p.from); setTo(p.to) }}
            className={segment(on, 'flex-1 px-2 sm:flex-none sm:px-4')}>
            {p.label}
          </button>
        )
      })}
    </div>
  )
  const fail = (e: unknown) => toast.error(errorMessage(e))
  const viewToggle = (
        <div role="tablist" aria-label="Görünüm" className={clsx(segmentGroup, 'inline-flex')}>
          {([['list', 'Liste', List], ['board', 'Pano', Columns3]] as const).map(([v, label, Icon]) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={segment(view === v)}>
              <Icon />{label}
            </button>
          ))}
        </div>
  )

  return (
    <>
      <PageHeader title="Sevkiyatlar"
        actions={<>
          {can('operations') && <Button write variant="secondary" icon={<LayoutTemplate className="size-4" />} onClick={() => setPickingTemplate(true)}
            title="Kayıtlı şablondan (sık tekrarlanan iş) yeni sevkiyat">Şablondan</Button>}
          <MoreMenu items={[
            { label: 'Excel (liste)', icon: <Download />, onClick: () => download('/trips/export', query, 'sevkiyatlar.xlsx').catch(fail) },
            { label: 'Sevkiyat PDF', icon: <Printer />, onClick: () => openPdf(withQuery('/trips/pdf', filters), 'sevkiyat-listesi.pdf').catch(fail) },
            { label: 'İcmal (PDF)', icon: <FileText />, onClick: () => openPdf(withQuery('/trips/summary', { ...filters, format: 'pdf' }), 'icmal.pdf').catch(fail) },
            { label: detail ? 'Kısa liste (özet sütunlar)' : 'Ayrıntılı liste (tüm sütunlar)', icon: <TableProperties />, onClick: () => setDetail(!detail), hidden: view !== 'list' || !isNew },
            { label: "Excel'den aktar", icon: <FileSpreadsheet />, write: true, perm: 'operations', onClick: () => setImportOpen(true) },
            { label: 'Fatura Kes', icon: <FileText />, write: true, perm: 'accounting', onClick: () => navigate('/faturalar/yeni') },
          ]} />
          {can('operations') && <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>{isNew ? 'Sevkiyat Ekle' : 'Yeni Sevkiyat'}</Button>}
        </>} />
      {view === 'board' && <div className="mb-3 flex flex-wrap items-center gap-2">{viewToggle}</div>}
      {view === 'board' && <>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
          <SearchBox value={search} onChange={setSearch} placeholder="Müşteri, plaka, şoför, adres..." />
          <SearchSelect ariaLabel="Müşteri" value={customerId === "" ? null : customerId} onChange={(v) => setCustomerId(v ?? "")} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
        </div>
        <TripBoard search={debounced} customerId={customerId} canEdit={can('operations')} onOpen={can('operations') ? (t) => setEditing(t) : undefined} />
      </>}
      {view === 'list' && isNew && <div className="mb-3">
        <FilterBar search={<SearchBox value={search} onChange={setSearch} placeholder="Müşteri, plaka, şoför, adres, sevkiyat no..." />}
          quick={<>{viewToggle}{periodButtons}</>} chips={chips} onOpen={() => setFilterOpen(true)} onClearAll={anyFilter ? clearFilters : undefined} />
      </div>}
      {view === 'list' && !isNew && <div className="mb-3 space-y-2.5">
        {/* Tek satır araç çubuğu: arama, dönem, görünüm, sütunlar, süzgeç. Süzgeç kutuları katlanır; açık süzgeçler çip olarak görünür. */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Müşteri, plaka, şoför, adres..." />
          {periodButtons}
          {viewToggle}
          <div role="radiogroup" aria-label="Sütunlar" className={clsx(segmentGroup, 'hidden sm:inline-flex')}>
            {([[false, 'Özet', Rows3], [true, 'Detay', TableProperties]] as const).map(([on, label, Icon]) => (
              <button key={label} role="radio" aria-checked={detail === on} onClick={() => setDetail(on)}
                title={on ? 'Fatura başlığı, ürün, açıklama, komisyon, masraf, fatura bilgisi ve kaydı giren sütunları' : 'Kısa liste'}
                className={segment(detail === on)}>
                <Icon />{label}
              </button>
            ))}
          </div>
          <button type="button" aria-expanded={showMore} aria-controls="trip-filters" onClick={() => setShowMore(!showMore)}
            className={clsx('inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3.5 text-[0.875rem] font-semibold',
              showMore ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-fg hover:bg-surface-2')}>
            <SlidersHorizontal className="size-4" /> Süzgeç{chips.length > 0 && ` (${chips.length})`}
          </button>
          {anyFilter && <button type="button" onClick={clearFilters}
            className="inline-flex min-h-10 items-center gap-1 px-1.5 text-[0.8125rem] font-medium text-muted underline underline-offset-2 hover:text-fg"><X className="size-4" />Süzgeci temizle</button>}
        </div>
        {showMore && <div id="trip-filters" className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-4">
          {mainFilters}{moreFilters}
        </div>}
        {!showMore && chips.length > 0 && <div className="flex flex-wrap items-center gap-1.5" aria-label="Açık süzgeçler">
          {chips.map((c) => (
            <button key={c.label} type="button" onClick={c.onClear} title="Süzgeci kaldır"
              className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent-soft px-2 py-1 text-[0.8125rem] font-medium text-accent hover:bg-accent/15">
              {c.label} <X className="size-3.5" aria-label="kaldır" />
            </button>
          ))}
        </div>}
      </div>}
      {view === 'list' && <Card bodyClassName="p-0">
        {totals && totals.count > 0 && <EarningsStrip totals={totals} showMoney={can('accounting')}
          onUninvoiced={() => { setInvoiced('no'); setStatus('Delivered') }} />}
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(t) => t.id}
          onRowClick={isNew ? openDetail : can('operations') ? (t) => setEditing(t) : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} pageSize={20} total={data?.total} onPage={setPage}
          selectable selection={selection} bulkActions={bulkActions} rowLabel={(t) => `Sevkiyat ${t.terms?.externalRef ?? t.id}, ${t.customerTitle}`}
          empty={anyFilter
            ? 'Bu filtrelere uyan sevkiyat yok. Filtreleri temizlemeyi deneyin.'
            : !noTripsAtAll ? 'Bu görünümde sevkiyat yok.' : (
              <FirstUse title="İlk sevkiyatınızı ekleyin" addLabel="Yeni sevkiyat" onAdd={can('operations') ? () => setEditing('new') : undefined}>
                Müşteri, araç ve şoförünüzü seçip ilk sevkiyatı oluşturun. Sevkiyat teslim edilince tek tıkla faturalanır. Henüz müşteri ya da araç eklemediyseniz önce onları ekleyin.
              </FirstUse>)}
          mobileCard={(t) => (isNew ? (
            /*
             * Telefon kartı (yalnız yeni görünüm; klasik görünümde aşağıdaki eski kart aynen kalır).
             * Kart ≤120px: müşteri + durum rozeti, tarih ve güzergâh (2 satıra kırpılır), sağda mono tutar ve "⋯".
             * `DataTable` kartı `<li>` içine kendi `py-3.5` boşluğuyla koyar; `-my-3.5` o boşluğu geri alır,
             * böylece toplam yükseklik 120px'i aşmaz (MobileCards kendi iç boşluğunu taşır).
             */
            <div className="-my-3.5">
              <MobileCards menuLabel={`Sevkiyat ${t.terms?.externalRef ?? t.id} işlemleri`} cards={[{
                id: t.id,
                title: t.customerTitle,
                badge: { tone: tripStatusTone[t.status], label: tripStatusLabel[t.status] },
                info: <span className="line-clamp-2">{date(t.loadingDate)} · {route(t.loadingCity, t.loadingAddress)} <span className="text-muted">→</span> {route(t.deliveryCity, t.deliveryAddress)}</span>,
                amount: tl(t.salePrice),
                onOpen: () => openDetail(t),
                menu: rowMenuItems(t),
              }]} />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-muted">{date(t.loadingDate)}<PlateBadge plate={t.vehiclePlate} /></span>
                <Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge>
              </div>
              <div className="font-semibold text-fg">{t.customerTitle}</div>
              <div className="text-sm">{route(t.loadingCity, t.loadingAddress)} <span className="text-muted">→</span> {route(t.deliveryCity, t.deliveryAddress)}</div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm">
                <span className="min-w-0 text-muted">{t.driverName}</span>
                <span className="ml-auto tabular-nums"><span className="font-semibold">{tl(t.salePrice)}</span> <span className={t.profit < 0 ? 'text-bad' : 'text-good'}>({tl(t.profit)})</span></span>
              </div>
            </div>
          ))} />
      </Card>}

      {editing && <TripForm key={editing === 'new' ? `new-${copyOf?.id ?? sourceRequest?.id ?? ''}-${template?.id ?? ''}` : editing.id} trip={editing === 'new' ? null : editing} copyOf={copyOf}
        fromTemplate={editing === 'new' && !copyOf ? template?.name : undefined}
        defaults={template && !sourceRequest ? template.defaults : sourceRequest ? {
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
        onClose={() => { setEditing(null); setCopyOf(null); setSourceRequest(null); setTemplate(null) }}
        onDelete={(t) => { setEditing(null); setDeleting(t) }}
        onCopy={(t) => { setTemplate(null); setCopyOf(t); setEditing('new') }} />}
      {pickingTemplate && <TemplatePicker onClose={() => setPickingTemplate(false)}
        onPick={(t) => { setPickingTemplate(false); setCopyOf(null); setTemplate({ id: t.id, name: t.name, defaults: templateToDefaults(t) as TripFormDefaults }); setEditing('new') }} />}
      {templateOf && <SaveTemplateDialog trip={templateOf} onClose={() => setTemplateOf(null)} />}
      {advancing && <ConfirmDialog open title="Durumu ilerlet" danger={false} confirmText="Durumu ilerlet" loading={advanceMut.isPending}
        message={<AdvanceSummary trips={advancing} />} onClose={() => setAdvancing(null)} onConfirm={() => advanceMut.mutate(advancing.map((t) => t.id))} />}
      {paying && <BulkSupplierPaymentDialog tripIds={paying} onClose={() => setPaying(null)} onDone={selection.clear} />}
      {bulkResult.dialog}
      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} onClearAll={anyFilter ? clearFilters : undefined}>
        <div className="grid gap-3">{mainFilters}{moreFilters}</div>
      </FilterPanel>
      {/* Yeni görünüm: satıra tıklama ya da "⋯ → Detay" sağdan çekmeceyi açar; adres `?id=` ile eşlenir. */}
      {isNew && detailId > 0 && (
        <DetailDrawer open onClose={closeDetail} tabs={detailTabs}
          title={detailTrip.data ? `Sevkiyat #${detailTrip.data.terms?.externalRef ?? detailTrip.data.id}` : `Sevkiyat #${detailId}`}
          footer={<>
            {can('operations') && <Button write variant="danger" className="mr-auto" icon={<Trash2 />}
              onClick={() => detailTrip.data && setDeleting(detailTrip.data)}>Sil</Button>}
            {can('operations') && <Button write icon={<Pencil />}
              onClick={() => detailTrip.data && setEditing(detailTrip.data)}>Düzenle</Button>}
          </>}>
          {(tab) => detailTrip.data
            ? <TripDetail trip={detailTrip.data} tab={tab} />
            : <Loading error={detailTrip.error} onRetry={() => detailTrip.refetch()} />}
        </DetailDrawer>
      )}
      {importOpen && <ImportDialog entity="trips" onClose={() => setImportOpen(false)} />}
      <ConfirmDialog open={!!deleting} title="Sevkiyatı sil" loading={deleteMut.isPending}
        message={<>“{deleting?.customerTitle} – {deleting?.loadingAddress} → {deleting?.deliveryAddress}” sevkiyatı silinecek. Emin misiniz?</>}
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
  if (counts.size === 0) return <p>Seçilen sevkiyatların hiçbiri ilerletilemez: hepsi teslim edilmiş ya da iptal.</p>
  return <>
    <p>Seçilen sevkiyatlar bir sonraki aşamaya geçecek:</p>
    <ul className="mt-2 list-disc space-y-1 pl-5">
      {[...counts].map(([s, n]) => <li key={s}><b>{n}</b> sevkiyat → {tripStatusLabel[s]}</li>)}
    </ul>
    {stay > 0 && <p className="mt-2 text-slate-600">{stay} sevkiyat değişmeyecek (teslim edilmiş ya da iptal).</p>}
    {counts.has('Delivered') && <p className="mt-2 text-slate-600">Teslim tarihi boş olanlara bugünün tarihi yazılır.</p>}
  </>
}

/** Çekmecedeki sekmeler (docs/plan/28-ORTAK-PARCALAR.md §3 çizimi: Özet │ Evrak │ Kazanç). */
const detailTabs: { value: string; label: string }[] = [
  { value: 'ozet', label: 'Özet' },
  { value: 'evrak', label: 'Evrak' },
  { value: 'kazanc', label: 'Kazanç' },
  { value: 'gecmis', label: 'Durum geçmişi' },
]

/** Çekmecedeki etiket–değer satırı. */
const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[8.5rem_1fr] items-baseline gap-2 border-b border-slate-100 py-2 last:border-0">
    <dt className="text-[0.8125rem] text-muted">{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </div>
)

/**
 * Sevkiyat çekmecesinin içeriği: hepsi listenin kullandığı `TripDto` alanları; ek istek yok.
 * Özet sekmelerin ilkidir; Evrak ve Kazanç sekmeleri listenin "Detay" sütunlarındaki bilgileri toplar.
 */
function TripDetail({ trip: t, tab }: { trip: Trip; tab: string }) {
  const terms = t.terms
  const commission = terms?.commission ?? 0
  const extraCharge = terms?.extraCharge ?? 0
  const driverBonus = terms?.driverBonus ?? 0
  if (tab === 'evrak') return (
    <dl className="text-[0.9375rem]">
      <DetailRow label="Teslim evrakı">{terms?.deliveryDocumentNo || <Empty />}</DetailRow>
      <DetailRow label="Evrak onayı">{terms?.deliveryDocumentApproved
        ? <Badge tone="green">Onaylandı</Badge> : <Badge tone="yellow">Onay bekliyor</Badge>}</DetailRow>
      <DetailRow label="İrsaliye no">{terms?.waybillNo || <Empty />}</DetailRow>
      <DetailRow label="e-İrsaliye">{terms?.eWaybillNo
        ? <>{terms.eWaybillNo}{terms.eWaybillDate && <span className="block text-sm text-muted">{date(terms.eWaybillDate)}</span>}</> : <Empty />}</DetailRow>
      <DetailRow label="Fatura"><InvoiceInfo t={t} /></DetailRow>
      {UETDS_READINESS && <DetailRow label="U-ETDS">{t.uetdsMissing == null ? <Empty /> : <UetdsBadge missing={t.uetdsMissing} />}</DetailRow>}
    </dl>
  )
  if (tab === 'gecmis') return <TripTimeline tripId={t.id} />
  if (tab === 'kazanc') return (
    <dl className="text-[0.9375rem]">
      <DetailRow label="Satış">{tl(t.salePrice)}</DetailRow>
      <DetailRow label="Araç / taşeron">{tl(t.vehicleCost)}</DetailRow>
      {commission > 0 && <DetailRow label="Komisyon">{tl(commission)}
        <span className="block text-sm text-muted">{commissionStatusLabel[terms?.commissionStatus ?? 'Pending']}{t.commissionAccountName && ` · ${t.commissionAccountName}`}</span></DetailRow>}
      {extraCharge > 0 && <DetailRow label="Ek masraf">{tl(extraCharge)}{terms?.extraChargeInvoiced && <span className="text-sm text-muted"> (faturalı)</span>}</DetailRow>}
      {driverBonus > 0 && <DetailRow label="Şoför primi">{tl(driverBonus)}</DetailRow>}
      <DetailRow label="Giderler">{tl(t.expenseTotal)}</DetailRow>
      <DetailRow label="Kâr"><span className={t.profit < 0 ? 'text-bad' : 'text-good'}>{tl(t.profit)}</span></DetailRow>
    </dl>
  )
  return (
    <dl className="text-[0.9375rem]">
      <DetailRow label="Durum"><span className="flex flex-wrap items-center gap-1.5">
        <Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge>
        {t.isLegacy && <Badge tone="gray">Eski kayıt</Badge>}
        {terms?.customerPays && <Badge tone="teal">Müşteri öder</Badge>}
      </span></DetailRow>
      <DetailRow label="Müşteri"><span className="font-medium">{t.customerTitle}</span>
        {t.customerReference && <span className="block text-sm text-muted">Ref: {t.customerReference}</span>}
        {terms?.customerGroup && <span className="block text-sm text-muted">Firma grubu: {terms.customerGroup}</span>}</DetailRow>
      <DetailRow label="Güzergâh">{route(t.loadingCity, t.loadingAddress)} <span className="text-muted">→</span> {route(t.deliveryCity, t.deliveryAddress)}</DetailRow>
      <DetailRow label="Araç / Şoför">
        <span className="flex flex-wrap items-center gap-1.5"><PlateBadge plate={t.vehiclePlate} />{t.carrierSupplierTitle && <Badge tone="purple">Kiralık</Badge>}</span>
        <span className="block text-sm text-muted">{t.carrierSupplierTitle ?? t.driverName}{t.trailerPlate && ` · ${t.trailerPlate}`}</span></DetailRow>
      <DetailRow label="Yükleme tarihi">{date(t.loadingDate)}</DetailRow>
      {(t.deliveryDate || t.deliveredAt) && <DetailRow label="Teslim tarihi">{date(t.deliveryDate ?? t.deliveredAt ?? '')}</DetailRow>}
      <DetailRow label="Tutar">{tl(t.salePrice)}</DetailRow>
      {(t.cargoType || t.cargoQuantity != null) && <DetailRow label="Yük">
        {t.cargoType ?? ''}{t.cargoQuantity != null && ` ${t.cargoQuantity.toLocaleString('tr-TR')} ${t.cargoUnit ?? ''}`.trimEnd()}{t.cargoWeightKg != null && ` · ${t.cargoWeightKg.toLocaleString('tr-TR')} kg`}</DetailRow>}
      {t.ops?.transportMode && <DetailRow label="Taşıma şekli">{t.ops.transportMode}</DetailRow>}
      {t.ops?.trailerType && <DetailRow label="Dorse / kasa">{t.ops.trailerType}</DetailRow>}
      {t.ops?.problemReason && <DetailRow label={t.status === 'Cancelled' ? 'İptal nedeni' : 'Sorun'}>
        <span className="font-medium text-warn">{t.ops.problemReason}</span>{t.ops.problemNote && <span className="block text-sm text-muted">{t.ops.problemNote}</span>}</DetailRow>}
      {t.description && <DetailRow label="Açıklama"><span className="whitespace-pre-line">{t.description}</span></DetailRow>}
    </dl>
  )
}

type Preset = 'price' | 'document' | 'commission'
type Invoiced = 'yes' | 'no' | 'carrier'
type YesNo = 'yes' | 'no'

/** Adresteki değer izin verilenlerden biriyse onu, değilse boş döndürür (elle bozulmuş adres API hatasına yol açmasın). */
function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.includes(value as T) ? (value as T) : ''
}

const Empty = () => <span className="text-slate-400">—</span>

/** Detay görünümü: müşteriden sonra fatura başlığı (firma grubu / şantiye). */
const groupColumn: Column<Trip> = { key: 'group', header: 'Fatura başlığı', className: 'whitespace-normal! min-w-28', render: (t) => t.terms?.customerGroup || <Empty /> }

/** Detay görünümünde araçtan sonra gelen sütunlar: ürün ve açıklama. */
const detailColumns: Column<Trip>[] = [
  { key: 'cargo', header: 'Ürün', className: 'whitespace-normal! min-w-28', render: (t) => {
    const amount = [t.cargoQuantity != null && `${t.cargoQuantity.toLocaleString('tr-TR')} ${t.cargoUnit ?? ''}`.trim(),
      t.cargoWeightKg != null && `${t.cargoWeightKg.toLocaleString('tr-TR')} kg`].filter(Boolean).join(' · ')
    return t.cargoType || amount ? <>{t.cargoType ?? ''}{amount && <span className="block text-sm text-slate-500">{amount}</span>}</> : <Empty />
  } },
  { key: 'description', header: 'Açıklama', className: 'whitespace-normal! min-w-40 max-w-64', render: (t) => t.description
    ? <span className="line-clamp-3 text-sm" title={t.description}>{t.description}</span> : <Empty /> },
]

/** Detay görünümünde tutardan sonra gelen sütunlar: komisyon, masraf, fatura bilgisi ve kaydı giren. */
const detailMoneyColumns: Column<Trip>[] = [
  { key: 'commission', header: 'Komisyon', align: 'right', render: (t) => t.terms && t.terms.commission > 0
    ? <>{tl(t.terms.commission)}<span className="block text-sm text-slate-500"><Word>{commissionStatusLabel[t.terms.commissionStatus]}{t.commissionAccountName && ` · ${t.commissionAccountName}`}</Word></span></>
    : <Empty /> },
  { key: 'extra', header: 'Masraf', align: 'right', render: (t) => {
    const extra = t.terms?.extraCharge ?? 0
    if (extra <= 0 && t.expenseTotal <= 0) return <Empty />
    return <>
      {extra > 0 && <span className="block">{tl(extra)}{t.terms?.extraChargeInvoiced && <span className="text-sm text-slate-500"><Word> (faturalı)</Word></span>}</span>}
      {t.expenseTotal > 0 && <span className="block text-sm text-slate-500"><Word>Gider </Word>{tl(t.expenseTotal)}</span>}
    </>
  } },
  { key: 'invoice', header: 'Fatura bilgisi', className: 'whitespace-normal! min-w-36', render: (t) => {
    const open = t.status === 'Delivered' && !t.isLegacy
    return <>
      {t.invoiceNo ? <span className="block">{t.invoiceNo}<span className="block text-sm text-slate-500">{date(t.invoiceDate)}</span></span>
        : open ? <span className="block text-sm font-semibold text-bill">Fatura kesilecek</span> : <Empty />}
      {t.carrierSupplierId && (t.carrierInvoiceNo
        ? <span className="block text-sm text-slate-500">Taşeron: {t.carrierInvoiceNo}{t.carrierInvoiceDate && ` · ${date(t.carrierInvoiceDate)}`}</span>
        : open && <span className="block text-sm font-semibold text-warn">Taşeron faturası gelmedi</span>)}
    </>
  } },
  { key: 'createdBy', header: 'Kaydı giren', render: (t) => t.createdBy || <Empty /> },
]
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
      : open && <span className="mt-0.5 block text-sm font-semibold text-bill">Fatura kesilecek</span>}
    {t.carrierSupplierId && (t.carrierInvoiceNo ? <span className="block text-sm text-slate-500">Taşeron fat.: {t.carrierInvoiceNo}</span>
      : open && <span className="block text-sm font-semibold text-warn">Taşeron faturası gelmedi</span>)}
  </>
}

/** Eski paneldeki "Kazanç Tablosu": süzgece uyan seferlerin toplamı, listenin hemen üstünde. "Faturası kesilecek" sağda, sarı zeminli. */
function EarningsStrip({ totals, showMoney, onUninvoiced }: { totals: TripTotals; showMoney: boolean; onUninvoiced: () => void }) {
  const items: SumItem[] = [{ label: 'Sevkiyat', value: totals.count }]
  if (showMoney) {
    items.push({ label: 'Satış', value: tl(totals.sale) }, { label: 'Araç / taşeron maliyeti', value: tl(totals.vehicleCost) })
    if (totals.commission > 0) items.push({ label: 'Komisyon', value: tl(totals.commission) })
    if (totals.extraCharge > 0) items.push({ label: 'Ek masraf', value: tl(totals.extraCharge) })
    if (totals.driverBonus > 0) items.push({ label: 'Şoför primi', value: tl(totals.driverBonus) })
    items.push({ label: 'Masraf', value: tl(totals.expenses) }, { label: 'Kazanç', value: tl(totals.profit), tone: totals.profit < 0 ? 'text-bad' : 'text-good' })
  }
  return <SumStrip label="Kazanç tablosu" items={items}
    end={totals.uninvoicedCount > 0
      ? { label: `Faturası kesilecek · ${totals.uninvoicedCount} sevkiyat`, value: tl(totals.uninvoicedTotal), highlight: true, onClick: onUninvoiced,
          title: 'Teslim edilip faturası kesilmemiş sevkiyatları listele' }
      : { label: 'Faturası kesilecek', value: 'Yok' }} />
}

/** Otoyol köşeli seçim düğmeleri: yan yana, aralarında çizgi; seçili olan accent zeminli. */
const segmentGroup = 'overflow-hidden rounded-lg border border-line bg-white divide-x divide-line'
const segment = (on: boolean, pad = 'px-4') => clsx(pad, 'inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap text-[0.8125rem] font-semibold transition [&_svg]:size-4',
  on ? 'bg-accent text-white' : 'text-muted hover:bg-surface-2 hover:text-fg')

/** Tutar hücresindeki sözcük ("Kâr", "Gider"): hücre Overpass Mono olsa da yazı normal kalır, yalnız rakam mono. */
const Word = ({ children }: { children: ReactNode }) => <span className="font-sans tracking-normal">{children}</span>

/** İptal / sorun nedeni varsa durum hücresinde kısa uyarı satırı. */
function ProblemInfo({ t }: { t: Trip }) {
  if (!t.ops?.problemReason) return null
  return <span className="mt-0.5 flex max-w-48 items-center gap-1 text-sm font-medium text-warn" title={t.ops.problemNote ?? undefined}>
    <TriangleAlert className="size-3.5 shrink-0" /><span className="truncate">{t.ops.problemReason}</span></span>
}

/** Süzgeç kutusu: serbest yazı + sektör önerileri (datalist). */
function OptionInput({ ariaLabel, placeholder, value, onChange, list }: { ariaLabel: string; placeholder: string; value: string; onChange: (v: string) => void; list: SectorOption[] }) {
  const id = `opt-${ariaLabel.replace(/\W+/g, '-')}`
  return <>
    <input className="input" aria-label={ariaLabel} placeholder={placeholder} list={id} value={value} onChange={(e) => onChange(e.target.value)} />
    <datalist id={id}>{list.map((o) => <option key={o.value} value={o.value} />)}</datalist>
  </>
}

/** "Şablondan": kayıtlı şablonlar (sık kullanılan önce); seçince yeni sevkiyat formu dolu açılır. Şablon buradan silinebilir. */
function TemplatePicker({ onClose, onPick }: { onClose: () => void; onPick: (t: TripTemplate) => void }) {
  const [q, setQ] = useState('')
  const list = useQuery({ queryKey: ['trip-templates'], queryFn: () => get<TripTemplate[]>('/trip-templates') })
  const [deleting, setDeleting] = useState<TripTemplate | null>(null)
  const use = useSave((t: TripTemplate) => post<TripTemplate>(`/trip-templates/${t.id}/use`, {}), { invalidate: ['trip-templates'], onSuccess: onPick })
  const remove = useSave((t: TripTemplate) => del(`/trip-templates/${t.id}`), {
    invalidate: ['trip-templates'], success: 'Şablon silindi.', onSuccess: () => setDeleting(null),
  })
  const needle = q.trim().toLocaleLowerCase('tr')
  const rows = (list.data ?? []).filter((t) => !needle || [t.name, t.customerTitle, t.loadingCity, t.deliveryCity, t.loadingAddress, t.deliveryAddress]
    .some((x) => x?.toLocaleLowerCase('tr').includes(needle)))
  return (
    <Modal open onClose={onClose} title="Şablondan yeni sevkiyat" size="md" guard={false}
      footer={<Button variant="secondary" onClick={onClose}>Kapat</Button>}>
      <div className="space-y-3">
        <SearchBox value={q} onChange={setQ} placeholder="Şablon, müşteri, güzergâh ara..." />
        {list.isLoading ? <Loading /> : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[0.9375rem] text-muted">
            {list.data?.length ? 'Aramaya uyan şablon yok.' : <>Henüz şablon yok. Bir sevkiyatı açıp <b>“Şablon olarak kaydet”</b> deyin; sonra buradan tek tıkla yeni sevkiyat açılır.</>}
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line" aria-label="Şablonlar">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center gap-2 bg-white px-3 py-2.5 hover:bg-surface-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => use.mutate(t)} disabled={use.isPending}>
                  <span className="block truncate font-semibold text-fg">{t.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {[t.customerTitle, `${t.loadingCity || t.loadingAddress} → ${t.deliveryCity || t.deliveryAddress}`, t.transportMode, t.trailerType,
                      t.salePrice != null ? tl(t.salePrice) : null].filter(Boolean).join(' · ')}
                  </span>
                </button>
                {t.useCount > 0 && <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">{t.useCount} kez</span>}
                <IconButton write label={`“${t.name}” şablonunu sil`} onClick={() => setDeleting(t)}><Trash2 className="size-4" /></IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog open={!!deleting} title="Şablonu sil" loading={remove.isPending} confirmText="Sil"
        message={<>“{deleting?.name}” şablonu silinecek. Bu şablondan açılmış sevkiyatlar etkilenmez.</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting)} />
      {use.error ? <p className="mt-2 text-sm text-bad">{errorMessage(use.error)}</p> : null}
    </Modal>
  )
}
