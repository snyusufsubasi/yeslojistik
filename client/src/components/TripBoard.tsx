import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { post } from '../api/client'
import type { Trip, TripStatus } from '../api/types'
import { date, tl, todayIso } from '../lib/format'
import { usePaged, useSave } from '../lib/hooks'
import { tripStatusAction, tripStatusLabel } from '../lib/labels'
import { Button, PlateBadge, Spinner } from './ui'

const columns: { status: TripStatus; dot: string; hint: string }[] = [
  { status: 'Planned', dot: 'bg-slate-400', hint: 'Araç ve şoför atanmış, yükleme bekliyor' },
  { status: 'Loaded', dot: 'bg-brand-500', hint: 'Yük araçta' },
  { status: 'OnRoad', dot: 'bg-orange-500', hint: 'Yolda, teslime gidiyor' },
  { status: 'Delivered', dot: 'bg-emerald-500', hint: 'Son 7 günde teslim edilenler' },
]

function sevenDaysAgo() {
  const d = new Date(`${todayIso()}T12:00:00`)
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

const place = (city?: string | null, address?: string) => city || address || '—'

/**
 * Sefer panosu: seferler durumlarına göre sütunlarda kart olarak durur.
 * Her kartta bir sonraki adımın düğmesi ("Yüklendi yap", "Yola çıktı yap"…) vardır; karta tıklayınca sefer açılır.
 */
export function TripBoard({ search, customerId, onOpen, canEdit }:
  { search?: string; customerId?: number | ''; onOpen?: (t: Trip) => void; canEdit: boolean }) {
  const statusMut = useSave(({ id, s }: { id: number; s: TripStatus }) => post<Trip>(`/trips/${id}/status`, { status: s }),
    { invalidate: ['trips', 'vehicles', 'suppliers'], success: 'Sevkiyat durumu güncellendi.' })
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((c) => (
        <Column key={c.status} {...c} search={search} customerId={customerId} onOpen={onOpen} canEdit={canEdit}
          busyId={statusMut.isPending ? statusMut.variables?.id : undefined}
          onAdvance={(t, s) => statusMut.mutate({ id: t.id, s })} />
      ))}
    </div>
  )
}

function Column({ status, dot, hint, search, customerId, onOpen, canEdit, busyId, onAdvance }:
  { status: TripStatus; dot: string; hint: string; search?: string; customerId?: number | ''; onOpen?: (t: Trip) => void; canEdit: boolean
    busyId?: number; onAdvance: (t: Trip, s: TripStatus) => void }) {
  const delivered = status === 'Delivered'
  const { data, isLoading } = usePaged<Trip>('trips', {
    page: 1, pageSize: 50, status, search, customerId, from: delivered ? sevenDaysAgo() : undefined,
    sort: 'loadingDate', desc: delivered,
  })
  const items = data?.items ?? []
  return (
    <section aria-label={tripStatusLabel[status]} className="flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-slate-50/70">
      <header className="flex items-center gap-2 px-4 pb-2 pt-4" title={hint}>
        <span className={clsx('size-2.5 rounded-full', dot)} aria-hidden />
        <h2 className="text-base text-slate-900">{tripStatusLabel[status]}</h2>
        <span className="ml-auto rounded-full bg-white px-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200">{data?.total ?? 0}</span>
      </header>
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 xl:max-h-[calc(100vh-18rem)]">
        {isLoading && <Spinner className="py-6" />}
        {!isLoading && items.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-500">Bu sütunda sevkiyat yok.</p>}
        {items.map((t) => {
          const next = t.nextStatuses.find((s) => s !== 'Cancelled' && s !== 'Planned')
          return (
            <article key={t.id} className={clsx('rounded-xl border border-slate-200 bg-white p-3.5 transition', onOpen && 'cursor-pointer hover:border-slate-300 hover:shadow-sm')}
              onClick={() => onOpen?.(t)}>
              <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
                <span>{date(t.loadingDate)}</span>
                <span className="font-medium text-slate-700">{tl(t.salePrice)}</span>
              </div>
              <div className="mt-1 font-medium text-slate-900">{t.customerTitle}</div>
              <div className="mt-0.5 break-words text-[0.9375rem] text-slate-700">
                {place(t.loadingCity, t.loadingAddress)} <ArrowRight aria-label="→" className="inline size-4 text-slate-400" /> {place(t.deliveryCity, t.deliveryAddress)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500"><PlateBadge plate={t.vehiclePlate} /> {t.carrierSupplierTitle ?? t.driverName}</div>
              {canEdit && next && !delivered && (
                <Button size="sm" variant="secondary" className="mt-2.5 w-full" loading={busyId === t.id}
                  onClick={(e) => { e.stopPropagation(); onAdvance(t, next) }}>
                  {tripStatusAction[next]} <ArrowRight className="size-4" />
                </Button>
              )}
            </article>
          )
        })}
        {(data?.total ?? 0) > items.length && <p className="px-2 text-center text-sm text-slate-500">+{(data!.total - items.length)} sevkiyat daha (listede görün)</p>}
      </div>
    </section>
  )
}
