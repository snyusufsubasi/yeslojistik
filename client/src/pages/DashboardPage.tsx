import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, CheckCircle, Circle, X, CalendarClock, CheckCircle2, CircleDollarSign, Clock, FileText, Plus, Route, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { get } from '../api/client'
import type { Alert, CashFlow, Dashboard, Invoice, Trip, Vehicle } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { Badge, Button, Card, Spinner, StatCard } from '../components/ui'
import { usePageTitle } from '../lib/usePageTitle'
import { useAuth } from '../lib/auth'
import { date, daysUntil, MONTHS, tl } from '../lib/format'
import { paymentStatusTone, tripStatusLabel, tripStatusTone, vehicleStatusLabel, vehicleStatusTone } from '../lib/labels'

export default function DashboardPage() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 60_000 })
  usePageTitle('Ana Sayfa')
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: () => get<Alert[]>('/dashboard/alerts'), refetchInterval: 5 * 60_000 })

  if (isLoading || !data) return <Spinner />

  const tripCols: Column<Trip>[] = [
    { key: 'date', header: 'Tarih', render: (t) => date(t.loadingDate) },
    { key: 'customer', header: 'Müşteri', className: 'whitespace-normal! min-w-32', render: (t) => <>{t.customerTitle}<span className="block text-[13px] text-slate-500">{t.vehiclePlate}</span></> },
    { key: 'route', header: 'Güzergah', className: 'whitespace-normal! min-w-44', render: (t) => <>{t.loadingAddress} <span className="text-slate-500">→</span> {t.deliveryAddress}</> },
    { key: 'status', header: 'Durum', render: (t) => <Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge> },
    { key: 'price', header: 'Tutar', align: 'right', render: (t) => tl(t.salePrice) },
  ]
  const vehicleCols: Column<Vehicle>[] = [
    { key: 'plate', header: 'Plaka', render: (v) => <><span className="font-medium">{v.plate}</span><span className="block text-[13px] text-slate-500">{v.km.toLocaleString('tr-TR')} km</span></> },
    { key: 'type', header: 'Araç Tipi', render: (v) => [v.brand, v.model].filter(Boolean).join(' ') || v.type },
    { key: 'driver', header: 'Şoför', render: (v) => v.defaultDriverName ?? '—' },
    { key: 'status', header: 'Durum', render: (v) => <Badge tone={vehicleStatusTone[v.status]}>{vehicleStatusLabel[v.status]}</Badge> },
    {
      key: 'maint', header: 'Sonraki Bakım', render: (v) => {
        const d = daysUntil(v.nextMaintenanceDate)
        return <span className={d !== null && d <= 15 ? 'font-medium text-red-600' : ''}>{date(v.nextMaintenanceDate)}</span>
      },
    },
  ]
  const invoiceCols: Column<Invoice>[] = [
    { key: 'no', header: 'Fatura', render: (i) => <><span className="font-medium">{i.invoiceNo}</span><span className="block max-w-36 truncate text-[13px] text-slate-500">{i.customerTitle}</span></> },
    { key: 'total', header: 'Tutar', align: 'right', render: (i) => <>{tl(i.total)}<span className="mt-0.5 block"><Badge tone={paymentStatusTone(i.paymentStatus)}>{i.paymentStatus}</Badge></span></> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Hoş Geldiniz, {user?.fullName}</h1>
          <p className="text-sm text-slate-500">YES LOJİSTİK – Nakliye Takip Sistemi</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('operations') && <Button icon={<Plus className="size-4" />} onClick={() => navigate('/seferler?new=1')}>Yeni Sefer</Button>}
          {can('accounting') && <Button icon={<Plus className="size-4" />} onClick={() => navigate('/faturalar/yeni')}>Yeni Fatura</Button>}
          <Button variant="success" icon={<Plus className="size-4" />} onClick={() => navigate('/musteriler?new=1')}>Yeni Müşteri</Button>
          {can('accounting') && <Button variant="secondary" icon={<BarChart3 className="size-4" />} onClick={() => navigate('/raporlar')}>Raporlar</Button>}
        </div>
      </div>

      {data.setup.sampleData && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[15px] text-amber-900">
          <span><b>Şu an örnek (demo) veriler görüntüleniyor.</b> Gerçek kullanıma başlamadan önce bunları temizleyin.</span>
          {can('admin') && <Button size="sm" variant="secondary" onClick={() => navigate('/ayarlar?tab=data')}>Demo verilerini temizle</Button>}
        </div>
      )}

      <SetupCard setup={data.setup} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard color="blue" title="Toplam Sefer" value={data.monthTripCount} sub="Bu ay" icon={<Truck className="size-7" />}
          onClick={() => navigate('/seferler')} />
        <StatCard color="green" title="Teslim Edilen" value={data.monthDeliveredCount} sub="Bu ay" icon={<CheckCircle2 className="size-7" />}
          onClick={() => navigate('/seferler?status=Delivered')} />
        <StatCard color="orange" title="Bekleyen / Devam Eden" value={data.activeTripCount} sub={`${data.plannedTripCount} planlandı`} icon={<Clock className="size-7" />}
          onClick={() => navigate('/seferler?status=Planned')} />
        <StatCard color="red" title="Tahsilat Bekleyen" value={data.receivableInvoiceCount} sub={`Toplam Tutar: ${tl(data.receivableTotal)}`}
          icon={<CircleDollarSign className="size-7" />} onClick={() => navigate('/faturalar?unpaid=1')} />
      </div>

      {can('accounting') && (data.uninvoicedTripCount > 0 || data.pendingExpenseCount > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.uninvoicedTripCount > 0 && (
            <Link to="/faturalar/yeni" className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-brand-800 hover:bg-brand-100">
              <span><span className="font-semibold">{data.uninvoicedTripCount} teslim edilmiş sefer faturalanmadı</span>
                <span className="block text-sm">Toplam {tl(data.uninvoicedTripTotal)} + KDV</span></span>
              <span className="whitespace-nowrap text-sm font-semibold">Fatura kes →</span>
            </Link>
          )}
          {data.pendingExpenseCount > 0 && (
            <Link to="/giderler?onay=Pending" className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 hover:bg-amber-100">
              <span><span className="font-semibold">{data.pendingExpenseCount} şoför masrafı onay bekliyor</span>
                <span className="block text-sm">Toplam {tl(data.pendingExpenseTotal)}</span></span>
              <span className="whitespace-nowrap text-sm font-semibold">İncele →</span>
            </Link>
          )}
        </div>
      )}

      {can('accounting') && <CashFlowCard />}

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Günlük Seferler" icon={<Route className="size-4" />} bodyClassName="p-0"
          actions={<Button size="sm" variant="ghost" onClick={() => navigate('/seferler')}>Tümünü Gör →</Button>}>
          <DataTable columns={tripCols} rows={data.todayTrips} rowKey={(t) => t.id} empty="Bugün için sefer yok." />
          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 p-3">
            <MiniStat icon={<Truck className="size-5" />} label="Toplam Araç" value={data.vehicleCount} />
            <MiniStat icon={<Route className="size-5" />} label="Yoldaki Araç" value={data.vehiclesOnRoad} />
            <MiniStat icon={<CalendarClock className="size-5" />} label="Bekleyen Sefer" value={data.plannedTripCount} />
          </div>
        </Card>
        <Card title="Bu Ay" icon={<BarChart3 className="size-4" />}>
          <dl className="space-y-3 text-sm">
            <Row label="Sefer cirosu" value={tl(data.monthRevenue)} />
            <Row label="Araç maliyeti + giderler" value={tl(data.monthExpenses)} />
            <Row label="Brüt kâr" value={tl(data.monthRevenue - data.monthExpenses)} strong
              tone={data.monthRevenue - data.monthExpenses < 0 ? 'text-red-600' : data.monthRevenue - data.monthExpenses > 0 ? 'text-emerald-700' : undefined} />
            <Row label="Açık alacak" value={tl(data.receivableTotal)} tone={data.receivableTotal > 0 ? 'text-red-600' : undefined} />
            {can('accounting') && (
              <button type="button" className="block w-full text-left" onClick={() => navigate('/tedarikciler')}>
                <Row label="Ödenecek (taşeron)" value={tl(data.payableTotal)} tone={data.payableTotal > 0 ? 'text-orange-600' : undefined} />
                {data.payableOverdue > 0 && <p className="mt-1 text-right text-xs text-red-600">Vadesi geçen: {tl(data.payableOverdue)}</p>}
              </button>
            )}
          </dl>
          <TrendChart rows={data.trend} />
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Araç Takip / Araçlar" icon={<Truck className="size-4" />} bodyClassName="p-0"
          actions={<Button size="sm" variant="ghost" onClick={() => navigate('/araclar')}>Tümünü Gör →</Button>}>
          <DataTable columns={vehicleCols} rows={data.vehicles} rowKey={(v) => v.id} empty="Henüz araç eklenmemiş." />
        </Card>
        <div className="space-y-4">
          <Card title="Dikkat Edilecekler" icon={<AlertTriangle className="size-4" />} bodyClassName="p-0">
            {alerts.data?.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">Her şey yolunda.</p>}
            <ul className="divide-y divide-slate-100">
              {alerts.data?.slice(0, 5).map((a, i) => (
                <li key={i}>
                  <Link to={a.link} className="flex gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', a.severity === 'danger' ? 'bg-red-500' : 'bg-amber-400')} />
                    <span className="min-w-0 text-sm">
                      <span className="font-medium text-slate-800">{a.title}</span>
                      <span className="block text-slate-500">{a.message}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {(alerts.data?.length ?? 0) > 5 && <p className="border-t border-slate-100 px-4 py-2 text-[13px] text-slate-500">+{alerts.data!.length - 5} uyarı daha (zil simgesi)</p>}
          </Card>
          <Card title="Son Faturalar" icon={<FileText className="size-4" />} bodyClassName="p-0"
            actions={<Button size="sm" variant="ghost" onClick={() => navigate('/faturalar')}>Tümünü Gör →</Button>}>
            <DataTable columns={invoiceCols} rows={data.recentInvoices} rowKey={(i) => i.id} empty="Henüz fatura yok."
              onRowClick={(i) => navigate(`/faturalar?id=${i.id}`)} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
      <span className="text-brand-600">{icon}</span>
      <div>
        <div className="text-[13px] text-slate-500">{label}</div>
        <div className="text-lg font-bold text-navy-900">{value}</div>
      </div>
    </div>
  )
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`${strong ? 'font-bold' : 'font-medium'} ${tone ?? 'text-slate-800'}`}>{value}</dd>
    </div>
  )
}

// Kategorik palet (sabit sıra): 1 mavi, 2 turuncu — raporlardaki grafikle aynı.
function TrendChart({ rows }: { rows: Dashboard['trend'] }) {
  const chart = rows.map((r) => ({ name: MONTHS[r.month - 1].slice(0, 3), Ciro: r.revenue, Maliyet: r.cost }))
  if (rows.every((r) => r.revenue === 0 && r.cost === 0)) return null
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="mb-1 flex items-center justify-between text-[13px] text-slate-500">
        <span>Son 6 ay</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#2a78d6]" />Ciro</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#eb6834]" />Maliyet</span>
        </span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} barGap={2} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => tl(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            <Bar dataKey="Ciro" fill="#2a78d6" radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} />
            <Bar dataKey="Maliyet" fill="#eb6834" radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const SETUP_HIDDEN_KEY = 'yl.setupHidden'

/** İlk kurulumda ne yapılacağını adım adım gösterir; hepsi tamamlanınca (veya kapatılınca) kaybolur. */
function SetupCard({ setup }: { setup: Dashboard['setup'] }) {
  const { can } = useAuth()
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(SETUP_HIDDEN_KEY) === '1' } catch { return false }
  })
  const steps = [
    { done: setup.companyInfo && setup.companyDetails, title: 'Firma bilgilerini girin', text: 'VKN, adres, il ve IBAN faturalarda görünür.', to: '/ayarlar', show: can('admin') },
    { done: setup.supplierCount > 0, title: 'Kiralık araç sahiplerini ekleyin', text: 'Taşeronlara borç ve ödemeler için (kiralık araç yoksa atlayın).', to: '/tedarikciler', show: true },
    { done: setup.vehicleCount > 0, title: 'Araçları ekleyin', text: 'Tek tek ya da Excel listesinden toplu aktarın.', to: '/araclar', show: true },
    { done: setup.driverCount > 0, title: 'Şoförleri ekleyin', text: 'Ehliyet ve SRC bitiş tarihleri için uyarı alırsınız.', to: '/soforler', show: true },
    { done: setup.customerCount > 0, title: 'Müşterileri ekleyin', text: 'Eski borçları “Devir Bakiyesi” olarak girebilirsiniz.', to: '/musteriler', show: true },
    { done: setup.tripCount > 0, title: 'İlk seferi oluşturun', text: 'Sefer bitince “Fatura Kes” ile faturalayın.', to: '/seferler?new=1', show: true },
    { done: setup.userCount > 1, title: 'Çalışan hesaplarını açın', text: 'Operasyon, muhasebe ve şoför (mobil) hesapları.', to: '/ayarlar?tab=users', show: can('admin') },
    { done: !!setup.lastBackupAt, title: 'İlk yedeği indirin', text: 'Ayarlar → Veriler → Tam yedeği indir. Haftada bir tekrarlayın.', to: '/ayarlar?tab=data', show: can('admin') },
  ].filter((s) => s.show)
  const doneCount = steps.filter((s) => s.done).length
  if (hidden || doneCount === steps.length) return null
  const hide = () => {
    setHidden(true)
    try { localStorage.setItem(SETUP_HIDDEN_KEY, '1') } catch { /* tarayıcı depolamayı engelliyor olabilir */ }
  }
  return (
    <Card title={`Başlarken · ${doneCount}/${steps.length} tamamlandı`} icon={<CheckCircle className="size-5" />}
      actions={<button onClick={hide} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><X className="size-4" /> Gizle</button>}>
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Link to={s.to} className={clsx('flex h-full gap-3 rounded-lg border p-3 transition hover:border-brand-500 hover:bg-brand-50',
              s.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200')}>
              {s.done ? <CheckCircle2 className="size-6 shrink-0 text-emerald-600" /> : <Circle className="size-6 shrink-0 text-slate-400" />}
              <span>
                <span className={clsx('block font-semibold', s.done ? 'text-emerald-800 line-through decoration-emerald-400' : 'text-navy-900')}>{i + 1}. {s.title}</span>
                <span className="block text-sm text-slate-600">{s.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/** Önümüzdeki 4 hafta: beklenen tahsilat (fatura vadeleri + portföydeki çek/senet) ve ödemeler (taşeron/tedarikçi vadeleri). */
function CashFlowCard() {
  const flow = useQuery({ queryKey: ['dashboard', 'cash-flow'], queryFn: () => get<CashFlow>('/dashboard/cash-flow') })
  if (!flow.data) return null
  const b = flow.data.buckets
  const net = (i: number) => b[i].expectedIn + b[i].instrumentsIn - b[i].expectedOut
  return (
    <Card title="Nakit Akışı: Önümüzdeki 30 Gün" icon={<CircleDollarSign className="size-4" />} bodyClassName="p-0"
      actions={<Link to="/kasa-banka" className="text-sm font-medium text-brand-700">Kasa / banka: {tl(flow.data.cashOnHand)} →</Link>}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th" />{b.map((x) => <th key={x.label} className="th text-right">{x.label}</th>)}</tr></thead>
          <tbody>
            <tr><td className="td">Beklenen tahsilat</td>{b.map((x, i) => <td key={i} className="td text-right">{tl(x.expectedIn)}</td>)}</tr>
            <tr><td className="td">Çek / senet vadesi</td>{b.map((x, i) => <td key={i} className="td text-right">{tl(x.instrumentsIn)}</td>)}</tr>
            <tr><td className="td">Ödenecek (taşeron/tedarikçi)</td>{b.map((x, i) => <td key={i} className="td text-right text-orange-700">{tl(x.expectedOut)}</td>)}</tr>
            <tr className="font-semibold"><td className="td">Net</td>{b.map((_, i) => <td key={i} className={clsx('td text-right', net(i) < 0 ? 'text-red-600' : 'text-emerald-700')}>{tl(net(i))}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}
