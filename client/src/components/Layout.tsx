import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  Handshake, HandCoins, Plus,
  BarChart3, Bell, Building2, CalendarDays, CreditCard, FileText, Home, LogOut, Menu, Receipt, Settings, Truck,
  UserCircle2, Users, Wallet, X, IdCard, Map as MapIcon, HelpCircle, Landmark, ScrollText, Type, Scale, ClipboardList, UserRound, Repeat, FileInput } from 'lucide-react'
import { get } from '../api/client'
import { GlobalSearch } from './GlobalSearch'
import type { Alert, Dashboard, Health } from '../api/types'
import { useAuth, type Permission } from '../lib/auth'
import { ago, longDate } from '../lib/format'
import { useMirror } from '../lib/hooks'
import { roleLabel } from '../lib/labels'
import { quickActions } from '../lib/quickActions'
import { MirrorContext } from './ui'
import { Logo } from './Logo'
import { useTextSize } from '../lib/textSize'

type Badge = { count: number; title: string }
type NavItem = { to: string; label: string; icon: typeof Home; perm?: Permission; badge?: (d: Dashboard | undefined, alerts: Alert[]) => Badge | null }

const alertsAt = (alerts: Alert[], path: string) => alerts.filter((a) => a.link.startsWith(path)).length
const badge = (count: number, title: string): Badge | null => (count > 0 ? { count, title } : null)

/**
 * Menü, eski paneldeki (pratikortam) gruplamayı izler ki alışkanlık bozulmasın: Sevkiyat, Cari, Listeler, Öz Mal, Banka & Çek.
 * Ama daha sade: gruplar hep açık (katlanmaz), bekleyen işler sarı sayaçla görünür.
 */
const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [
    { to: '/', label: 'Ana Sayfa', icon: Home },
    { to: '/harita', label: 'Araç Takip Haritası', icon: MapIcon },
  ] },
  { title: 'Sevkiyat', items: [
    { to: '/is-talepleri', label: 'İş Talepleri', icon: ClipboardList },
    { to: '/seferler', label: 'Sevkiyatlar', icon: Truck,
      badge: (d) => badge(d?.activeTripCount ?? 0, 'bekleyen ve yoldaki sefer') },
  ] },
  { title: 'Cari', items: [
    { to: '/cari/musteriler', label: 'Müşteriler Cari', icon: Scale, perm: 'accounting',
      badge: (_, a) => badge(alertsAt(a, '/musteriler'), 'vadesi geçen alacak') },
    { to: '/cari/tedarikciler', label: 'Tedarikçiler Cari', icon: Scale, perm: 'accounting',
      badge: (_, a) => badge(alertsAt(a, '/tedarikciler'), 'taşeron uyarısı') },
    { to: '/faturalar', label: 'Faturalar', icon: FileText,
      badge: (d) => badge(d?.uninvoicedTripCount ?? 0, 'faturası kesilmemiş teslim sefer') },
    { to: '/tahsilatlar', label: 'Tahsilatlar', icon: Wallet },
    { to: '/alinan-faturalar', label: 'Alınan Faturalar', icon: FileInput },
    { to: '/odemeler', label: 'Tedarikçi Ödemeleri', icon: HandCoins },
  ] },
  { title: 'Listeler', items: [
    { to: '/musteriler', label: 'Müşteriler', icon: Users },
    { to: '/tedarikciler', label: 'Tedarikçiler', icon: Handshake },
    { to: '/soforler', label: 'Şoförler', icon: IdCard,
      badge: (_, a) => badge(alertsAt(a, '/soforler'), 'belge uyarısı') },
    { to: '/personel', label: 'Personeller', icon: UserRound, perm: 'accounting' },
    { to: '/sabit-odemeler', label: 'Sabit Ödemeler', icon: Repeat, perm: 'accounting' },
  ] },
  { title: 'Öz Mal', items: [
    { to: '/araclar', label: 'Araçlar', icon: Building2,
      badge: (_, a) => badge(alertsAt(a, '/araclar'), 'belge veya bakım uyarısı') },
    { to: '/giderler', label: 'Giderler', icon: Receipt,
      badge: (d) => badge(d?.pendingExpenseCount ?? 0, 'onay bekleyen masraf') },
  ] },
  { title: 'Banka & Çek', items: [
    { to: '/kasa-banka', label: 'Kasa / Banka', icon: Landmark, perm: 'accounting' },
    { to: '/cek-senet', label: 'Çek / Senet', icon: ScrollText,
      badge: (_, a) => badge(alertsAt(a, '/cek-senet'), 'vadesi yaklaşan çek/senet') },
  ] },
  { title: 'Rapor ve Yönetim', items: [
    { to: '/raporlar', label: 'Raporlar', icon: BarChart3, perm: 'accounting' },
    { to: '/ayarlar', label: 'Ayarlar', icon: Settings,
      badge: (_, a) => badge(alertsAt(a, '/ayarlar'), 'firma belgesi uyarısı') },
    { to: '/yardim', label: 'Yardım', icon: HelpCircle },
  ] },
]

export function Layout() {
  const { user, logout, can } = useAuth()
  const location = useLocation()
  // Menü açıldığı sayfaya bağlı: başka sayfaya geçince kendiliğinden kapanır.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === location.pathname
  const setOpen = (v: boolean) => setOpenAt(v ? location.pathname : null)
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: () => get<Health>('/health'), refetchInterval: 60_000 })
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 60_000, enabled: user?.role !== 'Driver' })
  const { data: alerts = [] } = useQuery({ queryKey: ['alerts'], queryFn: () => get<Alert[]>('/dashboard/alerts'), refetchInterval: 5 * 60_000 })
  const { mirror, status: mirrorStatus } = useMirror()

  return (
    <div className="flex min-h-full">
      {open && <div className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col bg-side text-side-fg transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 pl-4 pr-2">
          <Link to="/" className="rounded-[3px]" aria-label="YES Lojistik" title="Ana sayfaya dön"><Logo /></Link>
          <button className="rounded-[3px] p-2 text-side-muted hover:bg-side-active hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Menüyü kapat"><X className="size-6" /></button>
        </div>
        {/* Gruplar hep açık: katlanmaz, menü daraltılmaz (kullanıcı isteği) */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Ana menü">
          {navGroups.map((g, gi) => {
            const items = g.items.filter((n) => !n.perm || can(n.perm))
            if (items.length === 0) return null
            return (
              <div key={gi} className={gi > 0 ? 'mt-2.5' : ''}>
                {g.title && <div className="mb-0.5 px-4 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-side-muted">{g.title}</div>}
                {items.map((n) => {
                  const b = n.badge?.(dashboard, alerts) ?? null
                  return (
                    <NavLink key={n.to} to={n.to} end={n.to === '/'}
                      className={({ isActive }) => clsx('flex min-h-[28px] items-center gap-2.5 border-l-[3px] pl-[13px] pr-3 text-[0.84375rem] transition',
                        isActive ? 'border-hl bg-side-active font-bold text-white' : 'border-transparent text-side-fg hover:bg-side-active/60 hover:text-white')}>
                      {({ isActive }) => (<>
                        <n.icon className={clsx('size-4 shrink-0', isActive ? 'text-hl' : 'text-side-muted')} />
                        <span className="min-w-0 flex-1 truncate">{n.label}</span>
                        {b && (
                          <span aria-hidden title={`${b.count} ${b.title}`}
                            className="flex h-[18px] min-w-5 items-center justify-center rounded-[2px] bg-hl px-1 pt-px font-mono text-[0.6875rem] font-semibold text-side">
                            {b.count > 99 ? '99+' : b.count}
                          </span>
                        )}
                      </>)}
                    </NavLink>
                  )
                })}
              </div>
            )
          })}
        </nav>
        <div className="shrink-0 border-t border-white/10 px-4 py-2.5 text-[0.75rem] leading-snug text-side-muted">
          <div className="truncate font-semibold text-side-fg">{user!.fullName}</div>
          YES Lojistik · v{health?.version ?? '2'}{health?.commit && ` (${health.commit.slice(0, 7)})`}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-white px-3 text-[0.8125rem] sm:gap-3 lg:px-6">
          <button className="flex min-h-11 items-center gap-2 rounded-[3px] px-2 font-semibold text-fg hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Menüyü aç"><Menu className="size-6" /><span className="hidden sm:inline">Menü</span></button>
          <GlobalSearch />
          <div className="flex-1" />
          <div className="hidden items-center gap-2 text-[0.8125rem] text-muted xl:flex">
            <CalendarDays className="size-4" />
            {longDate()}
          </div>
          <NewMenu mirror={mirror} />
          <TextSizeButton />
          <AlertsBell />
          <UserMenu name={user!.fullName} role={roleLabel[user!.role]} onLogout={logout} />
        </header>
        {health?.maintenance && (
          <div role="status" className="border-b border-line bg-warn-soft px-4 py-1.5 text-center text-[0.8125rem] font-semibold text-warn">
            Bakım çalışması yapılıyor: şu an yalnızca görüntüleme yapılabilir, kayıt eklenemez ve değiştirilemez.
          </div>
        )}
        {mirror && (
          <div role="status" className="border-b border-line bg-info-soft px-4 py-1.5 text-center text-[0.8125rem] text-info">
            <b>Pratikortam aynası:</b> kayıtlar pratikortam'dan gelir, değişikliği orada yapın.
            {mirrorStatus?.lastAt && <> Son güncelleme {ago(mirrorStatus.lastAt)}.</>}
          </div>
        )}
        <main className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-4 pb-28 pt-5 lg:px-7 lg:py-6">
          <MirrorContext.Provider value={mirror}><Outlet /></MirrorContext.Provider>
        </main>
      </div>
      <BottomBar onMenu={() => setOpen(true)} mirror={mirror} />
    </div>
  )
}

/** Üst çubuktaki "+ Yeni": en sık yapılan kayıtlar tek tıkla açılır (yetkiye göre). Klavyede "N" de açar. */
function NewMenu({ mirror }: { mirror: boolean }) {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const items = quickActions.filter((a) => !a.perm || can(a.perm))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" title="Yeni kayıt (kısayol: N)"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-[3px] bg-brand-600 px-3.5 text-[0.875rem] font-semibold text-white hover:bg-brand-700">
        <Plus className="size-[1.125rem]" /> Yeni
      </button>
      {open && <QuickActionMenu items={items} mirror={mirror} onPick={() => setOpen(false)} className="absolute right-0 top-11 w-72" />}
    </div>
  )
}

/**
 * "+ Yeni" listesi. Ayna açıkken kayıtlar pratikortam'dan gelir: liste yine görünür (alışkanlık bozulmasın),
 * ama seçilen iş açılmaz, "pratikortam'a girin" denir. Ayna kapanınca aynı liste formu açar.
 */
function QuickActionMenu({ items, mirror, onPick, className }: { items: typeof quickActions; mirror: boolean; onPick: () => void; className?: string }) {
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div role="menu" className={clsx('z-50 rounded-[4px] border border-line bg-white p-1 shadow-lg', className)}>
      {mirror && (
        <div role="status" className={clsx('mb-1 rounded-[3px] px-2.5 py-2 text-[0.8125rem] leading-snug', picked ? 'bg-warn-soft text-warn' : 'bg-info-soft text-info')}>
          {picked
            ? <><b>{picked}</b>: ayna açıkken bu kaydı pratikortam'a girin. Bir sonraki senkronda buraya da gelir.</>
            : <>Ayna açık: yeni kayıtları pratikortam'a girin. Panele geçince buradan açılır.</>}
        </div>
      )}
      {items.map((a) => {
        const inner = (<>
          <span className={clsx('flex size-7 shrink-0 items-center justify-center rounded-[3px]', a.tone)}><a.icon className="size-4" /></span>
          <span className="text-[0.875rem] text-fg">{a.label}</span>
        </>)
        return mirror ? (
          <button key={a.to} type="button" role="menuitem" onClick={() => setPicked(a.label)} title={a.hint}
            className="flex w-full items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-left opacity-60 hover:bg-surface-2">
            {inner}
          </button>
        ) : (
          <Link key={a.to} to={a.to} role="menuitem" onClick={onPick} className="flex items-center gap-2.5 rounded-[3px] px-2 py-1.5 hover:bg-surface-2" title={a.hint}>
            {inner}
          </Link>
        )
      })}
    </div>
  )
}

/** Üst çubukta "Aa": yazı boyutu tek tıkla (Normal / Büyük / Çok büyük). Aynı ayar kullanıcı menüsünde de var. */
function TextSizeButton() {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button className="flex min-h-9 items-center rounded-[3px] px-2 font-semibold text-slate-700 hover:bg-surface-2" onClick={() => setOpen((o) => !o)}
        aria-label="Yazı boyutu" aria-expanded={open} title="Yazı boyutu">
        <span className="text-[0.8125rem]">A</span><span className="text-[1.0625rem]">a</span>
      </button>
      {open && <div className="absolute right-0 top-11 z-50 w-72 rounded-[4px] border border-line bg-white px-4 py-3 shadow-lg"><TextSizePicker /></div>}
    </div>
  )
}

function TextSizePicker() {
  const [textSize, setTextSize] = useTextSize()
  return (<>
    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Type className="size-4" /> Yazı boyutu</div>
    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Yazı boyutu">
      {([['md', 'Normal', 'text-sm'], ['lg', 'Büyük', 'text-[0.9375rem]'], ['xl', 'Çok büyük', 'text-lg']] as const).map(([v, l, cls]) => (
        <button key={v} role="radio" aria-checked={textSize === v} onClick={() => setTextSize(v)}
          className={clsx('min-h-11 rounded-lg border px-1 font-medium leading-tight', cls,
            textSize === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
          {l}
        </button>
      ))}
    </div>
  </>)
}

/** Telefonda altta sabit çubuk: en çok gidilen yerler ve ortada büyük "+ Yeni". */
function BottomBar({ onMenu, mirror }: { onMenu: () => void; mirror: boolean }) {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const [openAt, setOpenAt] = useState(location.pathname)
  if (openAt !== location.pathname) { setOpenAt(location.pathname); if (open) setOpen(false) }
  const items = quickActions.filter((a) => !a.perm || can(a.perm))
  const link = (to: string, label: string, Icon: typeof Home, end = false) => (
    <NavLink to={to} end={end} aria-label={`${label} (kısayol)`}
      className={({ isActive }) => clsx('flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-sm font-medium', isActive ? 'text-brand-700' : 'text-slate-600')}>
      <Icon className="size-6" />{label}
    </NavLink>
  )
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      {open && <QuickActionMenu items={items} mirror={mirror} onPick={() => setOpen(false)} className="fixed inset-x-3 bottom-24 z-50 max-h-[70vh] overflow-y-auto lg:hidden" />}
      <nav aria-label="Alt kısayollar" className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {link('/', 'Ana Sayfa', Home, true)}
        {link('/seferler', 'Sevkiyat', Truck)}
        <div className="flex flex-1 items-center justify-center">
          <button onClick={() => setOpen((o) => !o)} aria-label="Yeni kayıt ekle" aria-expanded={open}
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-brand-600 text-white ring-4 ring-white">
            {open ? <X className="size-7" /> : <Plus className="size-8" />}
          </button>
        </div>
        {link(can('accounting') ? '/cari/musteriler' : '/musteriler', 'Cariler', Users)}
        <button onClick={onMenu} aria-label="Tüm menü" className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-sm font-medium text-slate-600">
          <Menu className="size-6" />Menü
        </button>
      </nav>
    </>
  )
}

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOutside() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onOutside])
  return ref
}

function AlertsBell() {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const { data } = useQuery({ queryKey: ['alerts'], queryFn: () => get<Alert[]>('/dashboard/alerts'), refetchInterval: 5 * 60_000 })
  const count = data?.length ?? 0
  return (
    <div className="relative" ref={ref}>
      <button className="relative rounded-[3px] p-2 text-slate-700 hover:bg-surface-2" onClick={() => setOpen((o) => !o)} aria-label="Bildirimler">
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold leading-5 text-white ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-[4px] border border-line bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[26rem]">
          <div className="border-b border-line bg-surface-2 px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.08em] text-slate-700" role="heading" aria-level={2}>Bildirimler</div>
          {count === 0 && <div className="px-4 py-8 text-center text-[0.9375rem] text-slate-600">Her şey yolunda, bildirim yok.</div>}
          {data?.map((a, i) => (
            <Link key={i} to={a.link} onClick={() => setOpen(false)} className="flex gap-3 border-b border-slate-100 px-5 py-3 hover:bg-slate-50">
              <span className={clsx('mt-1.5 size-2 shrink-0', a.severity === 'danger' ? 'bg-bad' : 'bg-hl')} />
              <span className="text-[0.9375rem]">
                <span className="font-medium text-slate-800">{a.title}</span>
                <span className="block text-slate-600">{a.message}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function UserMenu({ name, role, onLogout }: { name: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2 rounded-[3px] px-2 py-1 hover:bg-surface-2" onClick={() => setOpen((o) => !o)} aria-label="Hesabım">
        <UserCircle2 className="size-7 text-muted" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[0.8125rem] font-semibold text-fg">{name}</span>
          <span className="block text-[0.75rem] text-muted">{role}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-[4px] border border-line bg-white py-2 shadow-lg">
          <div className="px-4 pb-2 pt-1"><TextSizePicker /></div>
          <div className="my-1 border-t border-slate-100" />
          <Link to="/ayarlar?tab=password" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-3 px-4 text-[0.9375rem] hover:bg-slate-50">
            <CreditCard className="size-5" /> Şifre Değiştir
          </Link>
          <button onClick={onLogout} className="flex min-h-10 w-full items-center gap-3 px-4 text-[0.9375rem] text-red-700 hover:bg-red-50">
            <LogOut className="size-5" /> Çıkış Yap
          </button>
        </div>
      )}
    </div>
  )
}
