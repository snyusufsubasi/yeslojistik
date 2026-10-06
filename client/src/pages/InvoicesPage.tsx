import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ban, Download, Eye, FileCheck2, FileText, Mail, Plus, Printer, Wallet } from 'lucide-react'
import { download, errorMessage, get, openPdf, post, withQuery } from '../api/client'
import type { CompanySettings, EInvoiceInfo, EInvoiceStatus, Invoice, InvoiceStatus, InvoiceTotals, PagedResult, Trip } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { useRowSelection } from '../lib/selection'
import { ExportButton, PdfButton } from '../components/Exports'
import { SumStrip } from '../components/SumStrip'
import { PaymentForm } from '../components/PaymentForm'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, ConfirmDialog, Empty, Figure, Figures, Loading, Modal, PageHeader, PlateBadge, Select, DateFilter } from '../components/ui'
import { SearchSelect } from '../components/FormSelect'
import { ImportButton } from '../components/ImportDialog'
import { FirstUse } from '../components/FirstUse'
import { useAuth } from '../lib/auth'
import { date, tl2 } from '../lib/format'
import { useDebounce, useListTotals, useLookup, usePaged, usePage, useSave } from '../lib/hooks'
import { invoiceStatusLabel, options, paymentStatusTone } from '../lib/labels'

export default function InvoicesPage() {
  const { can } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [unpaid, setUnpaid] = useState(!!params.get('unpaid'))
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tripNo, setTripNo] = useState('')
  const [sort, setSort] = useState({ key: 'date', desc: true })
  const [viewing, setViewing] = useState<number | null>(params.get('id') ? Number(params.get('id')) : null)
  const pendingTab = params.get('sekme') === 'bekleyen'
  const debounced = useDebounce(search)
  const debouncedTripNo = useDebounce(tripNo.trim())
  const customers = useLookup('customers')
  const [page, setPage] = usePage([debounced, status, customerId, unpaid, from, to, debouncedTripNo])
  const selection = useRowSelection<Invoice>((i) => i.id, [debounced, status, customerId, unpaid, from, to, debouncedTripNo])
  useEffect(() => {
    if (params.get('id') || params.get('unpaid')) { params.delete('id'); params.delete('unpaid'); setParams(params, { replace: true }) }
  }, [params, setParams])

  const query = { page, pageSize: 20, search: debounced, status, customerId, unpaid: unpaid || undefined, from, to, tripNo: debouncedTripNo, sort: sort.key, desc: sort.desc }
  // Fatura İcmali: süzgeçteki ya da seçilen faturaların listesi (PDF), müşteriye fatura ekinde gönderilir.
  const icmal = (params: object) => openPdf(withQuery('/invoices/summary-pdf', params), 'fatura-icmali.pdf').catch((e) => toast.error(errorMessage(e)))
  const { data, isFetching, error, refetch } = usePaged<Invoice>('invoices', query)

  const pdf = (i: Invoice) => openPdf(`/invoices/${i.id}/pdf`, `${i.invoiceNo}.pdf`).catch((e) => toast.error(errorMessage(e)))

  const columns: Column<Invoice>[] = [
    { key: 'date', header: 'Tarih / Vade', sortKey: 'date', render: (i) => <>{date(i.date)}<span className="block text-sm text-slate-500">Vade: {date(i.dueDate)}</span></> },
    { key: 'no', header: 'Fatura No', sortKey: 'invoiceNo', render: (i) => <><span className="font-medium">{i.invoiceNo}</span>
      {i.eInvoiceNo && <span className="block text-sm text-slate-500">{i.eInvoiceNo} · {eInvoiceStatusLabel[i.eInvoiceStatus ?? 'None']}</span>}</> },
    { key: 'customer', header: 'Müşteri', sortKey: 'customer', className: 'whitespace-normal! min-w-40', render: (i) => i.customerTitle },
    { key: 'total', header: 'Tutar', sortKey: 'total', align: 'right', render: (i) => tl2(i.total) },
    { key: 'rem', header: 'Kalan', align: 'right', render: (i) => i.remaining > 0 ? <span className="font-semibold text-bad">{tl2(i.remaining)}</span> : <span className="text-slate-400">—</span> },
    { key: 'status', header: 'Durum', sortKey: 'status', render: (i) => <Badge tone={paymentStatusTone(i.paymentStatus)}>{i.paymentStatus}</Badge> },
    {
      key: 'actions', header: 'İşlemler', align: 'right', render: (i) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" icon={<Eye className="size-4" />} onClick={() => setViewing(i.id)}>Aç</Button>
          <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => pdf(i)}>PDF</Button>
        </div>
      ),
    },
  ]

  const { data: totals } = useListTotals<InvoiceTotals>('invoices', query)

  return (
    <>
      <PageHeader title="Faturalar" subtitle="Kesilen faturalar ve tahsilat durumu"
        actions={<>
          <ExportButton url="/invoices/export" params={query} fileName="faturalar.xlsx" />
          <PdfButton url="/invoices/summary-pdf" params={{ ...query, page: undefined, pageSize: undefined }} fileName="fatura-icmali.pdf" label="Fatura İcmali"
            icon={<FileText className="size-4" />} />
          {can('accounting') && <ImportButton entity="invoices" />}
          {can('accounting') && <Button write icon={<Plus className="size-4" />} onClick={() => navigate('/faturalar/yeni')}>Yeni Fatura</Button>}
        </>} />
      {pendingTab ? (
        <PendingInvoices onIssue={(custId, tripIds) => navigate(`/faturalar/yeni?customerId=${custId}&tripIds=${tripIds.join(',')}`)} />
      ) : (
      <Card title="Fatura Listesi" icon={<FileText className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Fatura no, müşteri..." />}>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-4 sm:px-6 py-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <SearchSelect ariaLabel="Müşteri" value={customerId === "" ? null : customerId} onChange={(v) => setCustomerId(v ?? "")} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <Select aria-label="Durum" value={status} onChange={setStatus} options={options(invoiceStatusLabel)} placeholder="Tüm durumlar" />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
          <input className="input" type="search" aria-label="Sevkiyat no" placeholder="Sevkiyat no" value={tripNo} onChange={(e) => setTripNo(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={unpaid} onChange={(e) => setUnpaid(e.target.checked)} /> Sadece ödenmemiş
          </label>
        </div>
        {totals && totals.count > 0 && <SumStrip label="Filtre toplamı" items={[
          { label: 'Fatura', value: totals.count },
          { label: 'Matrah', value: tl2(totals.subtotal) },
          { label: 'KDV', value: tl2(totals.vatAmount) },
          { label: 'Tevkifat', value: tl2(totals.withholdingAmount) },
          { label: 'Genel toplam', value: tl2(totals.total) },
          { label: 'Kalan', value: tl2(totals.remaining), tone: totals.remaining > 0 ? 'text-bad' : 'text-good' },
        ]} end={status ? undefined : { label: 'Tutarlar kesilen faturalardan; taslak ve iptaller hariç.', note: true }} />}
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(i) => i.id} onRowClick={(i) => setViewing(i.id)}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage}
          selectable selection={selection} rowLabel={(i) => `Fatura ${i.invoiceNo}`}
          bulkActions={(rows) => <>
            <Button size="sm" variant="secondary" icon={<Download />}
              onClick={() => download('/invoices/export', { ids: rows.map((i) => i.id).join(','), sort: sort.key, desc: sort.desc }, 'secilen-faturalar.xlsx')
                .catch((e) => toast.error(errorMessage(e)))}>Excel'e aktar</Button>
            <Button size="sm" variant="secondary" icon={<FileText />}
              onClick={() => icmal({ ids: rows.map((i) => i.id).join(','), status: status || undefined })}>Fatura İcmali</Button>
          </>}
          empty={debounced || status || customerId || unpaid || from || to || debouncedTripNo
            ? 'Bu filtrelere uyan fatura yok.'
            : (
              <FirstUse title="Henüz fatura kesilmedi" addLabel="Yeni fatura" onAdd={can('accounting') ? () => navigate('/faturalar/yeni') : undefined}>
                Teslim edilen sevkiyatları “Yeni Fatura” ile faturalayın. Eski programda kestiğiniz faturalar için “Excel'den Aktar” düğmesini kullanın.
              </FirstUse>)}
          mobileCard={(i) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-fg">{i.invoiceNo}</span>
                <Badge tone={paymentStatusTone(i.paymentStatus)}>{i.paymentStatus}</Badge>
              </div>
              <div className="text-sm">{i.customerTitle}</div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 text-muted">{date(i.date)} · vade {date(i.dueDate)}</span>
                <span className="shrink-0 font-semibold tabular-nums">{tl2(i.total)}</span>
              </div>
              {i.remaining > 0 && <div className="text-right text-sm font-semibold text-bad">Kalan <span className="tabular-nums">{tl2(i.remaining)}</span></div>}
            </div>
          )} />
      </Card>
      )}
      {viewing && <InvoiceDetail id={viewing} onClose={() => setViewing(null)} onPdf={pdf} />}
    </>
  )
}

function InvoiceDetail({ id, onClose, onPdf }: { id: number; onClose: () => void; onPdf: (i: Invoice) => void }) {
  const { can } = useAuth()
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [mailing, setMailing] = useState(false)
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => get<CompanySettings>('/settings'), staleTime: 60_000 })
  const { data: inv, error: invError, refetch: refetchInv } = useQuery({ queryKey: ['invoices', 'detail', id], queryFn: () => get<Invoice>(`/invoices/${id}`) })
  const issue = useSave(() => post<Invoice>(`/invoices/${id}/issue`), { invalidate: ['invoices', 'customers'], success: 'Fatura kesildi.' })
  const cancel = useSave(() => post<Invoice>(`/invoices/${id}/cancel`), {
    invalidate: ['invoices', 'customers', 'trips'], success: 'Fatura iptal edildi.', onSuccess: () => setCancelling(false),
  })

  return (
    <Modal open onClose={onClose} title={inv ? `Fatura ${inv.invoiceNo}` : 'Fatura'} size="lg"
      footer={inv && <>
        {can('accounting') && inv.status !== 'Cancelled' && <Button variant="secondary" icon={<Ban className="size-4" />} onClick={() => setCancelling(true)}>İptal Et</Button>}
        {can('accounting') && inv.status === 'Draft' && <Button icon={<FileCheck2 className="size-4" />} loading={issue.isPending} onClick={() => issue.mutate(undefined)}>Faturayı Kes</Button>}
        {can('accounting') && inv.status === 'Issued' && inv.remaining > 0 && <Button write variant="success" icon={<Wallet className="size-4" />} onClick={() => setPaying(true)}>Tahsilat Ekle</Button>}
        {can('accounting') && inv.status === 'Issued' && settings.data?.emailEnabled &&
          <Button variant="secondary" icon={<Mail className="size-4" />} onClick={() => setMailing(true)}>E-posta Gönder</Button>}
        <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => onPdf(inv)}>PDF</Button>
      </>}>
      {!inv ? <Loading error={invError} onRetry={refetchInv} /> : (
        <div className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <KV label="Müşteri" value={inv.customerTitle} />
            <KV label="Tarih" value={date(inv.date)} />
            <KV label="Vade" value={date(inv.dueDate)} />
            <KV label="Durum" value={<Badge tone={paymentStatusTone(inv.paymentStatus)}>{inv.paymentStatus}</Badge>} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead><tr><th className="th">Açıklama</th><th className="th text-right">Tutar</th></tr></thead>
              <tbody>{inv.lines.map((l) => <tr key={l.id}><td className="td whitespace-normal">{l.description}</td><td className="td whitespace-nowrap text-right tabular-nums">{tl2(l.amount)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <Sum label="Ara Toplam" value={inv.subtotal} />
            <Sum label={`KDV (%${inv.vatRate})`} value={inv.vatAmount} />
            {inv.withholdingTenths > 0 && <Sum label={`Tevkifat (${inv.withholdingTenths}/10)`} value={-inv.withholdingAmount} />}
            <div className="border-t border-slate-200 pt-1"><Sum label="Genel Toplam" value={inv.total} bold /></div>
            {inv.status === 'Issued' && <>
              <Sum label="Tahsil Edilen" value={inv.paid} />
              <Sum label="Kalan" value={inv.remaining} bold tone={inv.remaining > 0 ? 'text-bad' : 'text-good'} />
            </>}
          </div>
          {inv.notes && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{inv.notes}</p>}
          {inv.ettn && <EInvoicePanel inv={inv} />}
        </div>
      )}
      {paying && inv && <PaymentForm payment={null} defaults={{ customerId: inv.customerId, invoiceId: inv.id, amount: inv.remaining }} onClose={() => setPaying(false)} />}
      {mailing && inv && <EmailDialog invoice={inv} onClose={() => setMailing(false)} />}
      <ConfirmDialog open={cancelling} title="Faturayı iptal et" loading={cancel.isPending} confirmText="İptal Et"
        message="Fatura iptal edilecek ve bağlı sevkiyatlar tekrar faturalanabilir hale gelecek. Fatura numarası korunur. Emin misiniz?"
        onClose={() => setCancelling(false)} onConfirm={() => cancel.mutate(undefined)} />
    </Modal>
  )
}

export const eInvoiceStatusLabel: Record<EInvoiceStatus, string> = {
  None: '—', Ready: 'Gönderilmeye hazır', Sent: 'Gönderildi', Delivered: 'Alıcıya ulaştı', Accepted: 'Kabul edildi',
  Rejected: 'Reddedildi', Failed: 'Hata', CancelRequested: 'İptal talep edildi', Cancelled: 'İptal edildi',
}
const eInvoiceStatusTone: Record<EInvoiceStatus, 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'teal'> = {
  None: 'gray', Ready: 'yellow', Sent: 'blue', Delivered: 'teal', Accepted: 'green', Rejected: 'red', Failed: 'red', CancelRequested: 'yellow', Cancelled: 'gray',
}
const scenarioLabel = { EArsiv: 'e-Arşiv', Temel: 'e-Fatura (Temel)', Ticari: 'e-Fatura (Ticari)' } as const

/** e-Fatura / e-Arşiv bilgisi ve işlemleri: XML indir, gönder (entegratör varsa) ya da gönderildi olarak işaretle, durum, iptal onayı. */
function EInvoicePanel({ inv }: { inv: Invoice }) {
  const { can } = useAuth()
  const toast = useToast()
  const info = useQuery({ queryKey: ['einvoice', 'info'], queryFn: () => get<EInvoiceInfo>('/einvoice/info'), enabled: can('accounting'), staleTime: 300_000 })
  const act = useSave((path: string) => post<Invoice>(`/invoices/${inv.id}/einvoice/${path}`), { invalidate: ['invoices'], success: 'e-Fatura güncellendi.' })
  const status = inv.eInvoiceStatus ?? 'None'
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-navy-900">{inv.scenario ? scenarioLabel[inv.scenario] : 'e-Fatura'}{inv.typeCode === 'Tevkifat' && ' · Tevkifatlı'}</span>
        <Badge tone={eInvoiceStatusTone[status]}>{eInvoiceStatusLabel[status]}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <KV label="e-Fatura No" value={<span className="font-mono">{inv.eInvoiceNo}</span>} />
        <KV label="ETTN" value={<span className="break-all font-mono text-sm">{inv.ettn}</span>} />
      </div>
      {inv.eInvoiceMessage && <p className="mt-2 text-sm text-slate-600">{inv.eInvoiceMessage}</p>}
      {can('accounting') && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<Download className="size-4" />}
            onClick={() => download(`/invoices/${inv.id}/einvoice/xml`, undefined, `${inv.eInvoiceNo}.xml`).catch((e) => toast.error(errorMessage(e)))}>XML indir</Button>
          {(status === 'Ready' || status === 'Failed') && info.data?.canSend &&
            <Button size="sm" loading={act.isPending} onClick={() => act.mutate('send')}>Entegratöre Gönder</Button>}
          {(status === 'Ready' || status === 'Failed') && info.data && !info.data.canSend &&
            <Button size="sm" loading={act.isPending} onClick={() => act.mutate('mark-sent')}>Gönderildi olarak işaretle</Button>}
          {info.data?.supportsStatus && ['Sent', 'Delivered', 'CancelRequested'].includes(status) &&
            <Button size="sm" variant="secondary" loading={act.isPending} onClick={() => act.mutate('status')}>Durumu yenile</Button>}
          {status === 'CancelRequested' &&
            <Button size="sm" variant="secondary" loading={act.isPending} onClick={() => act.mutate('cancel-confirmed')}>İptal tamamlandı</Button>}
        </div>
      )}
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-sm text-slate-500">{label}</div><div className="font-medium">{value}</div></div>
}

function Sum({ label, value, bold, tone }: { label: string; value: number; bold?: boolean; tone?: string }) {
  return <div className={`flex justify-between ${bold ? 'font-semibold' : ''} ${tone ?? ''}`}><span>{label}</span><span className="tabular-nums">{tl2(value)}</span></div>
}

function EmailDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const customer = useQuery({ queryKey: ['customers', 'summary', invoice.customerId], queryFn: () => get<{ customer: { email?: string | null } }>(`/customers/${invoice.customerId}`) })
  const [to, setTo] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const address = to ?? customer.data?.customer.email ?? ''
  const send = useSave(() => post<{ sentTo: string }>(`/invoices/${invoice.id}/email`, { to: address || null, message: message || null }), {
    invalidate: [], success: 'Fatura e-postayla gönderildi.', onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title={`${invoice.invoiceNo} – E-posta Gönder`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button icon={<Mail className="size-4" />} disabled={!address} loading={send.isPending} onClick={() => send.mutate(undefined)}>Gönder</Button></>}>
      <div className="space-y-3">
        <label className="block"><span className="label">Alıcı</span>
          <input className="input" type="email" value={address} onChange={(e) => setTo(e.target.value)} placeholder="muhasebe@musteri.com" />
        </label>
        <label className="block"><span className="label">Ek mesaj (isteğe bağlı)</span>
          <textarea className="input min-h-20" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <p className="text-sm text-slate-500">Fatura PDF olarak eklenir; tutar, vade ve IBAN bilgisi e-postada yazılır.</p>
      </div>
    </Modal>
  )
}

/**
 * Faturalandırılacaklar: teslim edilmiş ama faturası kesilmemiş sevkiyatlar, müşteriye göre gruplanır.
 * Şartname: docs/plan/06-FATURALANDIRILACAKLAR.md. Sunucu değişikliği gerekmez; `TripQuery.Invoiced` ve
 * `Status` süzgeçleri kullanılır (`server/YesLojistik.Core/Dtos/TripDtos.cs:59,65`).
 * "Fatura Kes" düğmesi sevkiyatları seçili hâlde fatura ekranını açar (`InvoiceCreatePage.tsx:49-57`).
 */
function PendingInvoices({ onIssue }: { onIssue: (customerId: number, tripIds: number[]) => void }) {
  const { can } = useAuth()
  const q = useQuery({
    queryKey: ['trips', 'pending-invoice'],
    queryFn: () => get<PagedResult<Trip>>('/trips', { status: 'Delivered', invoiced: false, pageSize: 500, sort: 'deliveryDate', desc: false }),
  })
  const groups = useMemo(() => {
    const map = new Map<number, { customerId: number; customerTitle: string; trips: Trip[]; total: number }>()
    for (const t of q.data?.items ?? []) {
      const g = map.get(t.customerId) ?? { customerId: t.customerId, customerTitle: t.customerTitle, trips: [], total: 0 }
      g.trips.push(t)
      g.total += t.salePrice
      map.set(t.customerId, g)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [q.data])
  const total = groups.reduce((s, g) => s + g.total, 0)
  const cols: Column<Trip>[] = [
    { key: 'delivery', header: 'Teslim', render: (t) => date(t.deliveryDate) },
    { key: 'route', header: 'Güzergâh', render: (t) => [t.loadingCity ?? t.loadingAddress, t.deliveryCity ?? t.deliveryAddress].filter(Boolean).join(' → ') },
    { key: 'plate', header: 'Araç', render: (t) => <PlateBadge plate={t.vehiclePlate} /> },
    { key: 'sale', header: 'Satış (KDV hariç)', align: 'right', render: (t) => tl2(t.salePrice) },
  ]
  if (q.error) return <Loading error={q.error} onRetry={() => q.refetch()} />
  if (q.isLoading) return <Loading />
  return (
    <div className="space-y-4">
      <Figures label="Faturalandırılacaklar" className="sm:grid-cols-2">
        <Figure label="Faturalanacak sevkiyat" value={q.data?.total ?? 0} sub="Teslim edildi, faturası kesilmedi" />
        <Figure label="Toplam (KDV hariç)" value={tl2(total)} sub="Satış tutarı" />
      </Figures>
      {groups.length === 0 && (
        <Card bodyClassName="p-0"><Empty>Faturalandırılacak sevkiyat yok. Teslim edilen sevkiyatlar burada birikir.</Empty></Card>
      )}
      {groups.map((g) => (
        <Card key={g.customerId} title={g.customerTitle} icon={<FileText className="size-4" />} bodyClassName="p-0"
          actions={<span className="flex items-center gap-3">
            <span className="text-[0.875rem] text-muted">{g.trips.length} sevkiyat · <b className="tabular-nums">{tl2(g.total)}</b></span>
            {can('accounting') && (
              <Button write size="sm" icon={<Plus className="size-4" />}
                onClick={() => onIssue(g.customerId, g.trips.map((t) => t.id))}>Fatura Kes</Button>
            )}
          </span>}>
          <DataTable columns={cols} rows={g.trips} rowKey={(t) => t.id} empty="Sevkiyat yok." />
        </Card>
      ))}
    </div>
  )
}
