import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Download, FileSpreadsheet, Plus, Receipt, Wrench } from 'lucide-react'
import type { ApprovalStatus, Expense, ExpenseCategory, ExpenseTotals } from '../api/types'
import { openPdf } from '../api/client'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, Chip, DateFilter, PlateBadge, Select } from '../components/ui'
import { ExportButton, TotalsStrip, useExportAction } from '../components/Exports'
import { ImportButton, useImportAction } from '../components/ImportDialog'
import { FilterBar, FilterPanel, type FilterChip } from '../components/shell/FilterPanel'
import type { MenuItem } from '../components/shell/Menu'
import { PageShell } from '../components/shell/PageShell'
import { SumStrip } from '../components/SumStrip'
import { date, monthEndIso, monthStartIso, tl2 } from '../lib/format'
import { useDebounce, useListTotals, useLookup, usePaged, usePage } from '../lib/hooks'
import { approvalStatusLabel, expenseCategoryLabel, options } from '../lib/labels'
import { useIsNewUi } from '../lib/uiMode'

/**
 * Araç Masrafları (`/arac-masraflari`) — şartname: docs/plan/21-OZ-MAL-ARAC-MASRAFLARI.md.
 *
 * Bir aracın (öz mal ya da kiralık) bütün giderleri tek ekranda: araç süzgeci ekranın ana eksenidir,
 * seçilince toplamlar ve liste o araca daralır. Sunucuda yeni uç **gerekmez**: mevcut
 * `GET /api/expenses` ve `GET /api/expenses/totals` uçları `vehicleId`, `category`, `from`, `to`,
 * `approvalStatus` ve `search` süzgeçlerini zaten kabul eder. Kilometre/litre sütunları burada
 * yoktur; onlar Mazotlar ekranının işidir.
 *
 * Süzgeçler adreste durur (`?ara=`, `?arac=`, `?tur=`, `?bas=`, `?bit=`, `?onay=`).
 * Klasik görünümde ekran bugünkü dille çalışır (PageHeader + Card + TotalsStrip + tablo);
 * yeni görünümde PageShell + FilterBar + SumStrip kullanılır.
 */
export default function VehicleExpensesPage() {
  const navigate = useNavigate()
  const isNew = useIsNewUi()
  const [params, setParams] = useSearchParams()
  const textParam = (k: string) => params.get(k) ?? ''
  const oneOf = <T extends string>(v: string | null, all: readonly T[]): T | '' => (v && (all as readonly string[]).includes(v) ? (v as T) : '')
  const approvalKeys = Object.keys(approvalStatusLabel) as ApprovalStatus[]
  const categoryKeys = Object.keys(expenseCategoryLabel) as ExpenseCategory[]
  // Yeni görünümde varsayılan dönem bu aydır (şartname §3); klasik görünümde bugünkü gibi süzgeçsiz başlar.
  const defaultFrom = isNew ? monthStartIso() : ''
  const defaultTo = isNew ? monthEndIso() : ''
  const [search, setSearch] = useState(textParam('ara'))
  const [vehicleId, setVehicleId] = useState<number | ''>((Number(params.get('arac')) || '') as number | '')
  const [category, setCategory] = useState<ExpenseCategory | ''>(oneOf(params.get('tur'), categoryKeys))
  const [from, setFrom] = useState(() => textParam('bas') || defaultFrom)
  const [to, setTo] = useState(() => textParam('bit') || defaultTo)
  const [approval, setApproval] = useState<ApprovalStatus | ''>(oneOf(params.get('onay'), approvalKeys))
  const [sort, setSort] = useState({ key: 'date', desc: true })
  const [filterOpen, setFilterOpen] = useState(false)
  const debounced = useDebounce(search)
  const vehicles = useLookup('vehicles')
  const [page, setPage] = usePage([debounced, vehicleId, category, from, to, approval])

  const query = { page, pageSize: 20, search: debounced, vehicleId, category, from, to, approvalStatus: approval, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<Expense>('expenses', query)
  const { data: totals } = useListTotals<ExpenseTotals>('expenses', query)
  // "Bu ay" kutusu: tarih süzgeci dışındaki süzgeçlerle bu ayın toplamı (sayfanın değil, filtrenin tamamı).
  const { data: monthTotals } = useListTotals<ExpenseTotals>('expenses',
    { search: debounced, vehicleId, category, approvalStatus: approval, from: monthStartIso(), to: monthEndIso() })

  // Süzgeçleri adrese yaz (yalnızca değişince; başka parametrelere dokunmadan).
  const urlState = JSON.stringify({ ara: debounced, arac: vehicleId, tur: category, bas: from, bit: to, onay: approval })
  useEffect(() => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(JSON.parse(urlState) as Record<string, string | number>)) {
      if (v === '' || v == null) next.delete(k)
      else next.set(k, String(v))
    }
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [urlState, params, setParams])

  const anyFilter = !!(search || vehicleId || category || approval || from !== defaultFrom || to !== defaultTo)
  const onlyVehicle = !!vehicleId && !search && !category && !approval && from === defaultFrom && to === defaultTo
  const clearFilters = () => { setSearch(''); setVehicleId(''); setCategory(''); setFrom(defaultFrom); setTo(defaultTo); setApproval('') }
  const openNew = () => navigate('/giderler?new=1')
  const exp = useExportAction()
  const imp = useImportAction('expenses')

  const vehicleName = vehicles.data?.find((v) => v.id === vehicleId)?.label
  const chips: FilterChip[] = [
    ...(vehicleId ? [{ label: `Araç: ${vehicleName ?? vehicleId}`, onClear: () => setVehicleId('') }] : []),
    ...(category ? [{ label: `Kategori: ${expenseCategoryLabel[category]}`, onClear: () => setCategory('') }] : []),
    ...(from || to ? [{ label: `Tarih: ${from ? date(from) : '…'} – ${to ? date(to) : '…'}`, onClear: () => { setFrom(''); setTo('') } }] : []),
    ...(approval ? [{ label: `Onay: ${approvalStatusLabel[approval]}`, onClear: () => setApproval('') }] : []),
  ]

  const more: MenuItem[] = [
    { label: 'Mazotlar', icon: <Receipt className="size-4" />, onClick: () => navigate('/mazotlar') },
    { label: "Excel'e aktar", icon: <Download className="size-4" />, onClick: () => exp.run('/expenses/export', 'arac-masraflari.xlsx', query) },
    { label: "Excel'den aktar", icon: <FileSpreadsheet className="size-4" />, write: true, onClick: imp.run },
  ]

  const columns: Column<Expense>[] = [
    { key: 'date', header: 'Tarih', sortKey: 'date', render: (e) => date(e.date) },
    {
      key: 'cat', header: 'Kategori', sortKey: 'category', render: (e) => <>
        <Badge tone="blue">{expenseCategoryLabel[e.category]}</Badge>
        {e.approvalStatus === 'Pending' && <span className="mt-1 block"><Badge tone="yellow">Onay bekliyor</Badge></span>}
        {e.approvalStatus === 'Rejected' && <span className="mt-1 block"><Badge tone="red">Reddedildi</Badge></span>}
      </>,
    },
    { key: 'plate', header: 'Araç', render: (e) => e.vehiclePlate ? <PlateBadge plate={e.vehiclePlate} /> : (e.driverName ?? '—') },
    { key: 'trip', header: 'Sevkiyat', className: 'min-w-40', render: (e) => e.tripLabel ?? '—' },
    {
      key: 'desc', header: 'Açıklama', className: 'min-w-40', render: (e) => <>
        {e.description ?? '—'}
        {e.supplierTitle && <span className="block text-sm text-slate-500">{e.supplierTitle}{e.isOnCredit && ' · vadeli'}</span>}
        {e.hasReceipt && <button type="button" className="block text-sm font-medium text-brand-700 underline"
          onClick={(ev) => { ev.stopPropagation(); openPdf(`/expenses/${e.id}/receipt`, `fis-${e.id}`).catch(() => undefined) }}>Fişi gör</button>}
      </>,
    },
    { key: 'amount', header: 'Tutar', sortKey: 'amount', align: 'right', render: (e) => <span className="font-medium">{tl2(e.amount)}</span> },
  ]

  const empty = anyFilter
    ? (onlyVehicle ? 'Bu araç için masraf kaydı yok.' : 'Aramanıza uyan kayıt yok.')
    : (
      <div className="flex flex-col items-center gap-3">
        <Wrench className="size-6 text-muted" aria-hidden />
        <p>Araç masrafı yok. Bir araç seçin ya da “+ Gider Ekle” ile girin.</p>
        <Button write icon={<Plus className="size-4" />} onClick={openNew}>Gider Ekle</Button>
      </div>
    )

  const approvals = <Select aria-label="Onay durumu" value={approval} onChange={setApproval} options={options(approvalStatusLabel)} placeholder="Tüm onay durumları" />
  const categories = <Select aria-label="Kategori" value={category} onChange={setCategory} options={options(expenseCategoryLabel)} placeholder="Tüm kategoriler" />
  const vehiclesSelect = <Select aria-label="Araç" value={vehicleId} onChange={setVehicleId} placeholder="Tüm araçlar"
    options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
  const searchBox = <SearchBox value={search} onChange={setSearch} placeholder="Plaka, açıklama, sevkiyat..." />

  return (
    <>
      <PageShell title="Araç Masrafları" subtitle="Bir aracın bütün masrafları: yakıt, bakım, otoyol ve diğer"
        more={more} primary={<Button write icon={<Plus className="size-4" />} onClick={openNew}>Gider Ekle</Button>}
        actions={<>
          <ExportButton url="/expenses/export" params={query} fileName="arac-masraflari.xlsx" />
          <ImportButton entity="expenses" />
          <Button write icon={<Plus className="size-4" />} onClick={openNew}>Gider Ekle</Button>
        </>}>
        {isNew && (
          <div className="mb-3">
            <FilterBar search={searchBox}
              quick={<>
                <Select aria-label="Araç" value={vehicleId} onChange={setVehicleId} className="w-44" placeholder="Tüm araçlar"
                  options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
                <Chip active={from === monthStartIso() && to === monthEndIso()} onClick={() => { setFrom(monthStartIso()); setTo(monthEndIso()) }}>Bu ay</Chip>
                <Chip active={!from && !to} onClick={() => { setFrom(''); setTo('') }}>Hepsi</Chip>
              </>}
              chips={chips} onOpen={() => setFilterOpen(true)} onClearAll={anyFilter ? clearFilters : undefined} />
          </div>
        )}
        <Card title={isNew ? undefined : 'Araç Masrafları Listesi'} icon={isNew ? undefined : <Wrench className="size-4" />} bodyClassName="p-0"
          actions={isNew ? undefined : searchBox}>
          {!isNew && (
            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              {vehiclesSelect}
              {categories}
              {approvals}
              <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
              <DateFilter label="Bitiş" value={to} onChange={setTo} />
            </div>
          )}
          {totals && totals.count > 0 && (isNew ? (
            <SumStrip label="Masraf toplamları" items={[
              { label: 'Toplam', value: tl2(totals.total) },
              { label: 'Bu ay', value: monthTotals ? tl2(monthTotals.total) : '—' },
              { label: 'Kayıt', value: totals.count },
              ...(totals.pending > 0 ? [{ label: 'Onay bekleyen', value: tl2(totals.pending), tone: 'text-warn' }] : []),
            ]} />
          ) : (
            <TotalsStrip items={[
              { label: 'Kayıt', value: totals.count },
              { label: 'Toplam', value: tl2(totals.total) },
              { label: 'Bu ay', value: monthTotals ? tl2(monthTotals.total) : '—' },
              ...(totals.pending > 0 ? [{ label: 'Onay bekleyen', value: tl2(totals.pending), tone: 'text-amber-700' }] : []),
            ]} note={approval ? undefined : 'Reddedilen masraflar toplama girmez.'} />
          ))}
          <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(e) => e.id}
            sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
            page={page} pageSize={20} total={data?.total} onPage={setPage} empty={empty}
            mobileCard={(e) => (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {e.vehiclePlate && <PlateBadge plate={e.vehiclePlate} />}
                    <Badge tone="blue">{expenseCategoryLabel[e.category]}</Badge>
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{tl2(e.amount)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>{date(e.date)}</span>
                  {e.approvalStatus === 'Pending' && <Badge tone="yellow">Onay bekliyor</Badge>}
                  {e.approvalStatus === 'Rejected' && <Badge tone="red">Reddedildi</Badge>}
                </div>
                <div className="text-sm">{e.description ?? e.tripLabel ?? '—'}</div>
                {e.tripLabel && e.description && <div className="truncate text-sm text-muted">{e.tripLabel}</div>}
                {e.hasReceipt && (
                  <button type="button" className="text-sm font-medium text-brand-700 underline"
                    onClick={(ev) => { ev.stopPropagation(); openPdf(`/expenses/${e.id}/receipt`, `fis-${e.id}`).catch(() => undefined) }}>Fişi gör</button>
                )}
              </div>
            )} />
        </Card>
      </PageShell>
      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} onClearAll={anyFilter ? clearFilters : undefined}>
        {vehiclesSelect}
        {categories}
        {approvals}
        <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
        <DateFilter label="Bitiş" value={to} onChange={setTo} />
      </FilterPanel>
      {imp.dialog}
    </>
  )
}
