import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { get } from '../api/client'
import type { Vehicle, VehicleOwnership, VehicleStatus } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, Chip, ConfirmDialog, IconButton, PageHeader, PlateBadge, Select } from '../components/ui'
import { ImportButton } from '../components/ImportDialog'
import { FirstUse } from '../components/FirstUse'
import { ExportButton } from '../components/Exports'
import { useAuth } from '../lib/auth'
import { date, daysUntil } from '../lib/format'
import { crud, useDebounce, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { options, vehicleStatusLabel, vehicleStatusTone } from '../lib/labels'
import { VehicleForm } from '../components/VehicleForm'

const api = crud<Vehicle, unknown>('vehicles')

/** Öz araçlar varsayılan: taşeron araçları ayrı sekmede (adres: ?tip=taseron / ?tip=hepsi). */
const tabs = [
  { key: 'oz', label: 'Öz araçlarım', ownership: 'Own' },
  { key: 'taseron', label: 'Taşeron araçları', ownership: 'Rented' },
  { key: 'hepsi', label: 'Hepsi', ownership: '' },
] as const


export default function VehiclesPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<VehicleStatus | ''>('')
  const [sort, setSort] = useState({ key: 'plate', desc: false })
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  useOpenNewFromUrl(() => setEditing('new'))
  const [deleting, setDeleting] = useState<Vehicle | null>(null)
  const debounced = useDebounce(search)
  const tab = tabs.find((t) => t.key === params.get('tip')) ?? tabs[0]
  const ownership: VehicleOwnership | '' = tab.ownership
  const setTab = (key: string) => {
    if (key === 'oz') params.delete('tip'); else params.set('tip', key)
    setParams(params, { replace: true })
  }
  const [page, setPage] = usePage([debounced, status, ownership])

  // Bildirimden gelen ?id=… bağlantısı ilgili aracı açar.
  useEffect(() => {
    const id = params.get('id')
    if (!id) return
    get<Vehicle>(`/vehicles/${id}`).then(setEditing).catch(() => undefined)
    params.delete('id')
    setParams(params, { replace: true })
  }, [params, setParams])

  const query = { page, pageSize: 20, search: debounced, status, ownership, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<Vehicle>('vehicles', query)
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['vehicles'], success: 'Araç silindi.', onSuccess: () => setDeleting(null) })

  const columns: Column<Vehicle>[] = [
    {
      key: 'plate', header: 'Plaka', sortKey: 'plate', render: (v) => <span className="font-medium"><PlateBadge plate={v.plate} />
        {v.ownership === 'Rented' && <span className="ml-1"><Badge tone="purple">Kiralık</Badge></span>}
        {(v.supplierTitle || v.trailerPlate) && <span className="block text-sm font-normal text-slate-500">{[v.supplierTitle, v.trailerPlate && `Dorse ${v.trailerPlate}`].filter(Boolean).join(' · ')}</span>}</span>,
    },
    { key: 'type', header: 'Araç Tipi', sortKey: 'type', render: (v) => <>{v.type}<span className="block text-sm text-slate-500">{[v.brand, v.model, v.modelYear].filter(Boolean).join(' ')}</span></> },
    { key: 'driver', header: 'Şoför', render: (v) => v.defaultDriverName ?? '—' },
    { key: 'status', header: 'Durum', sortKey: 'status', render: (v) => <Badge tone={vehicleStatusTone[v.status]}>{vehicleStatusLabel[v.status]}</Badge> },
    { key: 'km', header: 'Km', sortKey: 'km', align: 'right', render: (v) => v.km.toLocaleString('tr-TR') },
    { key: 'next', header: 'Sonraki Bakım', sortKey: 'nextMaintenanceDate', render: (v) => <><DueDate value={v.nextMaintenanceDate} warn={15} />
      {v.nextMaintenanceKm != null && <span className={`block text-sm ${v.nextMaintenanceKm - v.km <= 1000 ? 'font-medium text-amber-600' : 'text-slate-500'}`}>{v.nextMaintenanceKm.toLocaleString('tr-TR')} km</span>}
      <span className="block text-sm text-slate-500">Son: {date(v.lastMaintenanceDate)}</span></> },
    { key: 'docs', header: 'Muayene / Sigorta', render: (v) => <><span className="block"><span className="text-sm text-slate-500">M: </span><DueDate value={v.inspectionExpiry} warn={30} /></span><span className="block"><span className="text-sm text-slate-500">S: </span><DueDate value={v.insuranceExpiry} warn={30} /></span></> },
  ]
  if (can('operations')) columns.push({
    key: 'actions', header: '', align: 'right', render: (v) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton write label="Düzenle" onClick={() => setEditing(v)}><Pencil className="size-4" /></IconButton>
        <IconButton write label="Sil" onClick={() => setDeleting(v)}><Trash2 className="size-4" /></IconButton>
      </div>
    ),
  })

  return (
    <>
      <PageHeader title="Araçlar" subtitle="Filo, bakım ve belge takibi"
        actions={<>
          <ExportButton url="/vehicles/export" params={query} fileName="araclar.xlsx" />
          {can('operations') && <>
            <ImportButton entity="vehicles" />
            <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni Araç</Button>
          </>}
        </>} />
      <Card title={tab.key === 'taseron' ? 'Taşeron Araçları' : tab.key === 'hepsi' ? 'Bütün Araçlar' : 'Öz Araçlarım'} icon={<Truck className="size-4" />} bodyClassName="p-0"
        actions={<>
          <Select aria-label="Durum" className="sm:w-40" value={status} onChange={setStatus} options={options(vehicleStatusLabel)} placeholder="Tüm durumlar" />
          <SearchBox value={search} onChange={setSearch} placeholder="Plaka, marka, tip..." />
        </>}>
        <div role="tablist" aria-label="Araç sahipliği" className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
          {tabs.map((t) => (
            <Chip key={t.key} role="tab" aria-selected={tab.key === t.key} active={tab.key === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(v) => v.id}
          onRowClick={can('operations') ? setEditing : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty={debounced || status ? "Aramanıza uyan kayıt yok." : tab.key === 'taseron' ? "Taşeron aracı yok." : (
            <FirstUse title="İlk aracınızı ekleyin" addLabel="Yeni araç" onAdd={can('operations') ? () => setEditing('new') : undefined} importEntity={can('operations') ? 'vehicles' : undefined}>
              Araçlarınız burada listelenir; bakım ve belge uyarıları da buradan gelir. Tek tek ekleyin ya da plaka listenizi Excel'den aktarın.
            </FirstUse>)} />
      </Card>
      {editing && <VehicleForm vehicle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Aracı sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>{deleting?.plate} plakalı araç silinecek. Emin misiniz?</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}

export function DueDate({ value, warn }: { value?: string | null; warn: number }) {
  const d = daysUntil(value)
  if (d === null) return <span className="text-slate-500">—</span>
  const cls = d < 0 ? 'font-medium text-red-600' : d <= warn ? 'font-medium text-amber-600' : ''
  return <span className={cls} title={d < 0 ? `${-d} gün geçti` : `${d} gün kaldı`}>{date(value)}</span>
}
