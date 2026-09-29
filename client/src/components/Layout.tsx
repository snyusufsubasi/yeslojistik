import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  Handshake, HandCoins, PanelLeftClose, PanelLeftOpen, Plus,
  BarChart3, Bell, Building2, CalendarDays, CreditCard, FileText, Home, LogOut, Menu, Receipt, Settings, Truck,
  UserCircle2, Users, Wallet, X, IdCard, Map as MapIcon, HelpCircle, Landmark, ScrollText, Type, Scale, ClipboardList, UserRound, Repeat, FileInput } from 'lucide-react'
import { get } from '../api/client'
import { GlobalSearch } from './GlobalSearch'
import type { Alert, Dashboard, Health } from '../api/types'
import { useAuth, type Permission } from '../lib/auth'
import { longDate } from '../lib/format'
import { roleLabel } from '../lib/labels'
import { quickActions } from '../lib/quickActions'
import { Logo } from './Logo'
import { useTextSize } from '../lib/textSize'

type Badge = { count: number; tone: 'blue' | 'red' | 'orange' | 'violet'; title: string }
type NavItem = { to: string; label: string; hint: string; icon: typeof Home; perm?: Permission; badge?: (d: Dashboard | undefined, alerts: Alert[]) => Badge | null }

const alertsAt = (alerts: Alert[], path: string) => alerts.filter((a) => a.link.startsWith(path)).length
const badge = (count: number, tone: Badge['tone'], title: string): Badge | null => (count > 0 ? { count, tone, title } : null)

/**
 * Menü, eski paneldeki (pratikortam) gruplamayı izler ki alışkanlık bozulmasın: Sevkiyat, Cari, Listeler, Öz Mal, Banka & Çek.
 * Ama daha sade: her maddenin altında ne işe yaradığı yazar, bekleyen işler sayaçla görünür.
 */
const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [
    { to: '/', label: 'Ana Sayfa', hint: 'Bugünün işleri ve özet', icon: Home },
    { to: '/harita', label: 'Araç Takip Haritası', hint: 'Araçlar şu an nerede', icon: MapIcon },
  ] },
  { title: 'Sevkiyat', items: [
    { to: '/is-talepleri', label: 'İş Talepleri', hint: 'Araç atanmadan gelen işler', icon: ClipboardList },
    { to: '/seferler', label: 'Sevkiyatlar', hint: 'Sefer aç, durum güncelle, kazanç', icon: Truck,
      badge: (d) => badge(d?.activeTripCount ?? 0, 'blue', 'bekleyen ve yoldaki sefer') },
  ] },
  { title: 'Cari', items: [
    { to: '/cari/musteriler', label: 'Müşteriler Cari', hint: 'Kimden ne kadar alacağız', icon: Scale, perm: 'accounting',
      badge: (_, a) => badge(alertsAt(a, '/musteriler'), 'red', 'vadesi geçen alacak') },
    { to: '/cari/tedarikciler', label: 'Tedarikçiler Cari', hint: 'Kime ne kadar borcumuz var', icon: Scale, perm: 'accounting',
      badge: (_, a) => badge(alertsAt(a, '/tedarikciler'), 'red', 'taşeron uyarısı') },
    { to: '/faturalar', label: 'Faturalar', hint: 'Kes, gönder, takip et', icon: FileText,
      badge: (d) => badge(d?.uninvoicedTripCount ?? 0, 'violet', 'faturası kesilmemiş teslim sefer') },
    { to: '/tahsilatlar', label: 'Tahsilatlar', hint: 'Müşteriden gelen paralar', icon: Wallet },
    { to: '/alinan-faturalar', label: 'Alınan Faturalar', hint: 'Taşeron ve tedarikçi faturaları', icon: FileInput },
    { to: '/odemeler', label: 'Tedarikçi Ödemeleri', hint: 'Taşerona ödenenler', icon: HandCoins },
  ] },
  { title: 'Listeler', items: [
    { to: '/musteriler', label: 'Müşteriler', hint: 'Firma kartları', icon: Users },
    { to: '/tedarikciler', label: 'Tedarikçiler', hint: 'Araç sahipleri, servisler', icon: Handshake },
    { to: '/soforler', label: 'Şoförler', hint: 'Belgeler ve şoför hesabı', icon: IdCard,
      badge: (_, a) => badge(alertsAt(a, '/soforler'), 'orange', 'belge uyarısı') },
    { to: '/personel', label: 'Personeller', hint: 'Maaş, avans, prim', icon: UserRound, perm: 'accounting' },
    { to: '/sabit-odemeler', label: 'Sabit Ödemeler', hint: 'Kira, taksit, aylık ödemeler', icon: Repeat, perm: 'accounting' },
  ] },
  { title: 'Öz Mal', items: [
    { to: '/araclar', label: 'Araçlar', hint: 'Belgeler, bakım, kiralıklar', icon: Building2,
      badge: (_, a) => badge(alertsAt(a, '/araclar'), 'orange', 'belge veya bakım uyarısı') },
    { to: '/giderler', label: 'Giderler', hint: 'Mazot, masraf, bakım', icon: Receipt,
      badge: (d) => badge(d?.pendingExpenseCount ?? 0, 'orange', 'onay bekleyen masraf') },
  ] },
  { title: 'Banka & Çek', items: [
    { to: '/kasa-banka', label: 'Kasa / Banka', hint: 'Hesap bakiyeleri, virman', icon: Landmark, perm: 'accounting' },
    { to: '/cek-senet', label: 'Çek / Senet', hint: 'Portföy ve vadeler', icon: ScrollText,
      badge: (_, a) => badge(alertsAt(a, '/cek-senet'), 'orange', 'vadesi yaklaşan çek/senet') },
  ] },
  { title: 'Rapor ve Yönetim', items: [
    { to: '/raporlar', label: 'Raporlar', hint: 'Kâr, analiz, ekstre', icon: BarChart3, perm: 'accounting' },
    { to: '/ayarlar', label: 'Ayarlar', hint: 'Firma, kullanıcılar, yedek', icon: Settings,
      badge: (_, a) => badge(alertsAt(a, '/ayarlar'), 'orange', 'firma belgesi uyarısı') },
    { to: '/yardim', label: 'Yardım', hint: 'Nasıl yapılır?', icon: HelpCircle },
  ] },
]

const badgeTone: Record<Badge['tone'], string> = {
  blue: 'bg-brand-100 text-brand-800', red: 'bg-red-100 text-red-700', orange: 'bg-amber-100 text-amber-800', violet: 'bg-violet-100 text-violet-800',
}

const COLLAPSE_KEY = 'yes.navCollapsed'
function readCollapsed() { try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false } }

export function Layout() {
  const { user, logout, can } = useAuth()
  const location = useLocation()
  // Menü açıldığı sayfaya bağlı: başka sayfaya geçince kendiliğinden kapanır.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === location.pathname
  const setOpen = (v: boolean) => setOpenAt(v ? location.pathname : null)
  const [collapsed, setCollapsedState] = useState(readCollapsed)
  const setCollapsed = (v: boolean) => { setCollapsedState(v); try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0') } catch { /* yok say */ } }
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: () => get<Health>('/health'), refetchInterval: 60_000 })
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 60_000, enabled: user?.role !== 'Driver' })
  const { data: alerts = [] } = useQuery({ queryKey: ['alerts'], queryFn: () => get<Alert[]>('/dashboard/alerts'), refetchInterval: 5 * 60_000 })
  // Masaüstünde daraltılmışsa yalnızca ikonlar; telefonda açılan menü her zaman tam görünür.
  const slim = collapsed && !open

  return (
    <div className="flex min-h-full">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-68 flex-col border-r border-slate-200 bg-sidebar text-slate-800 transition-[transform,width] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        slim && 'lg:w-20', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className={clsx('flex items-center justify-between py-4', slim ? 'lg:justify-center lg:px-2' : 'px-5')}>
          <div className={clsx(slim && 'lg:hidden')}><Logo dark /></div>
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-200/70 lg:hidden" onClick={() => setOpen(false)} aria-label="Menüyü kapat"><X className="size-6" /></button>
          <button className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 lg:block" onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'} title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}>
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
        </div>
        <nav className={clsx('flex-1 overflow-y-auto pb-4', slim ? 'lg:px-2' : 'px-3')} aria-label="Ana menü">
          {navGroups.map((g, gi) => {
            const items = g.items.filter((n) => !n.perm || can(n.perm))
            if (items.length === 0) return null
            return (
              <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
                {g.title && (slim
                  ? <div className="mx-3 mb-2 hidden border-t border-slate-200 lg:block" aria-hidden />
                  : null)}
                {g.title && <div className={clsx('mb-1 px-3 text-[0.8125rem] font-medium text-slate-500', slim && 'lg:hidden')}>{g.title}</div>}
                <div className="space-y-0.5">
                  {items.map((n) => {
                    const b = n.badge?.(dashboard, alerts) ?? null
                    return (
                      <NavLink key={n.to} to={n.to} end={n.to === '/'} title={n.hint}
                        className={({ isActive }) => clsx('group relative flex min-h-10 items-center gap-3 rounded-lg px-3 transition',
                          slim && 'lg:justify-center lg:px-0',
                          isActive ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(31,30,27,0.08)] ring-1 ring-slate-200' : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900')}>
                        {({ isActive }) => (<>
                          <n.icon className={clsx('size-[1.125rem] shrink-0', isActive ? 'text-brand-600' : 'text-slate-500 group-hover:text-slate-700')} />
                          <span className={clsx('min-w-0 flex-1 truncate text-[0.9375rem]', isActive ? 'font-medium' : 'font-normal', slim && 'lg:hidden')}>{n.label}</span>
                          {b && (
                            <span aria-hidden title={`${b.count} ${b.title}`}
                              className={clsx('flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-[0.8125rem] font-medium', badgeTone[b.tone],
                                slim && 'lg:absolute lg:right-1 lg:top-0.5 lg:h-5 lg:min-w-5 lg:text-xs')}>
                              {b.count > 99 ? '99+' : b.count}
                            </span>
                          )}
                        </>)}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
        <div className={clsx('border-t border-slate-200 px-5 py-3 text-sm text-slate-500', slim && 'lg:hidden')}>
          YES Lojistik · Nakliye Takip v{health?.version ?? '2'}{health?.commit && ` (${health.commit.slice(0, 7)})`}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200/70 bg-canvas/90 px-3 backdrop-blur sm:gap-3 lg:px-8">
          <button className="flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium text-slate-800 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Menüyü aç"><Menu className="size-6" /><span className="hidden sm:inline">Menü</span></button>
          <GlobalSearch />
          <div className="flex-1" />
          <div className="hidden items-center gap-2 text-sm text-slate-600 xl:flex">
            <CalendarDays className="size-4" />
            {longDate()}
          </div>
          <NewMenu />
          <AlertsBell />
          <UserMenu name={user!.fullName} role={roleLabel[user!.role]} onLogout={logout} />
        </header>
        {health?.maintenance && (
          <div role="status" className="bg-amber-100 px-4 py-2 text-center text-[0.9375rem] font-medium text-amber-900">
            Bakım çalışması yapılıyor: şu an yalnızca görüntüleme yapılabilir, kayıt eklenemez ve değiştirilemez.
          </div>
        )}
        <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-4 pb-28 pt-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
      <BottomBar onMenu={() => setOpen(true)} />
    </div>
  )
}

/** Üst çubuktaki "+ Yeni": en sık yapılan kayıtlar tek tıkla açılır (yetkiye göre). */
function NewMenu() {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const items = quickActions.filter((a) => !a.perm || can(a.perm))
  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-[0.9375rem] font-medium text-white hover:bg-brand-700">
        <Plus className="size-[1.125rem]" /> Yeni
      </button>
      {open && <QuickActionMenu items={items} onPick={() => setOpen(false)} className="absolute right-0 top-13 w-64" />}
    </div>
  )
}

function QuickActionMenu({ items, onPick, className }: { items: typeof quickActions; onPick: () => void; className?: string }) {
  return (
    <div role="menu" className={clsx('z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg', className)}>
      {items.map((a) => (
        <Link key={a.to} to={a.to} role="menuitem" onClick={onPick} className="flex items-center gap-3 rounded-lg px-2.5 py-1.5 hover:bg-slate-100" title={a.hint}>
          <span className={clsx('flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', a.tone)}><a.icon className="size-4" /></span>
          <span className="text-[0.9375rem] text-slate-800">{a.label}</span>
        </Link>
      ))}
    </div>
  )
}

/** Telefonda altta sabit çubuk: en çok gidilen yerler ve ortada büyük "+ Yeni". */
function BottomBar({ onMenu }: { onMenu: () => void }) {
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
      {open && <QuickActionMenu items={items} onPick={() => setOpen(false)} className="fixed inset-x-3 bottom-24 z-50 max-h-[70vh] overflow-y-auto lg:hidden" />}
      <nav aria-label="Alt kısayollar" className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        {link('/', 'Ana Sayfa', Home, true)}
        {link('/seferler', 'Sevkiyat', Truck)}
        <div className="flex flex-1 items-center justify-center">
          <button onClick={() => setOpen((o) => !o)} aria-label="Yeni kayıt ekle" aria-expanded={open}
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-md ring-4 ring-white">
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
      <button className="relative rounded-full p-2.5 text-slate-700 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-label="Bildirimler">
        <Bell className="size-6" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold leading-5 text-white ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-13 sm:w-[26rem]">
          <div className="border-b border-slate-100 px-5 py-3 text-lg text-slate-900" role="heading" aria-level={2}>Bildirimler</div>
          {count === 0 && <div className="px-4 py-8 text-center text-[0.9375rem] text-slate-600">Her şey yolunda, bildirim yok.</div>}
          {data?.map((a, i) => (
            <Link key={i} to={a.link} onClick={() => setOpen(false)} className="flex gap-3 border-b border-slate-100 px-5 py-3 hover:bg-slate-50">
              <span className={clsx('mt-2 size-2.5 shrink-0 rounded-full', a.severity === 'danger' ? 'bg-red-500' : 'bg-amber-400')} />
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
  const [textSize, setTextSize] = useTextSize()
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-label="Hesabım">
        <UserCircle2 className="size-8 text-slate-600" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[0.9375rem] font-medium text-slate-900">{name}</span>
          <span className="block text-sm text-slate-600">{role}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-50 w-72 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
          <div className="px-4 pb-2 pt-1">
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
          </div>
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
