import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ban, Download, Eye, FileCheck2, FileText, Plus, Printer, Wallet } from 'lucide-react'
import { download, errorMessage, get, openPdf, post } from '../api/client'
import type { Invoice, InvoiceStatus } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { PaymentForm } from '../components/PaymentForm'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, ConfirmDialog, IconButton, Modal, PageHeader, Select, Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { date, tl2 } from '../lib/format'
import { useDebounce, useLookup, usePaged, useSave } from '../lib/hooks'
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
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'date', desc: true })
  const [viewing, setViewing] = useState<number | null>(params.get('id') ? Number(params.get('id')) : null)
  const debounced = useDebounce(search)
  const customers = useLookup('customers')
  useEffect(() => setPage(1), [debounced, status, customerId, unpaid, from, to])
  useEffect(() => {
    if (params.get('id') || params.get('unpaid')) { params.delete('id'); params.delete('unpaid'); setParams(params, { replace: true }) }
  }, [params, setParams])

  const query = { page, pageSize: 20, search: debounced, status, customerId, unpaid: unpaid || undefined, from, to, sort: sort.key, desc: sort.desc }
  const { data, isFetching } = usePaged<Invoice>('invoices', query)

  const pdf = (i: Invoice) => openPdf(`/invoices/${i.id}/pdf`, `${i.invoiceNo}.pdf`).catch((e) => toast.error(errorMessage(e)))

  const columns: Column<Invoice>[] = [
    { key: 'date', header: 'Tarih', sortKey: 'date', render: (i) => date(i.date) },
    { key: 'no', header: 'Fatura No', sortKey: 'invoiceNo', render: (i) => <span className="font-medium">{i.invoiceNo}</span> },
    { key: 'customer', header: 'Müşteri', sortKey: 'customer', render: (i) => i.customerTitle },
    { key: 'due', header: 'Vade', sortKey: 'dueDate', render: (i) => date(i.dueDate) },
    { key: 'total', header: 'Tutar', sortKey: 'total', align: 'right', render: (i) => tl2(i.total) },
    { key: 'rem', header: 'Kalan', align: 'right', render: (i) => i.remaining > 0 ? <span className="text-red-600">{tl2(i.remaining)}</span> : '—' },
    { key: 'status', header: 'Durum', sortKey: 'status', render: (i) => <Badge tone={paymentStatusTone(i.paymentStatus)}>{i.paymentStatus}</Badge> },
    {
      key: 'actions', header: 'İşlemler', align: 'right', render: (i) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton label="Görüntüle" onClick={() => setViewing(i.id)}><Eye className="size-4" /></IconButton>
          <IconButton label="PDF" onClick={() => pdf(i)}><Printer className="size-4" /></IconButton>
          <IconButton label="PDF indir" onClick={() => download(`/invoices/${i.id}/pdf`, { download: true }, `${i.invoiceNo}.pdf`)}><Download className="size-4" /></IconButton>
        </div>
      ),
    },
  ]

  const total = data?.items.reduce((s, i) => s + (i.status === 'Issued' ? i.total : 0), 0) ?? 0
  const remaining = data?.items.reduce((s, i) => s + i.remaining, 0) ?? 0

  return (
    <>
      <PageHeader title="Faturalar" subtitle="Kesilen faturalar ve tahsilat durumu"
        actions={<>
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => download('/invoices/export', query, 'faturalar.xlsx')}>Excel</Button>
          {can('accounting') && <Button icon={<Plus className="size-4" />} onClick={() => navigate('/faturalar/yeni')}>Yeni Fatura</Button>}
        </>} />
      <Card title="Fatura Listesi" icon={<FileText className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Fatura no, müşteri..." />}>
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-3 md:grid-cols-5">
          <Select aria-label="Müşteri" value={customerId} onChange={setCustomerId} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <Select aria-label="Durum" value={status} onChange={setStatus} options={options(invoiceStatusLabel)} placeholder="Tüm durumlar" />
          <input className="input" type="date" aria-label="Başlangıç" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" aria-label="Bitiş" value={to} onChange={(e) => setTo(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={unpaid} onChange={(e) => setUnpaid(e.target.checked)} /> Sadece ödenmemiş
          </label>
        </div>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(i) => i.id} onRowClick={(i) => setViewing(i.id)}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty="Fatura bulunamadı."
          footer={data && data.items.length > 0 ? (
            <tr className="bg-slate-50 text-sm font-semibold">
              <td className="td" colSpan={4}>Sayfa toplamı</td>
              <td className="td text-right">{tl2(total)}</td>
              <td className="td text-right text-red-600">{tl2(remaining)}</td>
              <td className="td" colSpan={2} />
            </tr>
          ) : undefined} />
      </Card>
      {viewing && <InvoiceDetail id={viewing} onClose={() => setViewing(null)} onPdf={pdf} />}
    </>
  )
}

function InvoiceDetail({ id, onClose, onPdf }: { id: number; onClose: () => void; onPdf: (i: Invoice) => void }) {
  const { can } = useAuth()
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { data: inv, isLoading } = useQuery({ queryKey: ['invoices', 'detail', id], queryFn: () => get<Invoice>(`/invoices/${id}`) })
  const issue = useSave(() => post<Invoice>(`/invoices/${id}/issue`), { invalidate: ['invoices', 'customers'], success: 'Fatura kesildi.' })
  const cancel = useSave(() => post<Invoice>(`/invoices/${id}/cancel`), {
    invalidate: ['invoices', 'customers', 'trips'], success: 'Fatura iptal edildi.', onSuccess: () => setCancelling(false),
  })

  return (
    <Modal open onClose={onClose} title={inv ? `Fatura ${inv.invoiceNo}` : 'Fatura'} size="lg"
      footer={inv && <>
        {can('accounting') && inv.status !== 'Cancelled' && <Button variant="secondary" icon={<Ban className="size-4" />} onClick={() => setCancelling(true)}>İptal Et</Button>}
        {can('accounting') && inv.status === 'Draft' && <Button icon={<FileCheck2 className="size-4" />} loading={issue.isPending} onClick={() => issue.mutate(undefined)}>Faturayı Kes</Button>}
        {can('accounting') && inv.status === 'Issued' && inv.remaining > 0 && <Button variant="success" icon={<Wallet className="size-4" />} onClick={() => setPaying(true)}>Tahsilat Ekle</Button>}
        <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => onPdf(inv)}>PDF</Button>
      </>}>
      {isLoading || !inv ? <Spinner /> : (
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
              <tbody>{inv.lines.map((l) => <tr key={l.id}><td className="td whitespace-normal">{l.description}</td><td className="td text-right">{tl2(l.amount)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <Sum label="Ara Toplam" value={inv.subtotal} />
            <Sum label={`KDV (%${inv.vatRate})`} value={inv.vatAmount} />
            {inv.withholdingTenths > 0 && <Sum label={`Tevkifat (${inv.withholdingTenths}/10)`} value={-inv.withholdingAmount} />}
            <div className="border-t border-slate-200 pt-1"><Sum label="Genel Toplam" value={inv.total} bold /></div>
            {inv.status === 'Issued' && <>
              <Sum label="Tahsil Edilen" value={inv.paid} />
              <Sum label="Kalan" value={inv.remaining} bold tone={inv.remaining > 0 ? 'text-red-600' : 'text-emerald-700'} />
            </>}
          </div>
          {inv.notes && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{inv.notes}</p>}
        </div>
      )}
      {paying && inv && <PaymentForm payment={null} defaults={{ customerId: inv.customerId, invoiceId: inv.id, amount: inv.remaining }} onClose={() => setPaying(false)} />}
      <ConfirmDialog open={cancelling} title="Faturayı iptal et" loading={cancel.isPending} confirmText="İptal Et"
        message="Fatura iptal edilecek ve bağlı seferler tekrar faturalanabilir hale gelecek. Fatura numarası korunur. Emin misiniz?"
        onClose={() => setCancelling(false)} onConfirm={() => cancel.mutate(undefined)} />
    </Modal>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-slate-500">{label}</div><div className="font-medium">{value}</div></div>
}

function Sum({ label, value, bold, tone }: { label: string; value: number; bold?: boolean; tone?: string }) {
  return <div className={`flex justify-between ${bold ? 'font-bold' : ''} ${tone ?? ''}`}><span>{label}</span><span>{tl2(value)}</span></div>
}
