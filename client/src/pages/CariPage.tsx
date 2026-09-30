import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AlertTriangle, FileSpreadsheet, FileText, HandCoins, Scale, Truck, Wallet } from 'lucide-react'
import { errorMessage, get, openPdf } from '../api/client'
import type { CustomerCariRow, SupplierCariRow } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Button, Card, PageHeader, StatCard } from '../components/ui'
import { useToast } from '../components/Toast'
import { tl } from '../lib/format'
import { normalizeSearch as searchKey } from '../lib/search'

type Kind = 'customers' | 'suppliers'
type Row = CustomerCariRow | SupplierCariRow
type Filter = 'open' | 'overdue' | 'all'

const text = {
  customers: {
    title: 'Müşteriler Cari', subtitle: 'Bütün müşterilerin bakiyesi tek tabloda. Satıra tıklayınca hareketler açılır.',
    detail: '/musteriler', pay: '/tahsilatlar?new=1', payLabel: 'Tahsilat Gir', payIcon: Wallet,
    balance: 'Toplam alacak', list: 'Müşteri Listesi', listTo: '/musteriler',
  },
  suppliers: {
    title: 'Tedarikçiler Cari', subtitle: 'Taşeron ve tedarikçilere borcun tek tabloda. Satıra tıklayınca hareketler açılır.',
    detail: '/tedarikciler', pay: '/odemeler?new=1', payLabel: 'Ödeme Yap', payIcon: HandCoins,
    balance: 'Toplam borç', list: 'Tedarikçi Listesi', listTo: '/tedarikciler',
  },
} as const

const isCustomer = (r: Row): r is CustomerCariRow => 'invoiced' in r

/**
 * Eski paneldeki "Müşteriler Cari / Tedarikçiler Cari" ekranının sadeleşmiş hâli: herkes tek tabloda, en büyük bakiye üstte.
 * Kolonlar az ve anlaşılır; ekstre ve tahsilat/ödeme satırdan tek tıkla.
 */
export default function CariPage({ kind }: { kind: Kind }) {
  const t = text[kind]
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('open')
  const { data, isFetching } = useQuery({ queryKey: ['cari', kind], queryFn: () => get<Row[]>(`/cari/${kind}`) })

  const rows = useMemo(() => {
    const q = searchKey(search)
    return (data ?? []).filter((r) =>
      (filter === 'all' || (filter === 'open' ? r.balance !== 0 : r.overdue > 0))
      && (!q || searchKey(`${r.title} ${r.taxNumber ?? ''} ${r.phone ?? ''}`).includes(q)))
  }, [data, search, filter])

  const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0)
  const all = data ?? []
  const totalBalance = all.reduce((s, r) => s + r.balance, 0)
  const totalOverdue = all.reduce((s, r) => s + r.overdue, 0)
  const overdueCount = all.filter((r) => r.overdue > 0).length
  const waiting = kind === 'customers'
    ? { count: all.reduce((s, r) => s + (r as CustomerCariRow).uninvoicedTripCount, 0), total: all.reduce((s, r) => s + (r as CustomerCariRow).uninvoicedTrips, 0) }
    : { count: all.reduce((s, r) => s + (r as SupplierCariRow).missingInvoiceCount, 0), total: 0 }

  const statement = (r: Row) => openPdf(`${kind === 'customers' ? '/customers' : '/suppliers'}/${r.id}/statement`, 'ekstre.pdf')
    .catch((e) => toast.error(errorMessage(e)))
  const money = (v: number, strong = false) => (
    <span className={clsx(v === 0 && 'text-slate-400', strong && v > 0 && 'font-semibold text-slate-900', strong && v < 0 && 'font-semibold text-emerald-700')}>{tl(v)}</span>
  )

  const columns: Column<Row>[] = [
    { key: 'title', header: kind === 'customers' ? 'Müşteri' : 'Tedarikçi', className: 'min-w-48', render: (r) => <>
      <span className="font-medium text-slate-900">{r.title}</span>
      {r.taxNumber && <span className="block text-sm text-slate-500">VKN {r.taxNumber}</span>}
    </> },
    { key: 'opening', header: 'Devir', align: 'right', render: (r) => money(r.opening) },
    ...(kind === 'customers' ? [
      { key: 'invoiced', header: 'Kesilen Fatura', align: 'right', render: (r) => money((r as CustomerCariRow).invoiced) },
      { key: 'collected', header: 'Alınan Ödeme', align: 'right', render: (r) => money((r as CustomerCariRow).collected) },
    ] as Column<Row>[] : [
      { key: 'trips', header: 'Sefer Borcu', align: 'right', render: (r) => money((r as SupplierCariRow).tripCost + (r as SupplierCariRow).creditExpenses) },
      { key: 'paid', header: 'Verilen Ödeme', align: 'right', render: (r) => money((r as SupplierCariRow).paid) },
    ] as Column<Row>[]),
    { key: 'balance', header: 'Bakiye', align: 'right', render: (r) => <>
      {money(r.balance, true)}
      {r.overdue > 0 && <span className="block text-sm font-medium text-red-600">Vadesi geçen {tl(r.overdue)}</span>}
    </> },
    { key: 'waiting', header: kind === 'customers' ? 'Faturası Kesilecek' : 'Faturası Gelmedi', align: 'right', render: (r) => isCustomer(r)
      ? (r.uninvoicedTripCount > 0 ? <>{tl(r.uninvoicedTrips)}<span className="block text-sm text-violet-700">{r.uninvoicedTripCount} sefer</span></> : <span className="text-slate-400">—</span>)
      : ((r as SupplierCariRow).missingInvoiceCount > 0 ? <span className="text-amber-700">{(r as SupplierCariRow).missingInvoiceCount} sefer</span> : <span className="text-slate-400">—</span>) },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="secondary" icon={<FileText className="size-4" />} onClick={() => statement(r)}>Ekstre</Button>
      </div>
    ) },
  ]

  const footer = rows.length > 1 && (
    <tr><td colSpan={columns.length} className="border-t border-slate-200 bg-slate-50 px-6 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3 text-[0.9375rem]">
      <span className="text-slate-600">{rows.length} kayıt</span>
      <span>Bakiye toplamı <b className="tabular-nums text-slate-900">{tl(sum((r) => r.balance))}</b>
        {sum((r) => r.overdue) > 0 && <> · <span className="text-red-600">vadesi geçen <b className="tabular-nums">{tl(sum((r) => r.overdue))}</b></span></>}
      </span>
    </div>
    </td></tr>
  )

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle}
        actions={<>
          <Button variant="secondary" onClick={() => navigate(t.listTo)}>{t.list}</Button>
          <Button icon={<t.payIcon className="size-4" />} onClick={() => navigate(t.pay)}>{t.payLabel}</Button>
        </>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title={t.balance} value={tl(totalBalance)} icon={<Scale />} color="blue" onClick={() => setFilter('open')}
          sub={`${all.filter((r) => r.balance !== 0).length} hesapta bakiye var`} />
        <StatCard title="Vadesi geçen" value={tl(totalOverdue)} icon={<AlertTriangle />} color="red" onClick={() => setFilter('overdue')}
          sub={overdueCount ? `${overdueCount} hesap · listelemek için tıklayın` : 'Vadesi geçen yok'} />
        {kind === 'customers'
          ? <StatCard title="Faturası kesilecek seferler" value={tl(waiting.total)} icon={<FileSpreadsheet />} color="orange"
              sub={waiting.count ? `${waiting.count} sefer · fatura kesmek için tıklayın` : 'Bekleyen yok'} onClick={() => navigate('/faturalar/yeni')} />
          : <StatCard title="Taşeron faturası gelmeyen" value={`${waiting.count} sefer`} icon={<Truck />} color="orange"
              sub="Listelemek için tıklayın" onClick={() => navigate('/seferler?carrierInvoice=missing')} />}
      </div>
      <Card bodyClassName="p-0" title="Hesaplar" icon={<Scale className="size-4" />}
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Ünvan, VKN, telefon..." />}>
        <div role="radiogroup" aria-label="Gösterilecek hesaplar" className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-3">
          {([['open', 'Bakiyesi olanlar'], ['overdue', 'Vadesi geçenler'], ['all', 'Hepsi']] as const).map(([v, label]) => (
            <button key={v} role="radio" aria-checked={filter === v} onClick={() => setFilter(v)}
              className={clsx('min-h-9 rounded-full border px-4 text-[0.9375rem] font-medium transition',
                filter === v ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
              {label}
            </button>
          ))}
        </div>
        <DataTable columns={columns} rows={rows} loading={isFetching} rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`${t.detail}/${r.id}`)} footer={footer}
          empty={search ? 'Aramanıza uyan kayıt yok.' : filter === 'overdue' ? 'Vadesi geçen hesap yok.' : filter === 'open' ? 'Bakiyesi olan hesap yok. Hepsini görmek için “Hepsi”yi seçin.' : 'Henüz kayıt yok.'}
          mobileCard={(r) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">{r.title}</div>
                {r.overdue > 0 ? <div className="text-sm text-red-600">Vadesi geçen {tl(r.overdue)}</div>
                  : <div className="text-sm text-slate-500">{r.taxNumber ? `VKN ${r.taxNumber}` : r.phone ?? ''}</div>}
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{tl(r.balance)}</span>
            </div>
          )} />
      </Card>
    </>
  )
}
