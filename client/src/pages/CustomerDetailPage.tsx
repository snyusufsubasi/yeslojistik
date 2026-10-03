import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BellRing, FileSpreadsheet, FileText, Mail, MapPin, Pencil, Phone, Plus, Trash2, UserCircle2, Wallet } from 'lucide-react'
import { errorMessage, get, openPdf, post } from '../api/client'
import type { AccountMovement, CompanySettings, CustomerSummary, Invoice, Payment, Trip } from '../api/types'
import { CustomerForm } from '../components/CustomerForm'
import { DataTable, type Column } from '../components/DataTable'
import { PaymentForm } from '../components/PaymentForm'
import { Badge, Button, Card, ConfirmDialog, Modal, PageHeader, Spinner, Tabs } from '../components/ui'
import { ExportButton } from '../components/Exports'
import { useToast } from '../components/Toast'
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
  const [statement, setStatement] = useState<false | 'statement' | 'reminder'>(false)
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
          <Button variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => setStatement('statement')}>Hesap Ekstresi</Button>
          {s.overdueAmount > 0 && <Button variant="secondary" icon={<BellRing className="size-4" />} onClick={() => setStatement('reminder')}>Vade Hatırlatma</Button>}
          {s.tripCount === 0 && s.totalDebit === 0 && s.totalCredit === 0 &&
            <Button variant="secondary" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>Sil</Button>}
          {can('accounting') && <Button write variant="success" icon={<Wallet className="size-4" />} onClick={() => setPaying(true)}>Tahsilat Ekle</Button>}
          {can('accounting') && <Button write icon={<Plus className="size-4" />} onClick={() => navigate(`/faturalar/yeni?customerId=${id}`)}>Yeni Fatura</Button>}
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
      {statement && <StatementDialog customerId={id} title={c.title} email={c.email} phone={c.phone}
        reminder={statement === 'reminder' ? { overdue: s.overdueAmount, balance: s.balance } : undefined} onClose={() => setStatement(false)} />}
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
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`${big ? 'text-3xl' : 'text-2xl'} font-semibold ${tone}`}>{tl2(value)}</div>
      {sub && <div className="text-sm text-slate-500">{sub}</div>}
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

function firstOfYear() {
  return `${new Date().getFullYear()}-01-01`
}

function StatementDialog({ customerId, title, email, phone, reminder, onClose }:
  { customerId: number; title: string; email?: string | null; phone?: string | null; reminder?: { overdue: number; balance: number }; onClose: () => void }) {
  const { can } = useAuth()
  const toast = useToast()
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => get<CompanySettings>('/settings') })
  const [from, setFrom] = useState(firstOfYear())
  const [to, setTo] = useState('')
  const [recipient, setRecipient] = useState(email ?? '')
  const reminderText = reminder
    ? `Sayın ${title} yetkilisi, cari hesabınızda vadesi geçmiş ${tl2(reminder.overdue)} tutarında bakiye bulunmaktadır (toplam bakiye ${tl2(reminder.balance)}). Hesap ekstresi ektedir. Ödemenizi rica eder, mutabakat için dönüşünüzü bekleriz.`
    : ''
  const [message, setMessage] = useState(reminderText)
  const waPhone = phone?.replace(/\D/g, '').replace(/^0/, '90')
  const whatsapp = reminder && waPhone ? `https://wa.me/${waPhone.startsWith('90') ? waPhone : `90${waPhone}`}?text=${encodeURIComponent(reminderText)}` : null
  const range = { from: from || null, to: to || null }
  const query = new URLSearchParams(Object.entries(range).filter(([, v]) => v) as [string, string][]).toString()
  const send = useSave(() => post<{ sentTo: string }>(`/customers/${customerId}/statement/email`, { ...range, recipient: recipient || null, message: message || null }), {
    invalidate: [], success: reminder ? 'Vade hatırlatması e-postayla gönderildi.' : 'Hesap ekstresi e-postayla gönderildi.', onSuccess: onClose,
  })
  const canMail = can('accounting') && !!settings.data?.emailEnabled

  return (
    <Modal open onClose={onClose} title={`${title} – ${reminder ? 'Vade Hatırlatma' : 'Hesap Ekstresi'}`} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Kapat</Button>
        {whatsapp && <a className="btn inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-[0.9375rem] font-medium text-emerald-800 hover:bg-emerald-100"
          href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
        {canMail && <Button variant="secondary" icon={<Mail className="size-4" />} disabled={!recipient} loading={send.isPending} onClick={() => send.mutate(undefined)}>E-postayla Gönder</Button>}
        <ExportButton url={`/customers/${customerId}/statement`} params={{ ...range, format: 'xlsx' }} fileName="ekstre.xlsx" />
        <Button icon={<FileText className="size-4" />}
          onClick={() => openPdf(`/customers/${customerId}/statement${query ? `?${query}` : ''}`, 'ekstre.pdf').catch((e) => toast.error(errorMessage(e)))}>PDF Aç</Button>
      </>}>
      <div className="space-y-3">
        {reminder && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Vadesi geçmiş {tl2(reminder.overdue)}. E-postayla ekstre ve aşağıdaki mesaj gider; WhatsApp düğmesi aynı mesajı hazırlar.</p>}
        {!canMail && reminder && <p className="text-sm text-slate-600">E-posta ayarlı değilse yalnızca WhatsApp ve PDF kullanılabilir.</p>}
        <p className="text-[0.9375rem] text-slate-700">Seçilen dönemdeki faturalar ve tahsilatlar, devreden bakiye ve güncel bakiyeyle listelenir. Mutabakat için müşteriye gönderebilirsiniz.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Başlangıç</span>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="block"><span className="label">Bitiş</span>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <p className="text-sm text-slate-600">Tarihleri boş bırakırsanız bütün hareketler alınır.</p>
        {canMail && <>
          <label className="block"><span className="label">Alıcı e-posta</span>
            <input className="input" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="muhasebe@musteri.com" /></label>
          <label className="block"><span className="label">Ek mesaj (isteğe bağlı)</span>
            <textarea className="input min-h-16" value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        </>}
      </div>
    </Modal>
  )
}
