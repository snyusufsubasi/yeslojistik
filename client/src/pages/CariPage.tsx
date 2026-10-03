import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AlertTriangle, FileSpreadsheet, FileText, HandCoins, Scale, Truck, Wallet } from 'lucide-react'
import { errorMessage, get, openPdf } from '../api/client'
import type { CustomerCariRow, SupplierCariRow } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { ExportButton, PdfButton } from '../components/Exports'
import { Button, Card, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'
import { ago, tl } from '../lib/format'
import { useMirror } from '../lib/hooks'
import { normalizeSearch as searchKey } from '../lib/search'

type Kind = 'customers' | 'suppliers'
type Row = CustomerCariRow | SupplierCariRow
type Filter = 'open' | 'overdue' | 'all'

const text = {
  customers: {
    title: 'Müşteriler Cari', subtitle: 'Bütün müşterilerin bakiyesi tek tabloda. Satıra tıklayınca hareketler açılır.',
    detail: '/musteriler', pay: '/tahsilatlar?new=1', payLabel: 'Tahsilat Gir', payIcon: Wallet,
    balance: 'Toplam alacak', list: 'Müşteri Listesi', listTo: '/musteriler', party: 'Müşteri', file: 'musteriler-cari',
  },
  suppliers: {
    title: 'Tedarikçiler Cari', subtitle: 'Taşeron ve tedarikçilere borcun tek tabloda. Satıra tıklayınca hareketler açılır.',
    detail: '/tedarikciler', pay: '/odemeler?new=1', payLabel: 'Ödeme Yap', payIcon: HandCoins,
    balance: 'Toplam borç', list: 'Tedarikçi Listesi', listTo: '/tedarikciler', party: 'Tedarikçi', file: 'tedarikciler-cari',
  },
} as const

/**
 * Tutar sütunları. Sunucudaki Excel/PDF çıktısı (CariService) aynı anahtarları ve aynı ayna kuralını kullanır:
 * ayna açıkken bakiye pratikortam'ındır; panelin kendi hesapları (devir, ödemeler) gizlenir, faturalar ve seferler
 * panelde verisi varsa gösterilir.
 */
interface MoneyColumn {
  key: string
  header: string
  value: (r: Row) => number
  mirror: 'ifData' | 'never'
  count?: (r: Row) => number
  unit?: string
  tone?: string
}

const customerColumns: MoneyColumn[] = [
  { key: 'opening', header: 'Devir', value: (r) => r.opening, mirror: 'never' },
  { key: 'invoiced', header: 'Kesilen Fatura', value: (r) => (r as CustomerCariRow).invoiced, mirror: 'ifData' },
  { key: 'cancelled', header: 'İptal Fatura', value: (r) => r.cancelledInvoices, count: (r) => r.cancelledInvoiceCount, unit: 'fatura', mirror: 'ifData', tone: 'text-slate-500' },
  { key: 'uninvoiced', header: 'Faturasız Sevkiyatlar', value: (r) => r.uninvoicedTrips, count: (r) => r.uninvoicedTripCount, unit: 'sefer', mirror: 'ifData', tone: 'text-bill font-semibold' },
  { key: 'collected', header: 'Alınan Ödeme', value: (r) => (r as CustomerCariRow).collected, mirror: 'never' },
]

const supplierColumns: MoneyColumn[] = [
  { key: 'opening', header: 'Devir', value: (r) => r.opening, mirror: 'never' },
  { key: 'received', header: 'Alınan Fatura', value: (r) => (r as SupplierCariRow).receivedInvoices, count: (r) => (r as SupplierCariRow).receivedInvoiceCount, unit: 'fatura', mirror: 'ifData', tone: 'text-slate-500' },
  { key: 'cancelled', header: 'İptal Fatura', value: (r) => r.cancelledInvoices, count: (r) => r.cancelledInvoiceCount, unit: 'fatura', mirror: 'ifData', tone: 'text-slate-500' },
  { key: 'uninvoiced', header: 'Faturasız Sevkiyatlar', value: (r) => r.uninvoicedTrips, count: (r) => r.uninvoicedTripCount, unit: 'sefer', mirror: 'ifData', tone: 'text-warn font-semibold' },
  { key: 'expenses', header: 'Vadeli Gider', value: (r) => (r as SupplierCariRow).creditExpenses, mirror: 'never' },
  { key: 'paid', header: 'Verilen Ödeme', value: (r) => (r as SupplierCariRow).paid, mirror: 'never' },
]

/**
 * Eski paneldeki "Müşteriler Cari / Tedarikçiler Cari" ekranı: herkes tek tabloda, en büyük bakiye üstte.
 * Başlığa tıklayınca o sütuna göre sıralanır; Excel ve PDF ekrandaki süzgeç, arama ve sıralamayla iner.
 */
export default function CariPage({ kind }: { kind: Kind }) {
  const t = text[kind]
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('open')
  const [sort, setSort] = useState({ key: 'balance', desc: true })
  const { data, isFetching, error, refetch } = useQuery({ queryKey: ['cari', kind], queryFn: () => get<Row[]>(`/cari/${kind}`) })
  // Pratikortam aynası açıkken bakiye pratikortam'daki rakamdır; panel kendi borç/alacak hesabını yapmaz.
  const { mirror, status } = useMirror()
  const bal = (r: Row) => (mirror ? r.legacyBalance ?? 0 : r.balance)
  const all = useMemo(() => data ?? [], [data])

  const moneyColumns = useMemo(() => (kind === 'customers' ? customerColumns : supplierColumns)
    .filter((c) => !mirror || (c.mirror === 'ifData' && all.some((r) => c.value(r) !== 0 || (c.count?.(r) ?? 0) !== 0))), [kind, mirror, all])

  const rows = useMemo(() => {
    const q = searchKey(search)
    const b = (r: Row) => (mirror ? r.legacyBalance ?? 0 : r.balance)
    const value = moneyColumns.find((c) => c.key === sort.key)?.value ?? b
    const dir = sort.desc ? -1 : 1
    const byTitle = (a: Row, z: Row) => a.title.localeCompare(z.title, 'tr')
    return all.filter((r) =>
      (filter === 'all' || (filter === 'open' ? b(r) !== 0 : r.overdue > 0))
      && (!q || searchKey(`${r.title} ${r.taxNumber ?? ''} ${r.phone ?? ''}`).includes(q)))
      .sort((a, z) => (sort.key === 'title' ? dir * byTitle(a, z) : dir * (value(a) - value(z)) || byTitle(a, z)))
  }, [all, search, filter, mirror, sort, moneyColumns])

  const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0)
  const totalBalance = all.reduce((s, r) => s + bal(r), 0)
  const totalOverdue = all.reduce((s, r) => s + r.overdue, 0)
  const overdueCount = all.filter((r) => r.overdue > 0).length
  const waiting = kind === 'customers'
    ? { count: all.reduce((s, r) => s + (r as CustomerCariRow).uninvoicedTripCount, 0), total: all.reduce((s, r) => s + (r as CustomerCariRow).uninvoicedTrips, 0) }
    : { count: all.reduce((s, r) => s + (r as SupplierCariRow).missingInvoiceCount, 0), total: 0 }
  // Tutarlarda ilk tıklama büyükten küçüğe, ünvanda A-Z sıralar; aynı başlığa yeniden tıklamak yönü çevirir.
  const onSort = (key: string, desc: boolean) => setSort(key === sort.key ? { key, desc } : { key, desc: key !== 'title' })
  const exportParams = { search: search.trim() || undefined, filter, sort: sort.key, desc: sort.desc }

  const statement = (r: Row) => openPdf(`${kind === 'customers' ? '/customers' : '/suppliers'}/${r.id}/statement`, 'ekstre.pdf')
    .catch((e) => toast.error(errorMessage(e)))
  const money = (v: number, strong = false) => (
    <span className={clsx(v === 0 && 'text-slate-400', strong && v > 0 && 'font-semibold text-fg', strong && v < 0 && 'font-semibold text-good')}>{tl(v)}</span>
  )

  const titleColumn: Column<Row> = { key: 'title', header: t.party, sortKey: 'title', className: 'min-w-48', render: (r) => <>
    <span className="font-medium text-slate-900">{r.title}</span>
    {r.taxNumber && <span className="block text-sm text-slate-500">VKN {r.taxNumber}</span>}
  </> }
  const columns: Column<Row>[] = [
    titleColumn,
    ...moneyColumns.map((c): Column<Row> => ({ key: c.key, header: c.header, sortKey: c.key, align: 'right', render: (r) => {
      const n = c.count?.(r) ?? 0
      return <>{money(c.value(r))}{n > 0 && <span className={clsx('block text-sm', c.tone)}>{n}<Word> {c.unit}</Word></span>}</>
    } })),
    mirror
      ? { key: 'balance', header: 'Bakiye (pratikortam)', sortKey: 'balance', align: 'right', render: (r) => money(bal(r), true) }
      : { key: 'balance', header: 'Bakiye', sortKey: 'balance', align: 'right', render: (r) => <>
        {money(r.balance, true)}
        {r.overdue > 0 && <span className="block text-sm font-semibold text-bad"><Word>Vadesi geçen </Word>{tl(r.overdue)}</span>}
      </> },
    ...(mirror ? [] : [{ key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="secondary" icon={<FileText className="size-4" />} onClick={() => statement(r)}>Ekstre</Button>
      </div>
    ) }] as Column<Row>[]),
  ]

  const footer = rows.length > 1 && (
    <tr><td colSpan={columns.length} className="border-t border-line bg-surface-2 px-4 py-2.5">
    <div className="flex flex-wrap items-center justify-between gap-3 text-[0.84375rem]">
      <span className="text-muted"><span className="tabular-nums">{rows.length}</span> kayıt</span>
      <span className="text-muted">Bakiye toplamı <b className="tabular-nums text-fg">{tl(sum(bal))}</b>
        {sum((r) => r.overdue) > 0 && <> · <span className="text-bad">vadesi geçen <b className="tabular-nums">{tl(sum((r) => r.overdue))}</b></span></>}
      </span>
    </div>
    </td></tr>
  )

  return (
    <>
      <PageHeader title={t.title} subtitle={mirror ? 'Bakiyeler pratikortam\'daki cari ile aynıdır. Satıra tıklayınca kart açılır.' : t.subtitle}
        actions={<>
          <ExportButton url={`/cari/${kind}/export`} params={exportParams} fileName={`${t.file}.xlsx`} />
          <PdfButton url={`/cari/${kind}/export`} params={{ ...exportParams, format: 'pdf' }} fileName={`${t.file}.pdf`} label="PDF" icon={<FileText className="size-4" />} />
          <Button variant="secondary" onClick={() => navigate(t.listTo)}>{t.list}</Button>
          {!mirror && <Button icon={<t.payIcon className="size-4" />} onClick={() => navigate(t.pay)}>{t.payLabel}</Button>}
        </>} />
      {mirror ? (
        <Figures items={[
          { title: t.balance, value: tl(totalBalance), icon: <Scale />, onClick: () => setFilter('open'),
            sub: `${all.filter((r) => bal(r) !== 0).length} hesapta bakiye var` },
          { title: "Pratikortam'dan", value: status?.lastAt ? ago(status.lastAt) : '—', icon: <FileSpreadsheet />, plain: true,
            sub: 'Son güncelleme. Günde birkaç kez kendiliğinden yenilenir.' },
        ]} />
      ) : <Figures items={[
        { title: t.balance, value: tl(totalBalance), icon: <Scale />, onClick: () => setFilter('open'),
          sub: `${all.filter((r) => r.balance !== 0).length} hesapta bakiye var` },
        { title: 'Vadesi geçen', value: tl(totalOverdue), icon: <AlertTriangle />, onClick: () => setFilter('overdue'), tone: totalOverdue > 0 ? 'text-bad' : undefined,
          sub: overdueCount ? `${overdueCount} hesap · listelemek için tıklayın` : 'Vadesi geçen yok' },
        kind === 'customers'
          ? { title: 'Faturası kesilecek seferler', value: tl(waiting.total), icon: <FileSpreadsheet />, highlight: waiting.count > 0,
              sub: waiting.count ? `${waiting.count} sefer · fatura kesmek için tıklayın` : 'Bekleyen yok', onClick: () => navigate('/faturalar/yeni') }
          : { title: 'Taşeron faturası gelmeyen', value: <>{waiting.count}<Word> sefer</Word></>, icon: <Truck />, highlight: waiting.count > 0,
              sub: 'Listelemek için tıklayın', onClick: () => navigate('/seferler?carrierInvoice=missing') },
      ]} />}
      <Card bodyClassName="p-0" title="Hesaplar" icon={<Scale className="size-4" />}
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Ünvan, VKN, telefon..." />}>
        <div role="radiogroup" aria-label="Gösterilecek hesaplar" className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3 sm:px-6">
          {([['open', 'Bakiyesi olanlar'], ['overdue', 'Vadesi geçenler'], ['all', 'Hepsi']] as const).filter(([v]) => !mirror || v !== 'overdue').map(([v, label]) => (
            <button key={v} role="radio" aria-checked={filter === v} onClick={() => setFilter(v)}
              className={clsx('min-h-8 rounded-[3px] border px-3 text-[0.8125rem] font-semibold transition',
                filter === v ? 'border-accent bg-accent text-white' : 'border-line bg-white text-muted hover:border-slate-300 hover:bg-surface-2 hover:text-fg')}>
              {label}
            </button>
          ))}
        </div>
        <DataTable columns={columns} rows={rows} loading={isFetching} error={error} onRetry={refetch} rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`${t.detail}/${r.id}`)} footer={footer}
          sort={sort.key} desc={sort.desc} onSort={onSort}
          empty={search ? 'Aramanıza uyan kayıt yok.' : filter === 'overdue' ? 'Vadesi geçen hesap yok.' : filter === 'open' ? 'Bakiyesi olan hesap yok. Hepsini görmek için “Hepsi”yi seçin.' : 'Henüz kayıt yok.'}
          mobileCard={(r) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-fg">{r.title}</div>
                {r.overdue > 0 ? <div className="text-sm text-bad">Vadesi geçen <span className="tabular-nums">{tl(r.overdue)}</span></div>
                  : <div className="text-sm text-slate-500">{r.taxNumber ? `VKN ${r.taxNumber}` : r.phone ?? ''}</div>}
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{tl(bal(r))}</span>
            </div>
          )} />
      </Card>
    </>
  )
}

/** Tutar hücresindeki sözcük ("Vadesi geçen", "sefer"): hücre Overpass Mono olsa da yazı normal kalır, yalnız rakam mono. */
const Word = ({ children }: { children: ReactNode }) => <span className="font-sans tracking-normal">{children}</span>

interface Figure {
  title: string; value: ReactNode; sub: ReactNode; icon: ReactNode
  onClick?: () => void
  /** Yapılacak iş (ör. faturası kesilecek seferler): bill-soft zeminli. */
  highlight?: boolean
  tone?: string
  /** Tıklanmayan bilgi kutusu */
  plain?: boolean
}

/** Ana sayfa rakamları düzeninde özet: yan yana kutular, aralarında çizgi; etiket küçük BÜYÜK HARF, değer Overpass Mono. */
function Figures({ items }: { items: Figure[] }) {
  return (
    <div className={clsx('card mb-6 grid divide-y divide-line overflow-hidden sm:divide-x sm:divide-y-0', items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      {items.map((f) => {
        const body = <>
          <div className={clsx('flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.07em] [&_svg]:size-3.5', f.highlight ? 'text-bill' : 'text-muted')}>
            {f.icon}{f.title}
          </div>
          <div className={clsx('mt-1 truncate font-mono text-[1.375rem] font-semibold leading-tight tracking-[-0.02em]', f.highlight ? 'text-bill' : f.tone ?? 'text-fg')}>{f.value}</div>
          <div className={clsx('mt-0.5 text-[0.8125rem]', f.highlight ? 'text-bill' : 'text-muted')}>{f.sub}</div>
        </>
        const cls = clsx('min-w-0 px-4 py-3.5 text-left', f.highlight && 'bg-bill-soft')
        return f.plain || !f.onClick
          ? <div key={f.title} className={cls}>{body}</div>
          : <button key={f.title} type="button" onClick={f.onClick} className={clsx(cls, 'transition', f.highlight ? 'hover:brightness-[.97]' : 'hover:bg-surface-2')}>{body}</button>
      })}
    </div>
  )
}
