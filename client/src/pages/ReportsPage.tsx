import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Download } from 'lucide-react'
import { download, get } from '../api/client'
import type { CustomerAgingRow, DriverReportRow, ExpenseCategoryRow, MonthlySummaryRow, TripProfitRow, VehicleReportRow } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { Button, Card, PageHeader, Select, Spinner, Tabs, DateFilter } from '../components/ui'
import { date, MONTHS, tl, tl2, todayIso, yearStartIso } from '../lib/format'
import { expenseCategoryLabel } from '../lib/labels'

type Tab = 'monthly' | 'trips' | 'vehicles' | 'drivers' | 'aging' | 'expenses'

// Kategorik palet (sabit sıra): 1 mavi, 2 turuncu.
const SERIES_1 = '#2a78d6'
const SERIES_2 = '#eb6834'
const compact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('monthly')
  const [year, setYear] = useState(new Date().getFullYear())
  const [from, setFrom] = useState(yearStartIso())
  const [to, setTo] = useState(todayIso())
  const usesRange = tab === 'trips' || tab === 'vehicles' || tab === 'drivers' || tab === 'expenses'
  const params = tab === 'monthly' ? { year } : usesRange ? { from, to } : {}
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <>
      <PageHeader title="Raporlar" subtitle="Ciro, kârlılık, alacak ve gider analizleri"
        actions={<Button variant="secondary" icon={<Download className="size-4" />}
          onClick={() => download(`/reports/${tab}`, { ...params, format: 'xlsx' }, `${tab}.xlsx`)}>Excel'e Aktar</Button>} />
      <Card bodyClassName="p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-2">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'monthly', label: 'Aylık Özet' },
            { value: 'trips', label: 'Sefer Kârlılığı' },
            { value: 'vehicles', label: 'Araç Bazlı' },
            { value: 'drivers', label: 'Şoför Bazlı' },
            { value: 'aging', label: 'Alacak Yaşlandırma' },
            { value: 'expenses', label: 'Gider Dağılımı' },
          ]} />
          <div className="flex gap-2 pb-2">
            {tab === 'monthly' && <Select aria-label="Yıl" className="w-28" value={year} onChange={(v) => v && setYear(v)} options={years.map((y) => ({ value: y, label: String(y) }))} />}
            {usesRange && <>
              <DateFilter label="Başlangıç" className="w-40" value={from} onChange={setFrom} />
              <DateFilter label="Bitiş" className="w-40" value={to} onChange={setTo} />
            </>}
          </div>
        </div>
        {tab === 'monthly' && <Monthly year={year} />}
        {tab === 'trips' && <Trips from={from} to={to} />}
        {tab === 'vehicles' && <Vehicles from={from} to={to} />}
        {tab === 'drivers' && <Drivers from={from} to={to} />}
        {tab === 'aging' && <Aging />}
        {tab === 'expenses' && <Expenses from={from} to={to} />}
      </Card>
    </>
  )
}

function useReport<T>(name: string, params: object) {
  return useQuery({ queryKey: ['reports', name, params], queryFn: () => get<T>(`/reports/${name}`, params) })
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] shadow-lg">
      <div className="mb-1 font-semibold text-slate-800">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-medium text-slate-800">{tl(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Monthly({ year }: { year: number }) {
  const { data, isLoading } = useReport<MonthlySummaryRow[]>('monthly', { year })
  if (isLoading || !data) return <Spinner />
  const chart = data.map((r) => ({ name: MONTHS[r.month - 1].slice(0, 3), Ciro: r.tripRevenue, Maliyet: r.vehicleCost + r.expenses }))
  const sum = (k: keyof MonthlySummaryRow) => data.reduce((s, r) => s + (r[k] as number), 0)
  const cols: Column<MonthlySummaryRow>[] = [
    { key: 'm', header: 'Ay', render: (r) => MONTHS[r.month - 1] },
    { key: 'c', header: 'Sefer', align: 'right', render: (r) => r.tripCount },
    { key: 'rev', header: 'Sefer Cirosu', align: 'right', render: (r) => tl(r.tripRevenue) },
    { key: 'vc', header: 'Araç Maliyeti', align: 'right', render: (r) => tl(r.vehicleCost) },
    { key: 'exp', header: 'Giderler', align: 'right', render: (r) => tl(r.expenses) },
    { key: 'net', header: 'Net Kâr', align: 'right', render: (r) => <span className={r.netProfit < 0 ? 'text-red-600' : r.netProfit > 0 ? 'font-medium text-emerald-700' : 'text-slate-500'}>{tl(r.netProfit)}</span> },
    { key: 'inv', header: 'Faturalanan', align: 'right', render: (r) => tl(r.invoiced) },
    { key: 'col', header: 'Tahsil Edilen', align: 'right', render: (r) => tl(r.collected) },
  ]
  return (
    <div>
      <div className="grid gap-3 p-4 sm:grid-cols-4">
        <Kpi label="Yıllık sefer" value={String(sum('tripCount'))} />
        <Kpi label="Sefer cirosu" value={tl(sum('tripRevenue'))} />
        <Kpi label="Toplam maliyet" value={tl(sum('vehicleCost') + sum('expenses'))} />
        <Kpi label="Net kâr" value={tl(sum('netProfit'))} tone={sum('netProfit') < 0 ? 'text-red-600' : 'text-emerald-700'} />
      </div>
      <div className="h-72 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} barGap={2} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v: number) => compact.format(v)} width={56} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span style={{ color: '#475569' }}>{v}</span>} />
            <Bar dataKey="Ciro" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Maliyet" name="Maliyet (araç + gider)" fill={SERIES_2} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={cols} rows={data} rowKey={(r) => r.month} />
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-[13px] text-slate-500">{label}</div>
      <div className={`text-xl font-bold ${tone ?? 'text-navy-900'}`}>{value}</div>
    </div>
  )
}

function Trips({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useReport<TripProfitRow[]>('trips', { from, to })
  const cols: Column<TripProfitRow>[] = [
    { key: 'd', header: 'Tarih', render: (r) => date(r.loadingDate) },
    { key: 'c', header: 'Müşteri', render: (r) => r.customer },
    { key: 'v', header: 'Plaka', render: (r) => r.vehicle },
    { key: 'r', header: 'Güzergah', render: (r) => r.route },
    { key: 's', header: 'Durum', render: (r) => r.status },
    { key: 'sp', header: 'Satış', align: 'right', render: (r) => tl(r.salePrice) },
    { key: 'vc', header: 'Araç Maliyeti', align: 'right', render: (r) => tl(r.vehicleCost) },
    { key: 'e', header: 'Giderler', align: 'right', render: (r) => tl(r.expenses) },
    { key: 'p', header: 'Kâr', align: 'right', render: (r) => <span className={r.profit < 0 ? 'text-red-600' : 'text-emerald-700'}>{tl(r.profit)}</span> },
    { key: 'm', header: 'Marj', align: 'right', render: (r) => r.salePrice ? `%${Math.round(r.profit / r.salePrice * 100)}` : '—' },
  ]
  const total = (k: 'salePrice' | 'vehicleCost' | 'expenses' | 'profit') => data?.reduce((s, r) => s + r[k], 0) ?? 0
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.tripId} empty="Bu aralıkta sefer yok."
    footer={data && data.length > 0 ? (
      <tr className="bg-slate-50 text-sm font-semibold">
        <td className="td" colSpan={5}>Toplam ({data.length} sefer)</td>
        <td className="td text-right">{tl(total('salePrice'))}</td><td className="td text-right">{tl(total('vehicleCost'))}</td>
        <td className="td text-right">{tl(total('expenses'))}</td><td className="td text-right">{tl(total('profit'))}</td><td className="td" />
      </tr>) : undefined} />
}

function Vehicles({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useReport<VehicleReportRow[]>('vehicles', { from, to })
  const cols: Column<VehicleReportRow>[] = [
    { key: 'p', header: 'Plaka', render: (r) => <span className="font-medium">{r.plate}</span> },
    { key: 't', header: 'Tip', render: (r) => r.type },
    { key: 'c', header: 'Sefer', align: 'right', render: (r) => r.tripCount },
    { key: 'r', header: 'Gelir', align: 'right', render: (r) => tl(r.revenue) },
    { key: 'vc', header: 'Araç Maliyeti', align: 'right', render: (r) => tl(r.vehicleCost) },
    { key: 'e', header: 'Giderler', align: 'right', render: (r) => tl(r.expenses) },
    { key: 'n', header: 'Net', align: 'right', render: (r) => <span className={r.net < 0 ? 'text-red-600' : 'font-medium text-emerald-700'}>{tl(r.net)}</span> },
  ]
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.vehicleId} />
}

function Drivers({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useReport<DriverReportRow[]>('drivers', { from, to })
  const cols: Column<DriverReportRow>[] = [
    { key: 'd', header: 'Şoför', render: (r) => <span className="font-medium">{r.driver}</span> },
    { key: 'c', header: 'Sefer', align: 'right', render: (r) => r.tripCount },
    { key: 'dl', header: 'Teslim Edilen', align: 'right', render: (r) => r.deliveredCount },
    { key: 'r', header: 'Gelir', align: 'right', render: (r) => tl(r.revenue) },
    { key: 'vc', header: 'Araç Maliyeti', align: 'right', render: (r) => tl(r.vehicleCost) },
    { key: 'e', header: 'Sefer Giderleri', align: 'right', render: (r) => tl(r.expenses) },
    { key: 'p', header: 'Kâr', align: 'right', render: (r) => <span className={r.profit < 0 ? 'text-red-600' : 'font-medium text-emerald-700'}>{tl(r.profit)}</span> },
  ]
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.driverId} empty="Bu aralıkta sefer yok." />
}

function Aging() {
  const { data, isLoading } = useReport<CustomerAgingRow[]>('aging', {})
  const cols: Column<CustomerAgingRow>[] = [
    { key: 'c', header: 'Müşteri', render: (r) => <span className="font-medium">{r.customer}</span> },
    { key: 'nd', header: 'Vadesi Gelmemiş', align: 'right', render: (r) => tl2(r.notDue) },
    { key: 'a', header: '1-30 Gün', align: 'right', render: (r) => tl2(r.days1To30) },
    { key: 'b', header: '31-60 Gün', align: 'right', render: (r) => tl2(r.days31To60) },
    { key: 'c2', header: '61-90 Gün', align: 'right', render: (r) => tl2(r.days61To90) },
    { key: 'd', header: '90+ Gün', align: 'right', render: (r) => <span className={r.over90 > 0 ? 'font-medium text-red-600' : ''}>{tl2(r.over90)}</span> },
    { key: 't', header: 'Toplam', align: 'right', render: (r) => <span className="font-semibold">{tl2(r.total)}</span> },
  ]
  const s = (k: keyof CustomerAgingRow) => data?.reduce((a, r) => a + (r[k] as number), 0) ?? 0
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.customerId} empty="Açık alacak yok."
    footer={data && data.length > 0 ? (
      <tr className="bg-slate-50 text-sm font-semibold">
        <td className="td">Toplam</td>
        {(['notDue', 'days1To30', 'days31To60', 'days61To90', 'over90', 'total'] as const).map((k) => <td key={k} className="td text-right">{tl2(s(k))}</td>)}
      </tr>) : undefined} />
}

function Expenses({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useReport<ExpenseCategoryRow[]>('expenses', { from, to })
  if (isLoading || !data) return <Spinner />
  const total = data.reduce((s, r) => s + r.amount, 0)
  const chart = data.map((r) => ({ name: expenseCategoryLabel[r.category] ?? r.category, Tutar: r.amount }))
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <div style={{ height: Math.max(160, chart.length * 40 + 40) }}>
        {chart.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Bu aralıkta gider yok.</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v: number) => compact.format(v)} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#334155', fontSize: 12 }} width={110} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="Tutar" fill={SERIES_1} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Kategori</th><th className="th text-right">Tutar</th><th className="th text-right">Pay</th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.category}><td className="td">{expenseCategoryLabel[r.category] ?? r.category}</td>
                <td className="td text-right">{tl2(r.amount)}</td><td className="td text-right">%{total ? Math.round(r.amount / total * 100) : 0}</td></tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-slate-50 font-semibold"><td className="td">Toplam</td><td className="td text-right">{tl2(total)}</td><td className="td" /></tr></tfoot>
        </table>
      </div>
      <div className="flex items-center gap-2 text-[13px] text-slate-500 lg:col-span-2"><BarChart3 className="size-3.5" /> Araç maliyetleri sefer kârlılığı raporunda ayrıca gösterilir.</div>
    </div>
  )
}
