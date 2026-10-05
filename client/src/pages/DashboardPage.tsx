import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, CheckCircle, Circle, X, CheckCircle2, CircleDollarSign, FileText, Plus, Rocket, Route, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { get } from '../api/client'
import type { Alert, CashFlow, Dashboard, Invoice, Trip, Vehicle } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { Badge, Button, Card, Figure, Figures, Loading, MirrorContext, PlateBadge } from '../components/ui'
import { useIsNewUi } from '../lib/uiMode'
import { SectionTabs } from '../components/shell/SectionTabs'
import { usePageTitle } from '../lib/usePageTitle'
import { readOnboarding, writeOnboarding } from '../lib/onboarding'
import { useAuth } from '../lib/auth'
import { quickActions } from '../lib/quickActions'
import { chart as palette, chartTick } from '../lib/chart'
import { date, daysUntil, longDate, MONTHS, tl } from '../lib/format'
import { paymentStatusTone, tripStatusLabel, tripStatusTone, vehicleStatusLabel, vehicleStatusTone } from '../lib/labels'

export default function DashboardPage() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const { data, error, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 60_000 })
  const isNew = useIsNewUi()
  usePageTitle(isNew ? 'Bugün' : 'Ana Sayfa')
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: () => get<Alert[]>('/dashboard/alerts'), refetchInterval: 5 * 60_000 })

  if (!data) return <Loading error={error} onRetry={refetch} className={error ? 'card mx-auto mt-10 max-w-md' : undefined} />

  const tripCols: Column<Trip>[] = [
    { key: 'date', header: 'Tarih', render: (t) => date(t.loadingDate) },
    { key: 'customer', header: 'Müşteri', className: 'whitespace-normal! min-w-32', render: (t) => <>{t.customerTitle}{t.vehiclePlate && <span className="mt-0.5 block"><PlateBadge plate={t.vehiclePlate} /></span>}</> },
    { key: 'route', header: 'Güzergah', className: 'whitespace-normal! min-w-44', render: (t) => <>{t.loadingAddress} <span className="text-slate-500">→</span> {t.deliveryAddress}</> },
    { key: 'status', header: 'Durum', render: (t) => <Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge> },
    { key: 'price', header: 'Tutar', align: 'right', render: (t) => tl(t.salePrice) },
  ]
  const vehicleCols: Column<Vehicle>[] = [
    { key: 'plate', header: 'Plaka', render: (v) => <><PlateBadge plate={v.plate} /><span className="block text-sm text-slate-500">{v.km.toLocaleString('tr-TR')} km</span></> },
    { key: 'type', header: 'Araç Tipi', render: (v) => [v.brand, v.model].filter(Boolean).join(' ') || v.type },
    { key: 'driver', header: 'Şoför', render: (v) => v.defaultDriverName ?? '—' },
    { key: 'status', header: 'Durum', render: (v) => <Badge tone={vehicleStatusTone[v.status]}>{vehicleStatusLabel[v.status]}</Badge> },
    {
      key: 'maint', header: 'Sonraki Bakım', render: (v) => {
        const d = daysUntil(v.nextMaintenanceDate)
        return <span className={d !== null && d <= 15 ? 'font-semibold text-bad' : ''}>{date(v.nextMaintenanceDate)}</span>
      },
    },
  ]
  const invoiceCols: Column<Invoice>[] = [
    { key: 'no', header: 'Fatura', render: (i) => <><span className="font-medium">{i.invoiceNo}</span><span className="block max-w-36 truncate text-sm text-slate-500">{i.customerTitle}</span></> },
    { key: 'total', header: 'Tutar', align: 'right', render: (i) => <>{tl(i.total)}<span className="mt-0.5 block"><Badge tone={paymentStatusTone(i.paymentStatus)}>{i.paymentStatus}</Badge></span></> },
  ]

  if (isNew) return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-[-0.01em] text-fg">Bugün</h1>
          <p className="mt-1 text-[0.875rem] text-muted">{longDate()}</p>
        </div>
        {can('operations') && <Button write icon={<Plus className="size-4" />} onClick={() => navigate('/seferler?new=1')}>Sevkiyat Ekle</Button>}
      </div>
      <SectionTabs />
      {can('admin') && !data.setup.companyInfo && !readOnboarding().cardHidden && !readOnboarding().finished && <OnboardingCard />}
      <Figures label="Sevkiyat durumu" className="sm:grid-cols-3">
        <Figure label="Yüklenmeyi bekleyen" value={data.plannedTripCount} sub="Planlandı" onClick={() => navigate('/seferler?status=Planned')} />
        <Figure label="Yolda / yüklendi" value={Math.max(0, data.activeTripCount - data.plannedTripCount)} sub="Şu an" onClick={() => navigate('/seferler?status=OnRoad')} />
        <Figure label="Teslim edilen" value={data.monthDeliveredCount} sub="Bu ay" onClick={() => navigate('/seferler?status=Delivered')} />
      </Figures>
      {can('accounting') && data.uninvoicedTripCount > 0 && (
        <Link to="/faturalar/yeni" className="flex items-center justify-between gap-3 rounded-[4px] border border-[#ecd896] bg-bill-soft px-4 py-2.5 text-[0.9375rem] text-bill hover:bg-[#f8e3a0]">
          <span><b>{data.uninvoicedTripCount} teslim edilmiş sevkiyat faturalanmadı</b> · <span className="font-mono">{tl(data.uninvoicedTripTotal)}</span> + KDV</span>
          <span className="whitespace-nowrap font-semibold">Fatura kes →</span>
        </Link>
      )}
      {data.pendingExpenseCount > 0 && (
        <Link to="/giderler?onay=Pending" className="flex items-center justify-between gap-3 rounded-[4px] border border-[#ecd3a6] bg-warn-soft px-4 py-2.5 text-[0.9375rem] text-warn hover:bg-[#f7e2bd]">
          <span><b>{data.pendingExpenseCount} şoför masrafı onay bekliyor</b> · <span className="font-mono">{tl(data.pendingExpenseTotal)}</span></span>
          <span className="whitespace-nowrap font-semibold">İncele →</span>
        </Link>
      )}
      <Card title="Bugünkü sevkiyatlar" icon={<Route className="size-4" />} bodyClassName="p-0"
        actions={<Button size="sm" variant="ghost" onClick={() => navigate('/seferler')}>Tüm sevkiyatlar →</Button>}>
        <DataTable columns={tripCols} rows={data.todayTrips} rowKey={(t) => t.id} onRowClick={(t) => navigate(`/seferler?id=${t.id}`)}
          empty="Bugün için sevkiyat yok." />
      </Card>
      {can('admin') && data.setup.sampleData && (
        <p className="text-[0.8125rem] text-muted">Şu an örnek (demo) veriler görünüyor. Temizlemek için: Yönetici → Veriler.</p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-[-0.01em] text-fg">{greeting()}, {user?.fullName}</h1>

      <QuickActions />

      {data.setup.sampleData && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#ecd3a6] bg-warn-soft px-4 py-3 text-[0.875rem] text-[#6b4200]">
          <span><b>Şu an örnek (demo) veriler görüntüleniyor.</b> Gerçek kullanıma başlamadan önce bunları temizleyin.</span>
          {can('admin') && <Button size="sm" variant="secondary" onClick={() => navigate('/ayarlar?tab=data')}>Demo verilerini temizle</Button>}
        </div>
      )}

      {can('admin') && !data.setup.companyInfo && !readOnboarding().cardHidden && !readOnboarding().finished
        ? <OnboardingCard />
        : <SetupCard setup={data.setup} />}

      {/* Ana sayfa rakamları: 4 sütun, arası çizgi; bekleyen tahsilat sarı (bill-soft) vurgulu */}
      <Figures label="Bu ayın rakamları" className="sm:grid-cols-2 xl:grid-cols-4">
        <Figure label="Toplam Sevkiyat" value={data.monthTripCount} sub="Bu ay" onClick={() => navigate('/seferler')} />
        <Figure label="Teslim Edilen" value={data.monthDeliveredCount} sub="Bu ay" onClick={() => navigate('/seferler?status=Delivered')} />
        <Figure label="Devam Eden" value={data.activeTripCount} sub={`${data.plannedTripCount} planlandı`} onClick={() => navigate('/seferler?status=Planned')} />
        <Figure label="Tahsilat Bekleyen" value={data.receivableInvoiceCount} highlight={data.receivableInvoiceCount > 0}
          sub={<>Toplam tutar: <span className="font-mono font-semibold">{tl(data.receivableTotal)}</span></>} onClick={() => navigate('/faturalar?unpaid=1')} />
      </Figures>

      {can('accounting') && (data.uninvoicedTripCount > 0 || data.pendingExpenseCount > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.uninvoicedTripCount > 0 && (
            <Link to="/faturalar/yeni" className="flex items-center justify-between gap-3 rounded-[4px] border border-[#ecd896] bg-bill-soft px-4 py-3 text-[0.875rem] text-bill hover:bg-[#f8e3a0]">
              <span><span className="font-semibold">{data.uninvoicedTripCount} teslim edilmiş sevkiyat faturalanmadı</span>
                <span className="block text-[0.8125rem]">Toplam <span className="font-mono font-semibold">{tl(data.uninvoicedTripTotal)}</span> + KDV</span></span>
              <span className="whitespace-nowrap rounded-[3px] bg-accent px-3 py-1.5 font-semibold text-white">Fatura kes →</span>
            </Link>
          )}
          {data.pendingExpenseCount > 0 && (
            <Link to="/giderler?onay=Pending" className="flex items-center justify-between gap-3 rounded-[4px] border border-[#ecd3a6] bg-warn-soft px-4 py-3 text-[0.875rem] text-warn hover:bg-[#f7e2bd]">
              <span><span className="font-semibold">{data.pendingExpenseCount} şoför masrafı onay bekliyor</span>
                <span className="block text-[0.8125rem]">Toplam <span className="font-mono font-semibold">{tl(data.pendingExpenseTotal)}</span></span></span>
              <span className="whitespace-nowrap rounded-[3px] border border-line bg-white px-3 py-1.5 font-semibold text-fg">İncele →</span>
            </Link>
          )}
        </div>
      )}

      {can('accounting') && <CashFlowCard />}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Günlük Sevkiyatlar" icon={<Route className="size-4" />} bodyClassName="p-0"
          actions={<Button size="sm" variant="ghost" onClick={() => navigate('/seferler')}>Tümünü Gör →</Button>}>
          <DataTable columns={tripCols} rows={data.todayTrips} rowKey={(t) => t.id} empty="Bugün için sevkiyat yok." />
          <Figures className="grid-cols-3 rounded-none border-x-0 border-b-0">
            <Figure label="Toplam Araç" value={data.vehicleCount} />
            <Figure label="Yoldaki Araç" value={data.vehiclesOnRoad} />
            <Figure label="Bekleyen Sevkiyat" value={data.plannedTripCount} />
          </Figures>
        </Card>
        <Card title="Bu Ay" icon={<BarChart3 className="size-4" />}>
          <dl className="space-y-2.5 text-[0.875rem]">
            <Row label="Sevkiyat cirosu" value={tl(data.monthRevenue)} />
            <Row label="Araç maliyeti + giderler" value={tl(data.monthExpenses)} />
            <Row label="Brüt kâr" value={tl(data.monthRevenue - data.monthExpenses)} strong
              tone={data.monthRevenue - data.monthExpenses < 0 ? 'text-bad' : data.monthRevenue - data.monthExpenses > 0 ? 'text-good' : undefined} />
            <Row label="Açık alacak" value={tl(data.receivableTotal)} tone={data.receivableTotal > 0 ? 'text-bad' : undefined} />
            {can('accounting') && (
              <button type="button" className="block w-full text-left" onClick={() => navigate('/tedarikciler')}>
                <Row label="Ödenecek (taşeron)" value={tl(data.payableTotal)} tone={data.payableTotal > 0 ? 'text-warn' : undefined} />
                {data.payableOverdue > 0 && <p className="mt-1 text-right text-[0.8125rem] text-bad">Vadesi geçen: <span className="font-mono font-semibold">{tl(data.payableOverdue)}</span></p>}
              </button>
            )}
          </dl>
          <TrendChart rows={data.trend} />
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Araç Takip / Araçlar" icon={<Truck className="size-4" />} bodyClassName="p-0"
          actions={<Button size="sm" variant="ghost" onClick={() => navigate('/araclar')}>Tümünü Gör →</Button>}>
          <DataTable columns={vehicleCols} rows={data.vehicles} rowKey={(v) => v.id} empty="Henüz araç eklenmemiş." />
        </Card>
        <div className="space-y-4">
          <Card title="Dikkat Edilecekler" icon={<AlertTriangle className="size-4" />} bodyClassName="p-0">
            {alerts.data?.length === 0 && <p className="px-4 py-8 text-center text-[0.9375rem] text-slate-600">Her şey yolunda.</p>}
            <ul className="divide-y divide-slate-100">
              {alerts.data?.slice(0, 5).map((a, i) => (
                <li key={i}>
                  <Link to={a.link} className="flex gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className={clsx('mt-1.5 size-2 shrink-0', a.severity === 'danger' ? 'bg-bad' : 'bg-hl')} />
                    <span className="min-w-0 text-[0.9375rem]">
                      <span className="font-medium text-slate-900">{a.title}</span>
                      <span className="block text-slate-600">{a.message}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {(alerts.data?.length ?? 0) > 5 && <p className="border-t border-slate-100 px-4 py-2 text-sm text-slate-500">+{alerts.data!.length - 5} uyarı daha (zil simgesi)</p>}
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

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={clsx('font-mono tracking-[-0.02em]', strong ? 'font-semibold' : 'font-medium', tone ?? 'text-fg')}>{value}</dd>
    </div>
  )
}

// Raporlardaki grafikle aynı renkler: ciro accent yeşil, maliyet sarı.
function TrendChart({ rows }: { rows: Dashboard['trend'] }) {
  const chart = rows.map((r) => ({ name: MONTHS[r.month - 1].slice(0, 3), Ciro: r.revenue, Maliyet: r.cost }))
  if (rows.every((r) => r.revenue === 0 && r.cost === 0)) return null
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="mb-1 flex items-center justify-between text-[0.6875rem] font-bold uppercase tracking-[0.07em] text-muted">
        <span>Son 6 ay</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1"><span className="size-2" style={{ background: palette.accent }} />Ciro</span>
          <span className="flex items-center gap-1"><span className="size-2" style={{ background: palette.hl }} />Maliyet</span>
        </span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} barGap={2} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: palette.grid }} tick={chartTick} />
            <Tooltip cursor={{ fill: palette.cursor }} formatter={(v) => tl(Number(v))} contentStyle={{ fontSize: 13, borderRadius: 4, borderColor: palette.grid }} />
            <Bar dataKey="Ciro" fill={palette.accent} radius={[2, 2, 0, 0]} maxBarSize={16} isAnimationActive={false} />
            <Bar dataKey="Maliyet" fill={palette.hl} radius={[2, 2, 0, 0]} maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Yeni kurulumda (firma VKN ve adresi henüz girilmemişken) ana sayfanın en üstünde: kurulum sihirbazına çağrı. */
function OnboardingCard() {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <section aria-label="Kuruluma başlayın" className="rounded-[4px] border-2 border-accent bg-accent-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h2 className="flex items-center gap-2 text-[1.125rem] font-extrabold text-fg"><Rocket className="size-5 text-accent" /> Kuruluma başlayın</h2>
          <p className="mt-1 text-[0.9375rem] text-fg">Firma bilgilerinizi girin, müşteri ve araç listelerinizi Excel'den aktarın, çalışanlarınızı ekleyin. Yaklaşık 10 dakika sürer; istediğiniz adımı atlayabilirsiniz.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/kurulum" className="inline-flex min-h-10 items-center rounded-[3px] bg-accent px-4 text-[0.9375rem] font-semibold text-white hover:opacity-90">Kurulum sihirbazını aç</Link>
          <Button variant="ghost" onClick={() => { writeOnboarding({ cardHidden: true }); setHidden(true) }}>Şimdilik gizle</Button>
        </div>
      </div>
    </section>
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
    { done: setup.tripCount > 0, title: 'İlk sevkiyatı oluşturun', text: 'Sevkiyat bitince “Fatura Kes” ile faturalayın.', to: '/seferler?new=1', show: true },
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
            <Link to={s.to} className={clsx('flex h-full gap-3 rounded-[4px] border p-3 transition hover:border-accent hover:bg-accent-soft',
              s.done ? 'border-line bg-surface-2/50' : 'border-line bg-white')}>
              {s.done ? <CheckCircle2 className="size-5 shrink-0 text-good" /> : <Circle className="size-5 shrink-0 text-muted" />}
              <span>
                <span className={clsx('block font-semibold', s.done ? 'text-muted line-through decoration-slate-400' : 'text-fg')}>{i + 1}. {s.title}</span>
                <span className="block text-[0.8125rem] text-muted">{s.text}</span>
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
            <tr><td className="td">Beklenen tahsilat</td>{b.map((x, i) => <td key={i} className="td whitespace-nowrap text-right tabular-nums">{tl(x.expectedIn)}</td>)}</tr>
            <tr><td className="td">Çek / senet vadesi</td>{b.map((x, i) => <td key={i} className="td whitespace-nowrap text-right tabular-nums">{tl(x.instrumentsIn)}</td>)}</tr>
            <tr><td className="td">Ödenecek (taşeron/tedarikçi)</td>{b.map((x, i) => <td key={i} className="td whitespace-nowrap text-right text-warn">{tl(x.expectedOut)}</td>)}</tr>
            <tr className="font-semibold"><td className="td">Net</td>{b.map((_, i) => <td key={i} className={clsx('td whitespace-nowrap text-right', net(i) < 0 ? 'text-bad' : 'text-good')}>{tl(net(i))}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar'
}

/**
 * Ana sayfanın üstündeki büyük kutular: en sık yapılan işler tek tıkla açılır (yetkiye göre).
 * Ayna açıkken kutular yine görünür ama açılmaz: kayıt pratikortam'a girilir ("+ Yeni" menüsüyle aynı davranış).
 */
function QuickActions() {
  const { can } = useAuth()
  const mirror = useContext(MirrorContext)
  const [picked, setPicked] = useState<string | null>(null)
  const actions = quickActions.filter((a) => a.main && (!a.perm || can(a.perm)))
  const box = 'group flex min-h-12 items-center gap-2.5 rounded-[4px] border border-line bg-white px-3 py-2 text-left transition hover:border-slate-300 hover:bg-surface-2'
  return (
    <div className="space-y-2">
      <nav aria-label="Hızlı işlemler" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {actions.map((a) => {
          const inner = (<>
            <span className={clsx('flex size-8 shrink-0 items-center justify-center rounded-[3px]', a.tone)}>
              <a.icon className="size-4" />
            </span>
            <span className="text-[0.875rem] font-semibold leading-tight text-fg">{a.label}</span>
          </>)
          return mirror
            ? <button key={a.to} type="button" onClick={() => setPicked(a.label)} title={a.hint} className={clsx(box, 'opacity-60')}>{inner}</button>
            : <Link key={a.to} to={a.to} title={a.hint} className={box}>{inner}</Link>
        })}
      </nav>
      {mirror && picked && (
        <div role="status" className="rounded-[3px] bg-warn-soft px-3 py-2 text-[0.8125rem] text-warn">
          <b>{picked}</b>: ayna açıkken bu kaydı pratikortam'a girin. Bir sonraki senkronda buraya da gelir.
        </div>
      )}
    </div>
  )
}
