import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Download } from 'lucide-react'
import { download, errorMessage, get } from '../api/client'
import { useToast } from '../components/Toast'
import type { CustomerAgingRow, CustomerProfitRow, RouteProfitRow, DriverReportRow, ExpenseCategoryRow, FuelReportRow, MonthlySummaryRow, PayableAgingRow, ProfitGroupBy, ProfitReportRow, SupplierReportRow, TripProfitRow, VehicleReportRow } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { ExportButton } from '../components/Exports'
import { Button, Card, PageHeader, Select, Spinner, Tabs, DateFilter } from '../components/ui'
import { date, MONTHS, tl, tl2, todayIso, yearStartIso } from '../lib/format'
import { expenseCategoryLabel } from '../lib/labels'

type Tab = 'monthly' | 'profit' | 'customers' | 'routes' | 'trips' | 'vehicles' | 'drivers' | 'fuel' | 'aging' | 'payables' | 'suppliers' | 'expenses' | 'accounting'

// Kategorik palet (sabit sıra): 1 mavi, 2 turuncu.
const SERIES_1 = '#2a78d6'
const SERIES_2 = '#eb6834'
const compact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('monthly')
  const [year, setYear] = useState(new Date().getFullYear())
  const [from, setFrom] = useState(yearStartIso())
  const [to, setTo] = useState(todayIso())
  const [groupBy, setGroupBy] = useState<ProfitGroupBy>('Month')
  const usesRange = tab === 'profit' || tab === 'customers' || tab === 'routes' || tab === 'trips' || tab === 'vehicles' || tab === 'drivers' || tab === 'fuel' || tab === 'expenses'
  const params = tab === 'monthly' ? { year } : tab === 'profit' ? { from, to, groupBy } : usesRange ? { from, to } : {}
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <>
      <PageHeader title="Raporlar" subtitle="Ciro, kârlılık, alacak ve gider analizleri"
        actions={tab !== 'accounting' && <ExportButton url={`/reports/${tab}`} params={{ ...params, format: 'xlsx' }} fileName={`${tab}.xlsx`} label="Excel'e Aktar" />} />
      <Card bodyClassName="p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-2">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'monthly', label: 'Aylık Özet' },
            { value: 'profit', label: 'Kazanç' },
            { value: 'customers', label: 'Müşteri Kârlılığı' },
            { value: 'routes', label: 'Güzergâh' },
            { value: 'trips', label: 'Sefer Kârlılığı' },
            { value: 'vehicles', label: 'Araç Bazlı' },
            { value: 'drivers', label: 'Şoför Bazlı' },
            { value: 'fuel', label: 'Yakıt' },
            { value: 'aging', label: 'Alacak Yaşlandırma' },
            { value: 'payables', label: 'Borç Yaşlandırma' },
            { value: 'suppliers', label: 'Tedarikçiler' },
            { value: 'expenses', label: 'Gider Dağılımı' },
            { value: 'accounting', label: 'Muhasebe Aktarımı' },
          ]} />
          <div className="flex gap-2 pb-2">
            {tab === 'monthly' && <Select aria-label="Yıl" className="w-28" value={year} onChange={(v) => v && setYear(v)} options={years.map((y) => ({ value: y, label: String(y) }))} />}
            {tab === 'profit' && <Select aria-label="Kırılım" className="w-36" value={groupBy} onChange={(v) => v && setGroupBy(v)} options={groupByOptions} />}
            {usesRange && <>
              <DateFilter label="Başlangıç" className="w-40" value={from} onChange={setFrom} />
              <DateFilter label="Bitiş" className="w-40" value={to} onChange={setTo} />
            </>}
          </div>
        </div>
        {tab === 'monthly' && <Monthly year={year} />}
        {tab === 'profit' && <Profit from={from} to={to} groupBy={groupBy} />}
        {tab === 'customers' && <CustomerProfit from={from} to={to} />}
        {tab === 'routes' && <RouteProfit from={from} to={to} />}
        {tab === 'trips' && <Trips from={from} to={to} />}
        {tab === 'vehicles' && <Vehicles from={from} to={to} />}
        {tab === 'drivers' && <Drivers from={from} to={to} />}
        {tab === 'fuel' && <Fuel from={from} to={to} />}
        {tab === 'aging' && <Aging />}
        {tab === 'payables' && <Payables />}
        {tab === 'suppliers' && <Suppliers />}
        {tab === 'expenses' && <Expenses from={from} to={to} />}
        {tab === 'accounting' && <AccountingExport />}
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
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 font-medium text-slate-800">{label}</div>
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
    { key: 'cc', header: <>Taşeron Maliyeti<span className="block font-normal text-slate-500">ödenen</span></>, align: 'right', render: (r) => <>{tl(r.carrierCost)}<span className="block text-sm text-slate-500">{tl(r.carrierPaid)}</span></> },
    { key: 'net', header: 'Net Kâr', align: 'right', render: (r) => <span className={r.netProfit < 0 ? 'text-red-600' : r.netProfit > 0 ? 'font-medium text-emerald-700' : 'text-slate-500'}>{tl(r.netProfit)}</span> },
    { key: 'inv', header: <>Faturalanan<span className="block font-normal text-slate-500">tahsil edilen</span></>, align: 'right', render: (r) => <>{tl(r.invoiced)}<span className="block text-sm text-slate-500">{tl(r.collected)}</span></> },
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
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: '#64748b', fontSize: 14 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 14 }} tickFormatter={(v: number) => compact.format(v)} width={56} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Legend iconType="square" wrapperStyle={{ fontSize: 14 }} formatter={(v: string) => <span style={{ color: '#475569' }}>{v}</span>} />
            <Bar dataKey="Ciro" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Maliyet" name="Maliyet (araç + gider)" fill={SERIES_2} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={cols} rows={data} rowKey={(r) => r.month} />
    </div>
  )
}

const groupByOptions: { value: ProfitGroupBy; label: string }[] = [
  { value: 'Month', label: 'Aylara göre' },
  { value: 'Customer', label: 'Müşterilere göre' },
  { value: 'Vehicle', label: 'Araçlara göre' },
  { value: 'Driver', label: 'Şoförlere göre' },
]
const groupByCaption: Record<ProfitGroupBy, string> = { Month: 'Ay', Customer: 'Müşteri', Vehicle: 'Plaka', Driver: 'Şoför' }

/** Kazanç raporu: satış, komisyon, maliyet, prim, masraf ve kâr; ay, müşteri, araç ya da şoför bazında (tek kâr formülü). */
function Profit({ from, to, groupBy }: { from: string; to: string; groupBy: ProfitGroupBy }) {
  const { data, isLoading } = useReport<ProfitReportRow[]>('profit', { from, to, groupBy })
  const money = (k: keyof ProfitReportRow) => (r: ProfitReportRow) => tl2(r[k] as number)
  const cols: Column<ProfitReportRow>[] = [
    { key: 'l', header: groupByCaption[groupBy], className: 'whitespace-normal! min-w-32', render: (r) => groupBy === 'Customer'
      ? <Link className="font-medium text-blue-700 hover:underline" to={`/musteriler/${r.key}`}>{r.label}</Link> : <span className="font-medium">{r.label}</span> },
    { key: 'n', header: 'Sefer', align: 'right', render: (r) => r.tripCount },
    { key: 's', header: 'Satış', align: 'right', render: money('sale') },
    { key: 'k', header: 'Komisyon', align: 'right', render: money('commission') },
    { key: 'c', header: 'Araç / taşeron', align: 'right', render: money('vehicleCost') },
    { key: 'b', header: 'Şoför primi', align: 'right', render: money('driverBonus') },
    { key: 'x', header: 'Ek masraf', align: 'right', render: money('extraCost') },
    { key: 'e', header: 'Sefer giderleri', align: 'right', render: money('expenses') },
    { key: 'p', header: 'Kâr', align: 'right', render: (r) => <span className={r.profit < 0 ? 'font-medium text-red-600' : 'font-medium text-emerald-700'}>{tl2(r.profit)}</span> },
    { key: 'm', header: 'Marj', align: 'right', render: (r) => margin(r.marginPercent) },
  ]
  const sum = (k: keyof ProfitReportRow) => data?.reduce((a, r) => a + (r[k] as number), 0) ?? 0
  const revenue = sum('sale') + sum('commission')
  return <>
    <p className="px-4 pb-2 text-sm text-slate-500">Tutarlar KDV hariç. Kâr = satış + komisyon − araç/taşeron maliyeti − şoför primi − müşteriye faturalanmayan ek masraf − sefere bağlı onaylı giderler. Seferle ilgisi olmayan genel giderler (kira, maaş vb.) Aylık Özet'te düşülür.</p>
    <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.key} empty="Bu dönemde sefer yok."
      footer={data && data.length > 0 ? (
        <tr className="bg-slate-50 text-sm font-medium">
          <td className="td">Toplam</td>
          <td className="td text-right">{sum('tripCount')}</td>
          {(['sale', 'commission', 'vehicleCost', 'driverBonus', 'extraCost', 'expenses', 'profit'] as const).map((k) => <td key={k} className="td text-right">{tl2(sum(k))}</td>)}
          <td className="td text-right">{margin(revenue > 0 ? Math.round(sum('profit') / revenue * 1000) / 10 : null)}</td>
        </tr>) : undefined} />
  </>
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-xl font-semibold ${tone ?? 'text-navy-900'}`}>{value}</div>
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
      <tr className="bg-slate-50 text-sm font-medium">
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
    { key: 'adv', header: 'Avans / Harcırah', align: 'right', render: (r) => r.advances || r.allowances
      ? <>{tl(r.advances)}<span className="block text-sm text-slate-500">Harcırah {tl(r.allowances)}</span></> : '—' },
  ]
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.driverId} empty="Bu aralıkta sefer yok." />
}

function Fuel({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useReport<FuelReportRow[]>('fuel', { from, to })
  const measured = (data ?? []).filter((r) => r.km && r.litersPer100Km)
  const totalKm = measured.reduce((a, r) => a + (r.km ?? 0), 0)
  const fleet = totalKm > 0 ? measured.reduce((a, r) => a + (r.litersPer100Km ?? 0) * (r.km ?? 0), 0) / totalKm : null
  const high = (r: FuelReportRow) => fleet != null && r.litersPer100Km != null && r.litersPer100Km > fleet * 1.15
  const num = (v: number, d = 0) => v.toLocaleString('tr-TR', { maximumFractionDigits: d })
  const cols: Column<FuelReportRow>[] = [
    { key: 'p', header: 'Plaka', render: (r) => <span className="font-medium">{r.plate}</span> },
    { key: 'n', header: 'Alım', align: 'right', render: (r) => r.fillCount },
    { key: 'l', header: 'Litre', align: 'right', render: (r) => r.liters ? num(r.liters) : '—' },
    { key: 'c', header: 'Tutar', align: 'right', render: (r) => tl2(r.cost) },
    { key: 'pl', header: 'Ort. Litre Fiyatı', align: 'right', render: (r) => r.pricePerLiter ? tl2(r.pricePerLiter) : '—' },
    { key: 'km', header: 'Km', align: 'right', render: (r) => r.km ? num(r.km) : '—' },
    { key: 'c100', header: 'L / 100 km', align: 'right', render: (r) => r.litersPer100Km == null ? <span className="text-slate-500">—</span>
      : <span className={high(r) ? 'font-medium text-red-600' : 'font-medium'}>{num(r.litersPer100Km, 1)}{high(r) && <span className="block text-sm font-normal">Ortalamanın üstünde</span>}</span> },
  ]
  return (
    <>
      <p className="px-4 pt-3 text-[0.9375rem] text-slate-700">
        Tüketim, yakıt giderlerine girilen <b>litre</b> ve <b>araç kilometresinden</b> hesaplanır (depoyu her seferinde doldurduğunuzda en doğru sonucu verir).
        {fleet != null && <> Filo ortalaması: <b>{num(fleet, 1)} L/100 km</b>. Ortalamanın %15'ten fazla üstündeki araçlar kırmızı görünür.</>}
      </p>
      <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.vehicleId} empty="Bu aralıkta yakıt gideri yok." />
    </>
  )
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
    { key: 't', header: 'Toplam', align: 'right', render: (r) => <span className="font-medium">{tl2(r.total)}</span> },
  ]
  const s = (k: keyof CustomerAgingRow) => data?.reduce((a, r) => a + (r[k] as number), 0) ?? 0
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.customerId} empty="Açık alacak yok."
    footer={data && data.length > 0 ? (
      <tr className="bg-slate-50 text-sm font-medium">
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
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 14 }} tickFormatter={(v: number) => compact.format(v)} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#334155', fontSize: 14 }} width={110} />
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
          <tfoot><tr className="bg-slate-50 font-medium"><td className="td">Toplam</td><td className="td text-right">{tl2(total)}</td><td className="td" /></tr></tfoot>
        </table>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500 lg:col-span-2"><BarChart3 className="size-3.5" /> Araç maliyetleri sefer kârlılığı raporunda ayrıca gösterilir.</div>
    </div>
  )
}

function Payables() {
  const { data, isLoading } = useReport<PayableAgingRow[]>('payables', {})
  const cols: Column<PayableAgingRow>[] = [
    { key: 's', header: 'Tedarikçi', render: (r) => <Link className="font-medium text-blue-700 hover:underline" to={`/tedarikciler/${r.supplierId}`}>{r.supplier}</Link> },
    { key: 'nd', header: 'Vadesi Gelmemiş', align: 'right', render: (r) => tl2(r.notDue) },
    { key: 'a', header: '1-30 Gün', align: 'right', render: (r) => tl2(r.days1To30) },
    { key: 'b', header: '31-60 Gün', align: 'right', render: (r) => tl2(r.days31To60) },
    { key: 'c2', header: '61-90 Gün', align: 'right', render: (r) => tl2(r.days61To90) },
    { key: 'd', header: '90+ Gün', align: 'right', render: (r) => <span className={r.over90 > 0 ? 'font-medium text-red-600' : ''}>{tl2(r.over90)}</span> },
    { key: 't', header: 'Toplam', align: 'right', render: (r) => <span className="font-medium">{tl2(r.total)}</span> },
  ]
  const s = (k: keyof PayableAgingRow) => data?.reduce((a, r) => a + (r[k] as number), 0) ?? 0
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.supplierId} empty="Açık taşeron borcu yok."
    footer={data && data.length > 0 ? (
      <tr className="bg-slate-50 text-sm font-medium">
        <td className="td">Toplam</td>
        {(['notDue', 'days1To30', 'days31To60', 'days61To90', 'over90', 'total'] as const).map((k) => <td key={k} className="td text-right">{tl2(s(k))}</td>)}
      </tr>) : undefined} />
}

const margin = (m?: number | null) => m == null ? '—' : <span className={m < 0 ? 'font-medium text-red-600' : m < 10 ? 'text-amber-700' : 'text-emerald-700'}>%{m.toLocaleString('tr-TR')}</span>

function CustomerProfit({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useReport<CustomerProfitRow[]>('customers', { from, to })
  const cols: Column<CustomerProfitRow>[] = [
    { key: 'c', header: 'Müşteri', render: (r) => <Link className="font-medium text-blue-700 hover:underline" to={`/musteriler/${r.customerId}`}>{r.customer}</Link> },
    { key: 'n', header: 'Sefer', align: 'right', render: (r) => r.tripCount },
    { key: 'r', header: 'Ciro', align: 'right', render: (r) => tl(r.revenue) },
    { key: 'k', header: 'Maliyet', align: 'right', render: (r) => tl(r.cost) },
    { key: 'p', header: 'Kâr', align: 'right', render: (r) => <span className={r.profit < 0 ? 'font-medium text-red-600' : 'font-medium'}>{tl(r.profit)}</span> },
    { key: 'm', header: 'Marj', align: 'right', render: (r) => margin(r.marginPercent) },
    { key: 'o', header: 'Açık Alacak', align: 'right', render: (r) => tl(r.openReceivable) },
    { key: 'd', header: 'Tahsil Süresi', align: 'right', render: (r) => r.collectionDays == null ? '—' : `~${r.collectionDays} gün` },
  ]
  return <>
    <p className="px-4 pb-2 text-sm text-slate-500">Maliyet: araç/taşeron maliyeti + sefere bağlı onaylı giderler. Tahsil süresi yaklaşıktır (açık alacak ÷ dönemdeki günlük KDV'li ciro).</p>
    <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.customerId} empty="Bu dönemde sefer yok." />
  </>
}

function RouteProfit({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useReport<RouteProfitRow[]>('routes', { from, to })
  const cols: Column<RouteProfitRow>[] = [
    { key: 'r', header: 'Güzergâh', render: (r) => <span className="font-medium">{r.from} → {r.to}</span> },
    { key: 'n', header: 'Sefer', align: 'right', render: (r) => r.tripCount },
    { key: 's', header: 'Ort. Satış', align: 'right', render: (r) => tl(r.avgRevenue) },
    { key: 'c', header: 'Ort. Maliyet', align: 'right', render: (r) => tl(r.avgCost) },
    { key: 'p', header: 'Toplam Kâr', align: 'right', render: (r) => <span className={r.profit < 0 ? 'font-medium text-red-600' : 'font-medium'}>{tl(r.profit)}</span> },
    { key: 'm', header: 'Marj', align: 'right', render: (r) => margin(r.marginPercent) },
  ]
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => `${r.from}-${r.to}`} empty="Bu dönemde sefer yok. Güzergâh için seferlerde yükleme ve teslim ilini girin." />
}

function Suppliers() {
  const { data, isLoading } = useReport<SupplierReportRow[]>('suppliers', {})
  const cols: Column<SupplierReportRow>[] = [
    { key: 's', header: 'Tedarikçi', render: (r) => <Link className="font-medium text-blue-700 hover:underline" to={`/tedarikciler/${r.supplierId}`}>{r.supplier}</Link> },
    { key: 'c', header: 'Sefer', align: 'right', render: (r) => r.tripCount },
    { key: 'tc', header: 'Sefer Maliyeti', align: 'right', render: (r) => tl2(r.tripCost) },
    { key: 'ce', header: 'Vadeli Gider', align: 'right', render: (r) => tl2(r.creditExpenses) },
    { key: 'p', header: 'Ödenen', align: 'right', render: (r) => tl2(r.paid) },
    { key: 'b', header: 'Bakiye', align: 'right', render: (r) => <span className={r.balance > 0 ? 'font-medium text-orange-600' : 'font-medium'}>{tl2(r.balance)}</span> },
  ]
  return <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.supplierId} empty="Henüz tedarikçi hareketi yok." />
}

/** Muhasebeciye aylık aktarım: satış faturaları, tahsilatlar, giderler, taşeron maliyet/ödemeleri tek Excel'de; e-Fatura XML'leri ZIP. */
function AccountingExport() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const to = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  const toast = useToast()
  const run = (url: string, name: string) => download(url, { from, to }, name).catch((e) => toast.error(errorMessage(e)))
  const months = Array.from({ length: 18 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
  })
  return (
    <div className="space-y-4 p-4">
      <p className="max-w-2xl text-sm text-slate-600">Seçilen ayın satış faturaları, tahsilatları, giderleri, taşeron maliyetleri ve taşeron ödemeleri tek Excel dosyasında (ayrı sayfalar) iner. e-Fatura açıksa o ayın UBL-TR XML dosyaları da ZIP olarak indirilebilir. Dosyaları muhasebecinize gönderin.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block"><span className="label">Ay</span>
          <select className="input w-48" aria-label="Ay" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <Button icon={<Download className="size-4" />} onClick={() => run('/exports/accounting', `muhasebe-${month}.xlsx`)}>Muhasebe Excel'i</Button>
        <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => run('/exports/einvoice-xml', `efatura-xml-${month}.zip`)}>e-Fatura XML (ZIP)</Button>
      </div>
    </div>
  )
}
