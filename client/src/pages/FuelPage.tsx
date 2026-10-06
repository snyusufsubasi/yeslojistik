import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Download, FileSpreadsheet, Fuel, Receipt } from 'lucide-react'
import type { ApprovalStatus, Expense, ExpenseTotals } from '../api/types'
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
import { approvalStatusLabel, options } from '../lib/labels'
import { useIsNewUi } from '../lib/uiMode'

/**
 * Mazotlar (`/mazotlar`) — yeni sayfa, şartname: docs/plan/19-OZ-MAL-MAZOTLAR.md.
 *
 * Yakıt ayrı bir tablo değildir: `Expense` kaydının kategorisi `Fuel` olmasıdır. Bu yüzden liste
 * mevcut `GET /api/expenses` ucundan `category=Fuel` ile çekilir; litre, kilometre ve "önceki km"
 * ayrıntısı satır üzerinde gelir (`Expense.details`). Fark km ve km başı maliyet istemcide hesaplanır.
 *
 * Süzgeçler adreste durur (`?plaka=`, `?arac=`, `?bas=`, `?bit=`, `?onay=`): yenilenince ve link
 * paylaşılınca kaybolmaz. Klasik görünümde ekran bugünkü dille çalışır (PageHeader + Card +
 * TotalsStrip + tablo); yeni görünümde PageShell + FilterBar + SumStrip kullanılır.
 */
export default function FuelPage() {
  const navigate = useNavigate()
  const isNew = useIsNewUi()
  const [params, setParams] = useSearchParams()
  const textParam = (k: string) => params.get(k) ?? ''
  const oneOf = <T extends string>(v: string | null, all: readonly T[]): T | '' => (v && (all as readonly string[]).includes(v) ? (v as T) : '')
  const approvalKeys = Object.keys(approvalStatusLabel) as ApprovalStatus[]
  // Yeni görünümde varsayılan dönem bu aydır (şartname §4); klasik görünümde bugünkü gibi süzgeçsiz başlar.
  const defaultFrom = isNew ? monthStartIso() : ''
  const defaultTo = isNew ? monthEndIso() : ''
  const [search, setSearch] = useState(textParam('plaka'))
  const [vehicleId, setVehicleId] = useState<number | ''>((Number(params.get('arac')) || '') as number | '')
  const [from, setFrom] = useState(() => textParam('bas') || defaultFrom)
  const [to, setTo] = useState(() => textParam('bit') || defaultTo)
  const [approval, setApproval] = useState<ApprovalStatus | ''>(oneOf(params.get('onay'), approvalKeys))
  const [sort, setSort] = useState({ key: 'date', desc: true })
  const [filterOpen, setFilterOpen] = useState(false)
  const debounced = useDebounce(search)
  const vehicles = useLookup('vehicles')
  const [page, setPage] = usePage([debounced, vehicleId, from, to, approval])

  const query = { page, pageSize: 20, search: debounced, category: 'Fuel', vehicleId, from, to, approvalStatus: approval, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<Expense>('expenses', query)
  const { data: totals } = useListTotals<ExpenseTotals>('expenses', query)
  // "Bu ay" kutusu: tarih süzgeci dışındaki süzgeçlerle bu ayın toplamı (sayfanın değil, filtrenin tamamı).
  const { data: monthTotals } = useListTotals<ExpenseTotals>('expenses',
    { search: debounced, category: 'Fuel', vehicleId, approvalStatus: approval, from: monthStartIso(), to: monthEndIso() })

  // Süzgeçleri adrese yaz (yalnızca değişince; başka parametrelere dokunmadan).
  const urlState = JSON.stringify({ plaka: debounced, arac: vehicleId, bas: from, bit: to, onay: approval })
  useEffect(() => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(JSON.parse(urlState) as Record<string, string | number>)) {
      if (v === '' || v == null) next.delete(k)
      else next.set(k, String(v))
    }
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [urlState, params, setParams])

  const anyFilter = !!(search || vehicleId || approval || from !== defaultFrom || to !== defaultTo)
  const onlyVehicle = !!vehicleId && !search && !approval && from === defaultFrom && to === defaultTo
  const clearFilters = () => { setSearch(''); setVehicleId(''); setFrom(defaultFrom); setTo(defaultTo); setApproval('') }
  const openNew = () => navigate('/giderler?new=1')
  const exp = useExportAction()
  const imp = useImportAction('expenses')

  const vehicleName = vehicles.data?.find((v) => v.id === vehicleId)?.label
  const chips: FilterChip[] = [
    ...(vehicleId ? [{ label: `Araç: ${vehicleName ?? vehicleId}`, onClear: () => setVehicleId('') }] : []),
    ...(from || to ? [{ label: `Tarih: ${from ? date(from) : '…'} – ${to ? date(to) : '…'}`, onClear: () => { setFrom(''); setTo('') } }] : []),
    ...(approval ? [{ label: `Onay: ${approvalStatusLabel[approval]}`, onClear: () => setApproval('') }] : []),
  ]

  const more: MenuItem[] = [
    { label: 'Tüm giderler', icon: <Receipt className="size-4" />, onClick: () => navigate('/giderler') },
    { label: "Excel'e aktar", icon: <Download className="size-4" />, onClick: () => exp.run('/expenses/export', 'mazotlar.xlsx', query) },
    { label: "Excel'den aktar", icon: <FileSpreadsheet className="size-4" />, write: true, onClick: imp.run },
  ]

  const columns: Column<Expense>[] = [
    { key: 'plate', header: 'Plaka', render: (e) => e.vehiclePlate ? <PlateBadge plate={e.vehiclePlate} /> : '—' },
    {
      key: 'date', header: 'Tarih', sortKey: 'date', render: (e) => <>
        {date(e.date)}
        {e.approvalStatus === 'Pending' && <span className="mt-1 block"><Badge tone="yellow">Onay bekliyor</Badge></span>}
        {e.approvalStatus === 'Rejected' && <span className="mt-1 block"><Badge tone="red">Reddedildi</Badge></span>}
      </>,
    },
    { key: 'fuelType', header: 'Yakıt cinsi', render: (e) => e.details?.fuelType ?? '—' },
    { key: 'station', header: 'İstasyon', className: 'min-w-32', render: (e) => e.details?.fuelStation ?? '—' },
    { key: 'liters', header: 'Litre', align: 'right', render: (e) => liters(e.liters) },
    {
      key: 'amount', header: 'Tutar', sortKey: 'amount', align: 'right', render: (e) => <>
        <span className="font-medium">{tl2(e.amount)}</span>
        {e.hasReceipt && <button type="button" className="mt-0.5 block text-sm font-medium text-brand-700 underline"
          onClick={(ev) => { ev.stopPropagation(); openPdf(`/expenses/${e.id}/receipt`, `fis-${e.id}`).catch(() => undefined) }}>Fişi gör</button>}
      </>,
    },
    { key: 'odometer', header: 'Yeni km', align: 'right', render: (e) => km(e.odometer) },
    { key: 'previous', header: 'Eski km', align: 'right', render: (e) => km(e.details?.previousOdometer) },
    { key: 'diff', header: 'Fark km', align: 'right', render: (e) => km(kmDiff(e)) },
    { key: 'perKm', header: 'Km başı maliyet', align: 'right', render: (e) => { const p = perKmCost(e); return p == null ? '—' : tl2(p) } },
  ]

  const empty = anyFilter
    ? (onlyVehicle ? 'Bu aracın kayıtlı deposu yok.' : 'Aramanıza uyan mazot kaydı yok.')
    : (
      <div className="flex flex-col items-center gap-3">
        <Fuel className="size-6 text-muted" aria-hidden />
        <p>Henüz mazot kaydı yok. İlk depoyu “+ Mazot Ekle” ile girin.</p>
        <Button write onClick={openNew}>+ Mazot Ekle</Button>
      </div>
    )

  const approvals = <Select aria-label="Onay durumu" value={approval} onChange={setApproval} options={options(approvalStatusLabel)} placeholder="Tüm onay durumları" />
  const vehiclesSelect = <Select aria-label="Araç" value={vehicleId} onChange={setVehicleId} placeholder="Tüm araçlar"
    options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
  const searchBox = <SearchBox value={search} onChange={setSearch} placeholder="Plaka, istasyon, açıklama..." />

  return (
    <>
      <PageShell title="Mazotlar" subtitle="Mazot (yakıt) kayıtları: litre, tutar, kilometre ve km başı maliyet"
        more={more} primary={<Button write onClick={openNew}>+ Mazot Ekle</Button>}
        actions={<>
          <ExportButton url="/expenses/export" params={query} fileName="mazotlar.xlsx" />
          <ImportButton entity="expenses" />
          <Button write onClick={openNew}>+ Mazot Ekle</Button>
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
        <Card title={isNew ? undefined : 'Mazot Listesi'} icon={isNew ? undefined : <Fuel className="size-4" />} bodyClassName="p-0"
          actions={isNew ? undefined : searchBox}>
          {!isNew && (
            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
              {vehiclesSelect}
              {approvals}
              <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
              <DateFilter label="Bitiş" value={to} onChange={setTo} />
            </div>
          )}
          {totals && totals.count > 0 && (isNew ? (
            <SumStrip label="Mazot toplamları" items={[
              { label: 'Kayıt', value: totals.count },
              { label: 'Tutar', value: tl2(totals.total) },
              { label: 'Bu ay', value: monthTotals ? tl2(monthTotals.total) : '—' },
              ...(totals.pending > 0 ? [{ label: 'Onay bekleyen', value: tl2(totals.pending), tone: 'text-warn' }] : []),
            ]} />
          ) : (
            <TotalsStrip items={[
              { label: 'Kayıt', value: totals.count },
              { label: 'Toplam', value: tl2(totals.total) },
              { label: 'Bu ay', value: monthTotals ? tl2(monthTotals.total) : '—' },
              ...(totals.pending > 0 ? [{ label: 'Onay bekleyen', value: tl2(totals.pending), tone: 'text-amber-700' }] : []),
            ]} note={approval ? undefined : 'Reddedilen mazot kayıtları toplama girmez.'} />
          ))}
          <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(e) => e.id}
            sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
            page={page} pageSize={20} total={data?.total} onPage={setPage} empty={empty}
            mobileCard={(e) => (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  {e.vehiclePlate ? <PlateBadge plate={e.vehiclePlate} /> : <span className="text-muted">Araç yok</span>}
                  <span className="font-mono font-semibold tabular-nums">{tl2(e.amount)}</span>
                </div>
                <div className="text-sm text-muted">
                  {date(e.date)}{e.details?.fuelType ? ` · ${e.details.fuelType}` : ''}{e.details?.fuelStation ? ` · ${e.details.fuelStation}` : ''}
                </div>
                <div className="flex justify-between gap-2 text-sm"><span>{liters(e.liters)}</span><span>{km(e.odometer)} km</span></div>
                <div className="flex justify-between gap-2 text-sm">
                  <span>Fark: {km(kmDiff(e))} km</span>
                  <span>{perKmCost(e) == null ? '—' : `${tl2(perKmCost(e))}/km`}</span>
                </div>
                {e.approvalStatus === 'Pending' && <Badge tone="yellow">Onay bekliyor</Badge>}
                {e.approvalStatus === 'Rejected' && <Badge tone="red">Reddedildi</Badge>}
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
        {approvals}
        <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
        <DateFilter label="Bitiş" value={to} onChange={setTo} />
      </FilterPanel>
      {imp.dialog}
    </>
  )
}

/** Litre: iki ondalık, "L" son ekiyle; girilmemişse "—". */
function liters(v: number | null | undefined) {
  return v == null ? '—' : `${v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} L`
}

/** Kilometre: tam sayı; girilmemişse "—". */
function km(v: number | null | undefined) {
  return v == null ? '—' : v.toLocaleString('tr-TR')
}

/** Fark km = yeni km − eski km. Eski km boş ya da fark 0/negatifse hesap yoktur ("—" gösterilir). */
function kmDiff(e: Expense): number | null {
  const previous = e.details?.previousOdometer
  if (previous == null || e.odometer == null) return null
  const diff = e.odometer - previous
  return diff > 0 ? diff : null
}

/** Km başı maliyet = tutar ÷ fark km; fark yoksa hesap yoktur. */
function perKmCost(e: Expense): number | null {
  const diff = kmDiff(e)
  return diff && e.amount > 0 ? e.amount / diff : null
}
