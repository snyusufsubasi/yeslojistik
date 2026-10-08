import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { CheckCircle2, ChevronRight, Clock, FileWarning, Flag, IdCard, Plus, Receipt, TriangleAlert, Truck, Wallet } from 'lucide-react'
import { get } from '../api/client'
import type { Today, TodayItem, TodaySection } from '../api/types'
import { Button, Loading } from '../components/ui'
import { SectionTabs } from '../components/shell/SectionTabs'
import { useAuth } from '../lib/auth'
import { date, longDate, tl } from '../lib/format'
import { useIsNewUi } from '../lib/uiMode'
import { usePageTitle } from '../lib/usePageTitle'
import { TodayTabBar } from '../components/TodayTabBar'

/** Kart başına önce gösterilen satır sayısı; fazlası "N tane daha" ile aynı kartta açılır. */
const FIRST = 5

const icons: Record<TodaySection['key'], typeof Clock> = {
  late: Clock,
  loading: Truck,
  delivery: Flag,
  problem: TriangleAlert,
  document: FileWarning,
  invoice: Receipt,
  collections: Wallet,
  documents: IdCard,
}

/** Boş kartta görünen kısa cümle. */
const emptyText: Record<TodaySection['key'], string> = {
  late: 'Geciken sevkiyat yok',
  loading: 'Bugün yükleme yok',
  delivery: 'Bugün teslimat yok',
  problem: 'Sorunlu sevkiyat yok',
  document: 'Eksik teslim evrakı yok',
  invoice: 'Faturalanmayı bekleyen yok',
  collections: 'Vadesi gelen tahsilat yok',
  documents: '30 gün içinde dolan belge yok',
}

/** Sayacın rengi: gecikme ve süresi dolan şeyler kırmızı, diğer işler sarı/mavi. */
const countTone: Record<TodaySection['key'], string> = {
  late: 'bg-bad-soft text-bad',
  problem: 'bg-bad-soft text-bad',
  collections: 'bg-bad-soft text-bad',
  documents: 'bg-warn-soft text-warn',
  document: 'bg-warn-soft text-warn',
  invoice: 'bg-bill-soft text-bill',
  loading: 'bg-info-soft text-info',
  delivery: 'bg-info-soft text-info',
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar'
}

/**
 * "Bugün": personelin güne başladığı istisna listesi (tek istek: GET /api/today). Her kartta sayı, ilk kayıtlar ve
 * süzülmüş listeye giden "Tümünü gör". İşi olmayan kartlar en altta tek satırda "temiz" olarak toplanır.
 */
export default function TodayPage() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const isNew = useIsNewUi()
  usePageTitle('Bugün')
  const { data, error, refetch } = useQuery({ queryKey: ['today'], queryFn: () => get<Today>('/today'), refetchInterval: 60_000 })
  const firstName = user?.fullName.split(' ')[0]

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-[-0.01em] text-fg">Bugün</h1>
        <p className="mt-1 text-[0.875rem] text-muted">{greeting()}{firstName ? `, ${firstName}` : ''} · {longDate()}</p>
      </div>
      {can('operations') && <Button write icon={<Plus className="size-4" />} onClick={() => navigate('/seferler?new=1')}>Sevkiyat Ekle</Button>}
    </div>
  )

  if (!data) return (
    <div className="space-y-5">
      {header}
      <SectionTabs />
      <TodayTabBar approvals={false} showApprovals={isNew && can('accounting')} pendingCount={0} />
      <Loading error={error} onRetry={refetch} />
    </div>
  )

  const busy = data.sections.filter((s) => s.count > 0)
  const clean = data.sections.filter((s) => s.count === 0)
  return (
    <div className="space-y-5">
      {header}
      <SectionTabs />
      <TodayTabBar approvals={false} showApprovals={isNew && can('accounting')} pendingCount={0} />
      {busy.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
          <CheckCircle2 className="size-8 text-good" />
          <p className="text-[1.0625rem] font-semibold text-fg">Bugün bekleyen iş yok</p>
          <p className="text-[0.9375rem] text-muted">Geciken, eksik evraklı ya da vadesi gelen kayıt bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {busy.map((s) => <SectionCard key={s.key} section={s} />)}
        </div>
      )}
      {clean.length > 0 && busy.length > 0 && (
        <section aria-label="Sorun olmayanlar" className="flex flex-wrap gap-2">
          {clean.map((s) => {
            const Icon = icons[s.key]
            return (
              <span key={s.key} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.8125rem] text-muted">
                <Icon aria-hidden className="size-3.5" />{emptyText[s.key]}
              </span>
            )
          })}
        </section>
      )}
    </div>
  )
}

function SectionCard({ section: s }: { section: TodaySection }) {
  const [open, setOpen] = useState(false)
  const Icon = icons[s.key]
  const items = open ? s.items : s.items.slice(0, FIRST)
  const hidden = s.items.length - items.length
  return (
    <section aria-label={s.title} className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="flex min-w-0 items-center gap-2 text-[0.9375rem] font-semibold text-fg">
          <Icon aria-hidden className="size-4 shrink-0 text-muted" />
          <span className="truncate">{s.title}</span>
        </h2>
        <span className={clsx('shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[0.875rem] font-bold', countTone[s.key])}
          aria-label={`${s.count} kayıt`}>{s.count}</span>
      </header>
      {s.total != null && s.total > 0 && (
        <p className="border-b border-line bg-surface-2 px-4 py-1.5 text-[0.8125rem] text-muted">
          Toplam <span className="font-mono font-semibold text-fg">{tl(s.total)}</span>{s.key === 'invoice' && ' + KDV'}
        </p>
      )}
      <ul className="divide-y divide-line">
        {items.map((i, n) => <li key={`${i.link}-${n}`}><ItemRow item={i} /></li>)}
      </ul>
      {(hidden > 0 || s.link) && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2">
          {hidden > 0
            ? <button type="button" onClick={() => setOpen(true)} className="min-h-9 text-[0.875rem] font-medium text-muted hover:text-fg">{hidden} tane daha göster</button>
            : <span />}
          {s.link && (
            <Link to={s.link} className="inline-flex min-h-9 items-center gap-1 text-[0.875rem] font-semibold text-brand-600 hover:underline"
              aria-label={`${s.title}: tümünü gör`}>
              {s.count > s.items.length ? `Tümünü gör (${s.count})` : 'Listede aç'} <ChevronRight className="size-4" />
            </Link>
          )}
        </footer>
      )}
    </section>
  )
}

function ItemRow({ item: i }: { item: TodayItem }) {
  const tone = i.tone === 'danger' ? 'bg-bad-soft text-bad' : i.tone === 'warning' ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-muted'
  return (
    <Link to={i.link} className="flex min-h-12 items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium text-fg">{i.title}</span>
        {i.subtitle && <span className="block truncate text-[0.8125rem] text-muted">{i.subtitle}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-right">
        {i.badge && <span className={clsx('max-w-40 truncate rounded-full px-2 py-0.5 text-[0.75rem] font-medium', tone)}>{i.badge}</span>}
        {i.amount != null
          ? <span className="font-mono text-[0.8125rem] font-semibold text-fg">{tl(i.amount)}</span>
          : i.date && <span className="text-[0.75rem] text-muted">{date(i.date)}</span>}
      </span>
    </Link>
  )
}
