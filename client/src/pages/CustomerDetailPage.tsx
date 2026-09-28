import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText, Mail, MapPin, Pencil, Phone, Plus, Trash2, UserCircle2, Wallet } from 'lucide-react'
import { get } from '../api/client'
import type { AccountMovement, CustomerSummary, Invoice, Payment, Trip } from '../api/types'
import { CustomerForm } from '../components/CustomerForm'
import { DataTable, type Column } from '../components/DataTable'
import { PaymentForm } from '../components/PaymentForm'
import { Badge, Button, Card, ConfirmDialog, PageHeader, Spinner, Tabs } from '../components/ui'
import { useAuth } from '../lib/auth'
import { date, tl, tl2 } from '../lib/format'
import { crud, usePaged, useSave } from '../lib/hooks'
import { paymentMethodLabel, paymentStatusTone, tripStatusLabel, tripStatusTone } from '../lib/labels'

type Tab = 'movements' | 'trips' | 'invoices' | 'payments'

export default function CustomerDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('movements')
  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const summary = useQuery({ queryKey: ['customers', 'summary', id], queryFn: () => get<CustomerSummary>(`/customers/${id}`) })
  const deleteMut = useSave(() => crud('customers').remove(id), { invalidate: ['customers'], success: 'Müşteri silindi.', onSuccess: () => navigate('/musteriler') })

  if (summary.isLoading) return <Spinner />
  if (!summary.data) return <p className="text-sm text-slate-500">Müşteri bulunamadı. <Link className="text-brand-600" to="/musteriler">Listeye dön</Link></p>
  const s = summary.data
  const c = s.customer

  return (
    <>
      <PageHeader title={c.title} subtitle={<>Müşteri No: {c.customerNo} · {s.tripCount} sefer</>}
        actions={<>
          <Button variant="secondary" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/musteriler')}>Geri</Button>
          <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>Düzenle</Button>
          {s.tripCount === 0 && s.totalDebit === 0 && s.totalCredit === 0 &&
            <Button variant="secondary" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>Sil</Button>}
          {can('accounting') && <Button variant="success" icon={<Wallet className="size-4" />} onClick={() => setPaying(true)}>Tahsilat Ekle</Button>}
          {can('accounting') && <Button icon={<Plus className="size-4" />} onClick={() => navigate(`/faturalar/yeni?customerId=${id}`)}>Yeni Fatura</Button>}
        </>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Cari Bilgileri" icon={<UserCircle2 className="size-4" />}>
          <dl className="space-y-2 text-sm">
            <Info label="VKN / TCKN" value={c.taxNumber} />
            <Info label="Vergi Dairesi" value={c.taxOffice} />
            <Info label="Telefon" value={c.phone && <a className="text-brand-600" href={`tel:${c.phone.replace(/\s/g, '')}`}><Phone className="mr-1 inline size-3" />{c.phone}</a>} />
            <Info label="E-posta" value={c.email && <a className="text-brand-600" href={`mailto:${c.email}`}><Mail className="mr-1 inline size-3" />{c.email}</a>} />
            <Info label="Adres" value={c.address && <><MapPin className="mr-1 inline size-3" />{c.address}</>} />
            {c.notes && <Info label="Not" value={c.notes} />}
            {c.openingBalance > 0 && <Info label="Devir Bakiyesi" value={<>{tl2(c.openingBalance)} ({date(c.openingBalanceDate)})</>} />}
          </dl>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Amount label="Toplam Borç (Faturalanan)" value={s.totalDebit} tone="text-red-600" />
          <Amount label="Toplam Alacak (Tahsil Edilen)" value={s.totalCredit} tone="text-emerald-700" />
          <Amount label="Cari Bakiye" value={s.balance} tone={s.balance > 0 ? 'text-red-600' : 'text-emerald-700'} big
            sub={s.balance < 0 ? 'Müşteri fazla ödeme yapmış (avans)' : undefined} />
          <Amount label="Vadesi Geçen" value={s.overdueAmount} tone={s.overdueAmount > 0 ? 'text-red-600' : 'text-slate-700'} />
        </div>
      </div>

      <Card className="mt-4" bodyClassName="p-0">
        <div className="px-4 pt-2">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'movements', label: 'Hareketler' },
            { value: 'trips', label: 'Seferler' },
            { value: 'invoices', label: 'Faturalar' },
            { value: 'payments', label: 'Tahsilatlar' },
          ]} />
        </div>
        {tab === 'movements' && <Movements id={id} />}
        {tab === 'trips' && <CustomerTrips id={id} />}
        {tab === 'invoices' && <CustomerInvoices id={id} />}
        {tab === 'payments' && <CustomerPayments id={id} />}
      </Card>

      {editing && <CustomerForm customer={c} onClose={() => setEditing(false)} />}
      {paying && <PaymentForm payment={null} defaults={{ customerId: id }} onClose={() => setPaying(false)} />}
      <ConfirmDialog open={deleting} title="Müşteriyi sil" message={<>{c.title} silinecek. Emin misiniz?</>} confirmText="Sil"
        loading={deleteMut.isPending} onClose={() => setDeleting(false)} onConfirm={() => deleteMut.mutate(undefined)} />
    </>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800">{value || '—'}</dd>
    </div>
  )
}

function Amount({ label, value, tone, big, sub }: { label: string; value: number; tone: string; big?: boolean; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`${big ? 'text-3xl' : 'text-2xl'} font-bold ${tone}`}>{tl2(value)}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

function Movements({ id }: { id: number }) {
  const { data, isLoading } = useQuery({ queryKey: ['customers', 'movements', id], queryFn: () => get<AccountMovement[]>(`/customers/${id}/movements`) })
  const cols: Column<AccountMovement>[] = [
    { key: 'date', header: 'Tarih', render: (m) => date(m.date) },
    { key: 'type', header: 'İşlem', render: (m) => <span className="inline-flex items-center gap-1">{m.type !== 'Tahsilat' ? <FileText className="size-3.5 text-brand-600" /> : <Wallet className="size-3.5 text-emerald-600" />}{m.type}</span> },
    { key: 'ref', header: 'Belge', render: (m) => m.reference },
    { key: 'desc', header: 'Açıklama', render: (m) => m.description ?? '' },
    { key: 'debit', header: 'Borç', align: 'right', render: (m) => m.debit ? tl2(m.debit) : '' },
    { key: 'credit', header: 'Alacak', align: 'right', render: (m) => m.credit ? tl2(m.credit) : '' },
    { key: 'balance', header: 'Bakiye', align: 'right', render: (m) => <span className="font-medium">{tl2(m.runningBalance)}</span> },
    { key: 'status', header: 'Durum', render: (m) => <Badge tone={m.type !== 'Tahsilat' ? paymentStatusTone(m.status) : 'green'}>{m.status}</Badge> },
  ]
  return <DataTable columns={cols} rows={data ? [...data].reverse() : undefined} loading={isLoading} rowKey={(m) => m.type + m.reference} empty="Henüz hareket yok." />
}

function CustomerTrips({ id }: { id: number }) {
  const [page, setPage] = useState(1)
  const { data, isFetching } = usePaged<Trip>('trips', { customerId: id, page, pageSize: 15 })
  const cols: Column<Trip>[] = [
    { key: 'date', header: 'Tarih', render: (t) => date(t.loadingDate) },
    { key: 'route', header: 'Güzergah', render: (t) => `${t.loadingAddress} → ${t.deliveryAddress}` },
    { key: 'plate', header: 'Plaka', render: (t) => t.vehiclePlate },
    { key: 'status', header: 'Durum', render: (t) => <Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge> },
    { key: 'price', header: 'Tutar', align: 'right', render: (t) => tl(t.salePrice) },
    { key: 'inv', header: 'Fatura', render: (t) => t.invoiceNo ?? <span className="text-amber-600">Faturalanmadı</span> },
  ]
  return <DataTable columns={cols} rows={data?.items} loading={isFetching} rowKey={(t) => t.id} page={page} pageSize={15} total={data?.total} onPage={setPage} />
}

function CustomerInvoices({ id }: { id: number }) {
  const [page, setPage] = useState(1)
  const { data, isFetching } = usePaged<Invoice>('invoices', { customerId: id, page, pageSize: 15 })
  const cols: Column<Invoice>[] = [
    { key: 'no', header: 'Fatura No', render: (i) => <Link className="text-brand-600 hover:underline" to={`/faturalar?id=${i.id}`}>{i.invoiceNo}</Link> },
    { key: 'date', header: 'Tarih', render: (i) => date(i.date) },
    { key: 'due', header: 'Vade', render: (i) => date(i.dueDate) },
    { key: 'total', header: 'Tutar', align: 'right', render: (i) => tl2(i.total) },
    { key: 'rem', header: 'Kalan', align: 'right', render: (i) => tl2(i.remaining) },
    { key: 'status', header: 'Durum', render: (i) => <Badge tone={paymentStatusTone(i.paymentStatus)}>{i.paymentStatus}</Badge> },
  ]
  return <DataTable columns={cols} rows={data?.items} loading={isFetching} rowKey={(i) => i.id} page={page} pageSize={15} total={data?.total} onPage={setPage} />
}

function CustomerPayments({ id }: { id: number }) {
  const [page, setPage] = useState(1)
  const { data, isFetching } = usePaged<Payment>('payments', { customerId: id, page, pageSize: 15 })
  const cols: Column<Payment>[] = [
    { key: 'date', header: 'Tarih', render: (p) => date(p.date) },
    { key: 'inv', header: 'Fatura', render: (p) => p.invoiceNo ?? '—' },
    { key: 'method', header: 'Yöntem', render: (p) => paymentMethodLabel[p.method] },
    { key: 'desc', header: 'Açıklama', render: (p) => p.description ?? '' },
    { key: 'amount', header: 'Tutar', align: 'right', render: (p) => tl2(p.amount) },
  ]
  return <DataTable columns={cols} rows={data?.items} loading={isFetching} rowKey={(p) => p.id} page={page} pageSize={15} total={data?.total} onPage={setPage} />
}
