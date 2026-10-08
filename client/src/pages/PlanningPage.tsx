import { useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  AlertTriangle, CalendarRange, ChevronLeft, ChevronRight, ClipboardList, FileWarning, GripVertical, MoveRight, Plus, Truck, UserRound,
} from 'lucide-react'
import { errorMessage, get, post } from '../api/client'
import type { Planning, PlanningAssignResult, PlanningDoc, PlanningDriver, PlanningRequest, PlanningTrip, PlanningVehicle } from '../api/types'
import { Badge, Button, Chip, Empty, Figure, Figures, Loading, Modal, PageHeader, PlateBadge, Select } from '../components/ui'
import { DateInput } from '../components/DateInput'
import { TripForm, type TripFormDefaults } from '../components/TripForm'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { addDaysIso, date, daysUntil, tl, todayIso } from '../lib/format'
import { useMirror } from '../lib/hooks'
import { tripStatusLabel } from '../lib/labels'

/**
 * Planlama panosu (docs/YES-Lojistik planı 6.3). Satırda araçlar, sütunda günler; "Atanmamış" iş talepleri ve şoför müsaitliği.
 * Masaüstünde kart sürüklenip araç × gün hücresine bırakılır; telefonda gün gün liste ve "Araca ata / Taşı" penceresi.
 * Çakışma (aynı araç ya da aynı şoför aynı günlerde) ve süresi dolan belge uyarısı karttaki etiketlerle görünür.
 */
type View = 'bugun' | 'yarin' | 'hafta'
const views: { value: View; label: string; days: number; offset: number }[] = [
  { value: 'bugun', label: 'Bugün', days: 1, offset: 0 },
  { value: 'yarin', label: 'Yarın', days: 1, offset: 1 },
  { value: 'hafta', label: 'Hafta', days: 7, offset: 0 },
]

const WEEKDAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' })
function dayLabel(iso: string, today: string) {
  const diff = daysUntil(iso) ?? 0
  const base = iso === today ? 'Bugün' : diff === 1 ? 'Yarın' : diff === -1 ? 'Dün' : WEEKDAY.format(new Date(iso + 'T00:00:00'))
  return { title: base, sub: date(iso).slice(0, 5) }
}
const daysBetween = (from: string, to: string) => {
  const out: string[] = []
  for (let d = from; d <= to; d = addDaysIso(d, 1)) out.push(d)
  return out
}
const spans = (t: PlanningTrip, d: string) => t.loadingDate <= d && d <= t.endDate
const place = (city: string | null | undefined, address: string) => city || (address.length > 22 ? address.slice(0, 22) + '…' : address)
const route = (t: { loadingCity?: string | null; deliveryCity?: string | null; loadingAddress: string; deliveryAddress: string }) =>
  `${place(t.loadingCity, t.loadingAddress)} → ${place(t.deliveryCity, t.deliveryAddress)}`
const docText = (d: PlanningDoc) => {
  const n = daysUntil(d.expiry) ?? 0
  return `${d.what}: ${n < 0 ? `${-n} gün önce doldu` : n === 0 ? 'bugün doluyor' : `${n} gün kaldı`} (${date(d.expiry)})`
}

type Drag = { kind: 'trip'; id: number } | { kind: 'request'; id: number }
type AssignTarget = { trip?: PlanningTrip; request?: PlanningRequest; vehicleId?: number; date?: string }

export default function PlanningPage() {
  const [params, setParams] = useSearchParams()
  const view = (views.find((v) => v.value === params.get('gorunum'))?.value ?? 'hafta') as View
  const [shift, setShift] = useState(0)
  const cfg = views.find((v) => v.value === view)!
  const from = addDaysIso(todayIso(), cfg.offset + shift * cfg.days)
  const to = addDaysIso(from, cfg.days - 1)
  const { can } = useAuth()
  const { mirror } = useMirror()
  const canWrite = can('operations') && !mirror
  const toast = useToast()
  const qc = useQueryClient()
  const { data, error, refetch } = useQuery({
    queryKey: ['planning', from, to], queryFn: () => get<Planning>('/planning', { from, to }), refetchInterval: 60_000,
  })
  const [assigning, setAssigning] = useState<AssignTarget | null>(null)
  const [newTrip, setNewTrip] = useState<TripFormDefaults | null>(null)
  const [dragging, setDragging] = useState<Drag | null>(null)

  const assign = useMutation({
    mutationFn: (body: { vehicleId: number; tripId?: number; jobRequestId?: number; date?: string; driverId?: number | null }) =>
      post<PlanningAssignResult>('/planning/assign', body),
    onSuccess: (r) => {
      for (const k of ['planning', 'trips', 'job-requests', 'today', 'dashboard']) qc.invalidateQueries({ queryKey: [k] })
      toast.success(r.created ? 'Sevkiyat açıldı ve araca atandı.' : 'Atama kaydedildi.')
      const notes = [
        r.conflictsWith.length ? `Aynı araçta çakışan sevkiyat: ${r.conflictsWith.map((i) => `#${i}`).join(', ')}` : null,
        r.driverConflictsWith?.length ? `Şoförün aynı günlerde başka sevkiyatı var: ${r.driverConflictsWith.map((i) => `#${i}`).join(', ')}` : null,
        ...(r.warnings ?? []),
      ].filter(Boolean)
      if (notes.length) toast.error(`Uyarı: ${notes.join(' · ')}`)
      setAssigning(null)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const setView = (v: View) => {
    setShift(0)
    const next = new URLSearchParams(params)
    if (v === 'hafta') next.delete('gorunum')
    else next.set('gorunum', v)
    setParams(next, { replace: true })
  }

  /** Sürükle-bırak: sevkiyat doğrudan taşınır; iş talebi şoförsüz araca bırakılırsa pencere açılır (şoför seçilsin). */
  const drop = (vehicle: PlanningVehicle, day: string, payload?: string) => {
    const [kind, raw] = (payload ?? '').split(':')
    const d: Drag | null = (kind === 'trip' || kind === 'request') && Number(raw) ? { kind, id: Number(raw) } : dragging
    setDragging(null)
    if (!d || !data) return
    if (d.kind === 'trip') {
      const t = data.trips.find((x) => x.id === d.id)
      if (!t || (t.vehicleId === vehicle.id && t.loadingDate === day)) return
      assign.mutate({ vehicleId: vehicle.id, tripId: t.id, date: day })
    } else {
      const r = data.unassigned.find((x) => x.id === d.id)
      if (!r) return
      if (vehicle.defaultDriverId) assign.mutate({ vehicleId: vehicle.id, jobRequestId: r.id, date: day })
      else setAssigning({ request: r, vehicleId: vehicle.id, date: day })
    }
  }

  const header = (
    <PageHeader title="Planlama" subtitle="Hangi araç hangi gün dolu, hangisi boş; atanmamış işleri araca atayın."
      actions={canWrite && <Button write icon={<Plus />} onClick={() => setNewTrip({ loadingDate: from })}>Sevkiyat Ekle</Button>} />
  )
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Görünüm">
      <div className="flex gap-1.5" role="tablist" aria-label="Gün aralığı">
        {views.map((v) => <Chip key={v.value} role="tab" aria-selected={view === v.value} active={view === v.value} onClick={() => setView(v.value)}>{v.label}</Chip>)}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" aria-label="Önceki" onClick={() => setShift((s) => s - 1)}
          className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-white text-muted hover:bg-surface-2 hover:text-fg"><ChevronLeft className="size-4" /></button>
        <span className="min-w-36 text-center text-[0.875rem] font-medium tabular-nums text-fg">{from === to ? date(from) : `${date(from).slice(0, 5)} – ${date(to)}`}</span>
        <button type="button" aria-label="Sonraki" onClick={() => setShift((s) => s + 1)}
          className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-white text-muted hover:bg-surface-2 hover:text-fg"><ChevronRight className="size-4" /></button>
        {shift !== 0 && <Button size="sm" variant="ghost" onClick={() => setShift(0)}>Bugüne dön</Button>}
      </div>
    </div>
  )

  if (!data) return <div className="space-y-4">{header}{toolbar}<Loading error={error} onRetry={refetch} /></div>

  const days = daysBetween(data.from, data.to)
  const drivers = data.drivers ?? []
  const freeToday = data.vehicles.filter((v) => v.status !== 'Maintenance' && !data.trips.some((t) => t.vehicleId === v.id && spans(t, days[0]))).length

  const onNew = (v: PlanningVehicle, d: string) => setNewTrip({ vehicleId: v.id, driverId: v.defaultDriverId ?? undefined, loadingDate: d })
  const onAssignRequest = (r: PlanningRequest) => setAssigning({ request: r, date: r.date })
  const unassignedList = <UnassignedPanel items={data.unassigned} canWrite={canWrite} setDragging={setDragging} onAssign={onAssignRequest} />
  const driversPanel = <DriversPanel drivers={drivers} trips={data.trips} days={days} today={data.today} />

  return (
    <div className="space-y-4">
      {header}
      {toolbar}
      <Figures label="Planlama özeti" className="grid-cols-2 md:grid-cols-4">
        <Figure label="Atanmamış iş" value={data.unassigned.length} tone={data.unassigned.length ? 'text-bill' : undefined} sub="Bekleyen iş talebi" />
        <Figure label={`Boş araç · ${dayLabel(days[0], data.today).title}`} value={`${freeToday} / ${data.vehicles.length}`} sub="İlk gün sevkiyatsız" />
        <Figure label="Çakışma" value={data.conflictCount + data.driverConflictCount} tone={data.conflictCount + data.driverConflictCount ? 'text-bad' : undefined}
          sub={`Araç ${data.conflictCount} · Şoför ${data.driverConflictCount}`} />
        <Figure label="Belge uyarısı" value={data.warningCount} tone={data.warningCount ? 'text-warn' : undefined} sub="Sevkiyat bitmeden doluyor" />
      </Figures>

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="lg:hidden">{unassignedList}</div>
          <div className="sticky top-16 z-[15] hidden lg:block 2xl:hidden">
            <UnassignedStrip items={data.unassigned} canWrite={canWrite} setDragging={setDragging} onAssign={onAssignRequest} />
          </div>
          <div className="hidden lg:block">
            <Board data={data} days={days} canWrite={canWrite} dragging={dragging} setDragging={setDragging} onDrop={drop}
              onMove={(t) => setAssigning({ trip: t })} onNew={onNew} />
          </div>
          <div className="lg:hidden">
            <DayList data={data} days={days} canWrite={canWrite} onMove={(t) => setAssigning({ trip: t })} onNew={onNew} />
          </div>
          <div className="2xl:hidden">{driversPanel}</div>
        </div>
        <aside className="sticky top-20 hidden space-y-4 2xl:block" aria-label="Atanmamış ve şoförler">
          {unassignedList}
          {driversPanel}
        </aside>
      </div>

      {assigning && <AssignDialog target={assigning} data={data} loading={assign.isPending} onClose={() => setAssigning(null)}
        onSubmit={(b) => assign.mutate(b)} />}
      {newTrip && <TripForm trip={null} defaults={newTrip} onClose={() => { setNewTrip(null); qc.invalidateQueries({ queryKey: ['planning'] }) }} />}
    </div>
  )
}

/* ---------------------------------------------------------------- Masaüstü: araç × gün panosu */

function Board({ data, days, canWrite, dragging, setDragging, onDrop, onMove, onNew }: {
  data: Planning; days: string[]; canWrite: boolean; dragging: Drag | null; setDragging: (d: Drag | null) => void
  onDrop: (v: PlanningVehicle, day: string, payload?: string) => void; onMove: (t: PlanningTrip) => void; onNew: (v: PlanningVehicle, day: string) => void
}) {
  const [over, setOver] = useState<string | null>(null)
  const cols = `minmax(11rem, 13rem) repeat(${days.length}, minmax(${days.length > 1 ? '7.5rem' : '16rem'}, 1fr))`
  if (data.vehicles.length === 0) return <div className="card"><Empty icon={<Truck />}>Henüz araç yok.</Empty></div>
  return (
    <section className="card overflow-hidden" aria-label="Araç × gün panosu">
      <div className="overflow-x-auto">
        <div className="min-w-full" style={{ display: 'grid', gridTemplateColumns: cols }} role="grid" aria-rowcount={data.vehicles.length + 1}>
          <div role="row" className="contents">
            <div role="columnheader" className="sticky left-0 z-[3] border-b border-line bg-surface-2 px-3 py-2 text-[0.8125rem] font-semibold text-muted">Araç</div>
            {days.map((d) => {
              const l = dayLabel(d, data.today)
              return (
                <div key={d} role="columnheader" className={clsx('border-b border-l border-line px-3 py-2 text-[0.8125rem]', d === data.today ? 'bg-accent-soft' : 'bg-surface-2')}>
                  <span className={clsx('font-semibold', d === data.today ? 'text-accent' : 'text-fg')}>{l.title}</span>
                  <span className="ml-1.5 tabular-nums text-muted">{l.sub}</span>
                </div>
              )
            })}
          </div>
          {data.vehicles.map((v) => (
            <VehicleRow key={v.id} v={v} data={data} days={days} canWrite={canWrite} dragging={dragging} setDragging={setDragging}
              over={over} setOver={setOver} onDrop={onDrop} onMove={onMove} onNew={onNew} />
          ))}
        </div>
      </div>
      {canWrite && <p className="border-t border-line bg-surface-2 px-4 py-2 text-[0.8125rem] text-muted">
        Kartı tutup başka araca ya da güne bırakın. Boş güne <span className="font-semibold">+</span> ile yeni sevkiyat açın. Yalnız "Planlandı" durumundaki sevkiyatlar taşınır.
      </p>}
    </section>
  )
}

function VehicleRow({ v, data, days, canWrite, dragging, setDragging, over, setOver, onDrop, onMove, onNew }: {
  v: PlanningVehicle; data: Planning; days: string[]; canWrite: boolean; dragging: Drag | null; setDragging: (d: Drag | null) => void
  over: string | null; setOver: (k: string | null) => void; onDrop: (v: PlanningVehicle, day: string, payload?: string) => void
  onMove: (t: PlanningTrip) => void; onNew: (v: PlanningVehicle, day: string) => void
}) {
  // Kartları şeritlere yerleştir: üst üste binen sevkiyatlar (çakışma) ayrı şeride düşer.
  const placed = useMemo(() => {
    const first = days[0], last = days[days.length - 1]
    const lanes: number[] = []
    return data.trips.filter((t) => t.vehicleId === v.id).map((t) => {
      const start = days.indexOf(t.loadingDate < first ? first : t.loadingDate)
      const end = days.indexOf(t.endDate > last ? last : t.endDate)
      let lane = lanes.findIndex((e) => e < start)
      if (lane < 0) { lane = lanes.length; lanes.push(end) } else lanes[lane] = end
      return { t, start, end, lane, cutLeft: t.loadingDate < first, cutRight: t.endDate > last }
    })
  }, [data.trips, days, v.id])
  const laneCount = Math.max(1, ...placed.map((p) => p.lane + 1))
  const docs = v.documents ?? []
  const rowStyle = { display: 'grid', gridTemplateColumns: 'subgrid', gridColumn: '1 / -1', gridTemplateRows: `repeat(${laneCount}, minmax(4.25rem, auto))` }
  return (
    <div role="row" style={rowStyle} className="group/row" aria-label={v.plate}>
      <div role="rowheader" style={{ gridRow: `1 / span ${laneCount}`, gridColumn: 1 }}
        className="sticky left-0 z-[2] flex flex-col justify-center gap-1 border-b border-line bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          <PlateBadge plate={v.plate} />
          {docs.length > 0 && <span title={docs.map(docText).join('\n')} aria-label={`Belge uyarısı: ${docs.map(docText).join(', ')}`}
            className="inline-flex text-warn"><FileWarning className="size-4" /></span>}
        </div>
        <span className="truncate text-[0.75rem] text-muted">
          {v.type}{v.ownership === 'Rented' ? ` · ${v.supplierTitle ?? 'Kiralık'}` : ''}{v.status === 'Maintenance' ? ' · Bakımda' : ''}
        </span>
        <span className="flex items-center gap-1 truncate text-[0.75rem] text-muted"><UserRound className="size-3 shrink-0" />{v.defaultDriverName ?? 'Şoför yok'}</span>
      </div>
      {days.map((d, i) => {
        const key = `${v.id}:${d}`
        const busy = placed.some((p) => p.start <= i && i <= p.end)
        return (
          <div key={d} role="gridcell" aria-label={`${v.plate} ${date(d)}`} data-cell={key}
            style={{ gridRow: `1 / span ${laneCount}`, gridColumn: i + 2 }}
            onDragOver={canWrite ? (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== key) setOver(key) } : undefined}
            onDragLeave={() => { if (over === key) setOver(null) }}
            onDrop={(e) => { e.preventDefault(); setOver(null); onDrop(v, d, e.dataTransfer.getData('text/plain')) }}
            className={clsx('group/cell relative border-b border-l border-line transition-colors',
              d === data.today && 'bg-accent-soft/40', v.status === 'Maintenance' && 'bg-surface-2',
              over === key && 'bg-accent-soft ring-2 ring-inset ring-accent')}>
            {!busy && canWrite && !dragging && (
              <button type="button" onClick={() => onNew(v, d)} aria-label={`${v.plate} için ${date(d)} yeni sevkiyat`}
                className="absolute inset-1 flex items-center justify-center rounded-lg text-muted opacity-0 transition hover:bg-surface-2 hover:text-accent focus:opacity-100 group-hover/cell:opacity-100">
                <Plus className="size-4" />
              </button>
            )}
          </div>
        )
      })}
      {placed.map(({ t, start, end, lane, cutLeft, cutRight }) => (
        <div key={t.id} style={{ gridColumn: `${start + 2} / ${end + 3}`, gridRow: lane + 1 }} className="z-[1] min-w-0 p-1">
          <TripCard t={t} canWrite={canWrite} cutLeft={cutLeft} cutRight={cutRight} setDragging={setDragging} onMove={onMove} />
        </div>
      ))}
    </div>
  )
}

const statusBar: Record<PlanningTrip['status'], string> = {
  Planned: 'border-l-info', Loaded: 'border-l-warn', OnRoad: 'border-l-accent', Delivered: 'border-l-good', Cancelled: 'border-l-slate-300',
}
const statusText: Record<PlanningTrip['status'], string> = {
  Planned: 'text-info', Loaded: 'text-warn', OnRoad: 'text-accent', Delivered: 'text-good', Cancelled: 'text-muted',
}

function TripCard({ t, canWrite, cutLeft, cutRight, setDragging, onMove, wide }: {
  t: PlanningTrip; canWrite: boolean; cutLeft?: boolean; cutRight?: boolean; setDragging?: (d: Drag | null) => void; onMove: (t: PlanningTrip) => void
  wide?: boolean
}) {
  const draggable = canWrite && t.canAssign && !!setDragging
  const warn = t.warnings ?? []
  const bad = t.conflict || t.driverConflict
  return (
    <article draggable={draggable} aria-label={`Sevkiyat ${t.customer}`}
      title={`${t.customer}\n${route(t)}\nŞoför: ${t.driverName}\nDurum: ${tripStatusLabel[t.status]}${warn.length ? '\n' + warn.join('\n') : ''}`}
      onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `trip:${t.id}`); setDragging!({ kind: 'trip', id: t.id }) } : undefined}
      onDragEnd={draggable ? () => setDragging!(null) : undefined}
      className={clsx('group/card relative flex h-full min-w-0 flex-col gap-0.5 rounded-xl border border-l-4 bg-white py-1.5 pl-2 pr-2 text-[0.8125rem] shadow-xs transition',
        statusBar[t.status], bad ? 'border-y-bad/50 border-r-bad/50 bg-bad-soft/40' : warn.length ? 'border-y-warn/40 border-r-warn/40' : 'border-y-line border-r-line',
        draggable && 'cursor-grab hover:shadow-sm active:cursor-grabbing',
        cutLeft && 'rounded-l-sm', cutRight && 'rounded-r-sm')}>
      <div className="flex min-w-0 items-center gap-1">
        <Link to={`/seferler?id=${t.id}`} className="min-w-0 flex-1 truncate font-semibold text-fg hover:text-accent hover:underline" draggable={false}>{t.customer}</Link>
        {draggable && <GripVertical aria-hidden className="-mr-1 size-3.5 shrink-0 text-slate-400" />}
      </div>
      <span className="truncate text-muted">{route(t)}</span>
      <span className="flex min-w-0 items-center gap-1 text-[0.75rem] text-muted">
        <UserRound className="size-3 shrink-0" /><span className="min-w-0 flex-1 truncate">{t.driverName}</span>
        <span className={clsx('shrink-0 font-semibold', statusText[t.status])}>{t.loadingTime && t.status === 'Planned' ? t.loadingTime.slice(0, 5) : tripStatusLabel[t.status]}</span>
      </span>
      {(bad || warn.length > 0) && (
        <div className="mt-0.5 flex flex-wrap gap-1">
          {t.conflict && <Flag tone="bad" title="Aynı araçta aynı günlerde başka sevkiyat var">Çakışma</Flag>}
          {t.driverConflict && <Flag tone="bad" title="Şoförün aynı günlerde başka araçta sevkiyatı var">Şoför dolu</Flag>}
          {warn.length > 0 && <Flag tone="warn" title={warn.join('\n')}>Belge{warn.length > 1 ? ` ${warn.length}` : ''}</Flag>}
        </div>
      )}
      {wide && warn.length > 0 && <ul className="mt-0.5 space-y-0.5 text-[0.75rem] text-warn">{warn.map((w) => <li key={w}>{w}</li>)}</ul>}
      {canWrite && t.canAssign && (
        <button type="button" onClick={() => onMove(t)} aria-label={`Sevkiyatı taşı: ${t.customer}`}
          className={clsx('inline-flex items-center gap-1 self-start rounded-md text-[0.75rem] font-semibold text-accent hover:underline',
            wide ? 'mt-1 min-h-9 border border-line px-2.5' : 'absolute right-1 top-1 bg-white px-1 py-0.5 opacity-0 shadow-xs focus:opacity-100 group-hover/card:opacity-100')}>
          <MoveRight className="size-3.5" />Taşı
        </button>
      )}
    </article>
  )
}

function Flag({ tone, title, children }: { tone: 'bad' | 'warn'; title: string; children: ReactNode }) {
  return (
    <span title={title} className={clsx('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold',
      tone === 'bad' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn')}>
      <AlertTriangle aria-hidden className="size-3" />{children}
    </span>
  )
}

/* ---------------------------------------------------------------- Telefon: gün gün liste */

function DayList({ data, days, canWrite, onMove, onNew }: {
  data: Planning; days: string[]; canWrite: boolean; onMove: (t: PlanningTrip) => void; onNew: (v: PlanningVehicle, day: string) => void
}) {
  return (
    <div className="space-y-4">
      {days.map((d) => {
        const l = dayLabel(d, data.today)
        const trips = data.trips.filter((t) => spans(t, d))
        const free = data.vehicles.filter((v) => v.status !== 'Maintenance' && !trips.some((t) => t.vehicleId === v.id))
        return (
          <section key={d} aria-label={`${l.title} ${l.sub}`} className="card overflow-hidden">
            <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <h2 className="text-[0.9375rem] font-semibold text-fg">{l.title} <span className="font-normal tabular-nums text-muted">{date(d)}</span></h2>
              <span className="text-[0.8125rem] text-muted">{trips.length} sevkiyat</span>
            </header>
            {trips.length === 0
              ? <p className="px-4 py-3 text-[0.875rem] text-muted">Bu gün sevkiyat yok.</p>
              : <ul className="divide-y divide-line">
                {trips.map((t) => {
                  const v = data.vehicles.find((x) => x.id === t.vehicleId)
                  return (
                    <li key={t.id} className="space-y-1.5 px-3 py-2.5">
                      <div className="flex items-center gap-2"><PlateBadge plate={v?.plate} />
                        {t.loadingDate !== d && <span className="text-[0.75rem] text-muted">devam ediyor</span>}</div>
                      <TripCard t={t} canWrite={canWrite} onMove={onMove} wide />
                    </li>
                  )
                })}
              </ul>}
            {free.length > 0 && (
              <div className="border-t border-line bg-surface-2 px-4 py-2.5">
                <p className="text-[0.75rem] font-medium text-muted">Boş araçlar ({free.length})</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {free.map((v) => canWrite
                    ? <button key={v.id} type="button" onClick={() => onNew(v, d)} aria-label={`${v.plate} için ${date(d)} yeni sevkiyat`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-white pl-1.5 pr-2.5"><PlateBadge plate={v.plate} /><Plus className="size-3.5 text-accent" /></button>
                    : <PlateBadge key={v.id} plate={v.plate} />)}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- Yan panel */

function UnassignedPanel({ items, canWrite, setDragging, onAssign }: {
  items: PlanningRequest[]; canWrite: boolean; setDragging: (d: Drag | null) => void; onAssign: (r: PlanningRequest) => void
}) {
  return (
    <section className="card overflow-hidden" aria-label="Atanmamış işler">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg"><ClipboardList className="size-4 text-muted" />Atanmamış</h2>
        <span className={clsx('rounded-full px-2.5 py-0.5 font-mono text-[0.8125rem] font-bold', items.length ? 'bg-bill-soft text-bill' : 'bg-surface-2 text-muted')}>{items.length}</span>
      </header>
      {items.length === 0
        ? <p className="px-4 py-4 text-[0.875rem] text-muted">Bu aralıkta araç bekleyen iş talebi yok.</p>
        : <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto 2xl:max-h-[calc(50vh-6rem)]">
          {items.map((r) => (
            <li key={r.id} draggable={canWrite} aria-label={`İş talebi ${r.customer}`}
              onDragStart={canWrite ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `request:${r.id}`); setDragging({ kind: 'request', id: r.id }) } : undefined}
              onDragEnd={() => setDragging(null)}
              className={clsx('flex items-start gap-2 px-3 py-2.5', canWrite && 'lg:cursor-grab')}>
              {canWrite && <GripVertical aria-hidden className="mt-0.5 hidden size-4 shrink-0 text-slate-400 lg:block" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold text-fg">{r.customer}</span>
                  <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">{date(r.date)}</span>
                </div>
                <p className="truncate text-[0.8125rem] text-muted">{place(null, r.loadingAddress)} → {place(null, r.deliveryAddress)}</p>
                <p className="truncate text-[0.75rem] text-muted">{[r.vehicleType, r.cargoType, r.deliveryWindow, r.salePrice ? tl(r.salePrice) : null].filter(Boolean).join(' · ')}</p>
              </div>
              {canWrite && <Button size="sm" variant="secondary" write onClick={() => onAssign(r)} aria-label={`Araca ata: ${r.customer}`}>Ata</Button>}
            </li>
          ))}
        </ul>}
    </section>
  )
}

/** lg–2xl arası: panonun üstünde yapışkan yatay şerit; kartlar aşağıdaki araç × gün hücresine sürüklenir. */
function UnassignedStrip({ items, canWrite, setDragging, onAssign }: {
  items: PlanningRequest[]; canWrite: boolean; setDragging: (d: Drag | null) => void; onAssign: (r: PlanningRequest) => void
}) {
  return (
    <section className="card flex items-stretch overflow-hidden shadow-sm" aria-label="Atanmamış işler">
      <header className="flex w-36 shrink-0 flex-col justify-center gap-1 border-r border-line bg-surface-2 px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-fg"><ClipboardList className="size-4 text-muted" />Atanmamış</h2>
        <span className={clsx('self-start rounded-full px-2 py-0.5 font-mono text-[0.75rem] font-bold', items.length ? 'bg-bill-soft text-bill' : 'bg-white text-muted')}>{items.length} iş</span>
      </header>
      {items.length === 0
        ? <p className="flex items-center px-4 text-[0.875rem] text-muted">Bu aralıkta araç bekleyen iş talebi yok.</p>
        : <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto p-2">
          {items.map((r) => (
            <li key={r.id} draggable={canWrite} aria-label={`İş talebi ${r.customer}`}
              onDragStart={canWrite ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `request:${r.id}`); setDragging({ kind: 'request', id: r.id }) } : undefined}
              onDragEnd={() => setDragging(null)}
              className={clsx('flex w-64 shrink-0 items-start gap-1.5 rounded-xl border border-line border-l-4 border-l-hl bg-white px-2.5 py-1.5', canWrite && 'cursor-grab hover:shadow-sm active:cursor-grabbing')}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-fg">{r.customer}</span>
                  <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">{date(r.date).slice(0, 5)}</span>
                </div>
                <p className="truncate text-[0.75rem] text-muted">{place(null, r.loadingAddress)} → {place(null, r.deliveryAddress)}</p>
                <p className="truncate text-[0.75rem] text-muted">{[r.vehicleType, r.cargoType, r.salePrice ? tl(r.salePrice) : null].filter(Boolean).join(' · ')}</p>
              </div>
              {canWrite && <button type="button" onClick={() => onAssign(r)} aria-label={`Araca ata: ${r.customer}`}
                className="shrink-0 self-center rounded-lg border border-line px-2 py-1 text-[0.75rem] font-semibold text-accent hover:bg-accent-soft">Ata</button>}
              {canWrite && <GripVertical aria-hidden className="size-3.5 shrink-0 self-center text-slate-400" />}
            </li>
          ))}
        </ul>}
    </section>
  )
}

function DriversPanel({ drivers, trips, days, today }: { drivers: PlanningDriver[]; trips: PlanningTrip[]; days: string[]; today: string }) {
  const rows = drivers.map((d) => {
    const mine = trips.filter((t) => t.driverId === d.id && t.status !== 'Cancelled')
    const busyDays = days.filter((day) => mine.some((t) => spans(t, day)))
    return { d, busyDays, clash: mine.some((t) => t.driverConflict) }
  }).sort((a, b) => Number(b.clash) - Number(a.clash) || a.busyDays.length - b.busyDays.length)
  const freeCount = rows.filter((r) => r.busyDays.length === 0).length
  return (
    <section className="card overflow-hidden" aria-label="Şoför müsaitliği">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg"><UserRound className="size-4 text-muted" />Şoförler</h2>
        <span className="text-[0.8125rem] text-muted">{freeCount} boş / {rows.length}</span>
      </header>
      {rows.length === 0
        ? <p className="px-4 py-4 text-[0.875rem] text-muted">Aktif şoför yok.</p>
        : <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto 2xl:max-h-[calc(50vh-6rem)]">
          {rows.map(({ d, busyDays, clash }) => (
            <li key={d.id} className="px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-fg">{d.fullName}</span>
                {clash ? <Flag tone="bad" title="Aynı günlerde iki araçta">Çakışma</Flag>
                  : busyDays.length === 0 ? <Badge tone="green">Boş</Badge>
                  : <Badge tone="blue">{busyDays.length === days.length ? 'Dolu' : `${busyDays.length} gün dolu`}</Badge>}
              </div>
              {days.length > 1 && (
                <div className="mt-1 flex gap-0.5" aria-hidden>
                  {days.map((day) => <span key={day} title={date(day)}
                    className={clsx('h-1.5 flex-1 rounded-full', busyDays.includes(day) ? 'bg-info' : day === today ? 'bg-accent-soft' : 'bg-surface-2')} />)}
                </div>
              )}
              {d.supplierTitle && <p className="truncate text-[0.75rem] text-muted">{d.supplierTitle}</p>}
              {d.documents.map((doc) => <p key={doc.what} className="flex items-center gap-1 text-[0.75rem] text-warn"><FileWarning className="size-3" />{docText(doc)}</p>)}
            </li>
          ))}
        </ul>}
    </section>
  )
}

/* ---------------------------------------------------------------- Ata / Taşı penceresi */

function AssignDialog({ target, data, loading, onClose, onSubmit }: {
  target: AssignTarget; data: Planning; loading: boolean; onClose: () => void
  onSubmit: (b: { vehicleId: number; tripId?: number; jobRequestId?: number; date?: string; driverId?: number | null }) => void
}) {
  const t = target.trip, r = target.request
  const [vehicleId, setVehicleId] = useState<number | ''>(target.vehicleId ?? t?.vehicleId ?? '')
  const [driverId, setDriverId] = useState<number | ''>(t?.driverId ?? '')
  const [day, setDay] = useState(target.date ?? t?.loadingDate ?? r?.date ?? todayIso())
  const vehicle = data.vehicles.find((v) => v.id === vehicleId)
  const drivers = data.drivers ?? []
  const others = data.trips.filter((x) => x.id !== t?.id && x.status !== 'Cancelled')
  const vehicleBusy = (id: number) => others.filter((x) => x.vehicleId === id && spans(x, day))
  const driverBusy = (id: number) => others.filter((x) => x.driverId === id && x.vehicleId !== vehicleId && spans(x, day))
  const effectiveDriver = driverId || (vehicle && vehicle.id !== t?.vehicleId ? vehicle.defaultDriverId : null) || t?.driverId || vehicle?.defaultDriverId || null
  const driver = drivers.find((d) => d.id === effectiveDriver)
  const inRange = day >= data.from && day <= data.to

  const notes: { tone: 'bad' | 'warn'; text: string }[] = []
  if (vehicle && inRange) for (const x of vehicleBusy(vehicle.id)) notes.push({ tone: 'bad', text: `${vehicle.plate} bu gün dolu: ${x.customer} (${route(x)})` })
  if (effectiveDriver && inRange) for (const x of driverBusy(effectiveDriver)) notes.push({ tone: 'bad', text: `${x.driverName} bu gün başka araçta: ${x.customer}` })
  for (const doc of vehicle?.documents ?? []) if (doc.expiry <= day) notes.push({ tone: 'warn', text: `${vehicle!.plate}: ${docText(doc)}` })
  for (const doc of driver?.documents ?? []) if (doc.expiry <= day) notes.push({ tone: 'warn', text: `${driver!.fullName}: ${docText(doc)}` })
  if (vehicle?.status === 'Maintenance') notes.push({ tone: 'warn', text: `${vehicle.plate} bakımda görünüyor.` })
  const needsDriver = !!r && !effectiveDriver

  const vehicleOptions = data.vehicles.map((v) => {
    const busy = inRange ? vehicleBusy(v.id).length : 0
    return { value: v.id, label: `${v.plate} · ${v.type}${busy ? ` · dolu (${busy})` : inRange ? ' · boş' : ''}${v.documents?.length ? ' · belge uyarısı' : ''}` }
  })
  const driverOptions = drivers.map((d) => {
    const busy = inRange ? others.filter((x) => x.driverId === d.id && spans(x, day)).length : 0
    return { value: d.id, label: `${d.fullName}${busy ? ' · dolu' : inRange ? ' · boş' : ''}${d.documents.length ? ' · belge uyarısı' : ''}` }
  })

  return (
    <Modal open onClose={onClose} title={t ? 'Sevkiyatı taşı' : 'Araca ata'} size="sm" guard={false}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button loading={loading} disabled={!vehicleId || needsDriver || !day}
          onClick={() => onSubmit({ vehicleId: vehicleId as number, tripId: t?.id, jobRequestId: r?.id, date: day, driverId: driverId || null })}>
          {t ? 'Taşı' : 'Ata ve sevkiyat aç'}
        </Button>
      </>}>
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[0.875rem]">
          <p className="font-semibold text-fg">{t?.customer ?? r?.customer}</p>
          <p className="text-muted">{t ? route(t) : `${r!.loadingAddress} → ${r!.deliveryAddress}`}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-[0.8125rem] font-medium text-fg">Yükleme günü</span>
          <DateInput value={day} onChange={(v) => setDay(v || day)} aria-label="Yükleme günü" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.8125rem] font-medium text-fg">Araç</span>
          <Select aria-label="Araç" value={vehicleId} onChange={(v) => setVehicleId(v)} options={vehicleOptions} placeholder="Araç seçin" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.8125rem] font-medium text-fg">Şoför</span>
          <Select aria-label="Şoför" value={driverId} onChange={(v) => setDriverId(v)} options={driverOptions}
            placeholder={vehicle?.defaultDriverName ? `Aracın şoförü (${vehicle.defaultDriverName})` : t ? `Mevcut şoför (${t.driverName})` : 'Şoför seçin'} />
          {needsDriver && <span className="mt-1 block text-[0.8125rem] text-bad">Bu aracın kayıtlı şoförü yok; şoför seçin.</span>}
        </label>
        {notes.length > 0 && (
          <ul className="space-y-1.5" aria-label="Uyarılar">
            {notes.map((n, i) => (
              <li key={i} className={clsx('flex items-start gap-2 rounded-lg px-3 py-2 text-[0.8125rem]', n.tone === 'bad' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn')}>
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />{n.text}
              </li>
            ))}
          </ul>
        )}
        {notes.length > 0 && <p className="text-[0.75rem] text-muted">Uyarılar atamayı engellemez; yine de kaydedebilirsiniz.</p>}
        {!t && <p className="flex items-center gap-1.5 text-[0.75rem] text-muted"><CalendarRange className="size-3.5" />İş talebindeki fiyat, adres ve yük bilgileri sevkiyata aktarılır.</p>}
      </div>
    </Modal>
  )
}
