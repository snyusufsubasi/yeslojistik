import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  Handshake, HandCoins,
  BarChart3, Bell, Building2, CalendarDays, CreditCard, FileText, Home, LogOut, Menu, Receipt, Settings, Truck,
  UserCircle2, Users, Wallet, X, IdCard, Map as MapIcon, HelpCircle, Landmark, ScrollText, Type } from 'lucide-react'
import { get } from '../api/client'
import { GlobalSearch } from './GlobalSearch'
import type { Alert, Health } from '../api/types'
import { useAuth, type Permission } from '../lib/auth'
import { longDate } from '../lib/format'
import { roleLabel } from '../lib/labels'
import { Logo } from './Logo'
import { useTextSize } from '../lib/textSize'

type NavItem = { to: string; label: string; icon: typeof Home; perm?: Permission }

/** Menü, işe göre gruplanmış: önce günlük operasyon, sonra para işleri, en sonda yönetim. */
const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Ana Sayfa', icon: Home }] },
  { title: 'Operasyon', items: [
    { to: '/seferler', label: 'Seferler', icon: Truck },
    { to: '/harita', label: 'Araç Takip Haritası', icon: MapIcon },
    { to: '/araclar', label: 'Araçlar', icon: Building2 },
    { to: '/soforler', label: 'Şoförler', icon: IdCard },
  ] },
  { title: 'Cari ve Para', items: [
    { to: '/musteriler', label: 'Müşteriler / Cari', icon: Users },
    { to: '/tedarikciler', label: 'Tedarikçiler', icon: Handshake },
    { to: '/faturalar', label: 'Faturalar', icon: FileText },
    { to: '/tahsilatlar', label: 'Tahsilatlar', icon: Wallet },
    { to: '/odemeler', label: 'Ödemeler', icon: HandCoins },
    { to: '/cek-senet', label: 'Çek / Senet', icon: ScrollText },
    { to: '/kasa-banka', label: 'Kasa / Banka', icon: Landmark, perm: 'accounting' },
    { to: '/giderler', label: 'Giderler', icon: Receipt },
  ] },
  { title: 'Yönetim', items: [
    { to: '/raporlar', label: 'Raporlar', icon: BarChart3, perm: 'accounting' },
    { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
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

  return (
    <div className="flex min-h-full">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-68 flex-col bg-gradient-to-b from-navy-900 to-navy-950 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-5 py-4">
          <Logo />
          <button className="rounded-lg p-2 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Menüyü kapat"><X className="size-6" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Ana menü">
          {navGroups.map((g, gi) => {
            const items = g.items.filter((n) => !n.perm || can(n.perm))
            if (items.length === 0) return null
            return (
              <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                {g.title && <div className="mb-1.5 px-3 text-sm font-semibold uppercase tracking-wider text-blue-200/80">{g.title}</div>}
                <div className="space-y-0.5">
                  {items.map((n) => (
                    <NavLink key={n.to} to={n.to} end={n.to === '/'}
                      className={({ isActive }) => clsx('flex min-h-10.5 items-center gap-3 rounded-xl px-3 text-[1.0625rem] transition',
                        isActive ? 'bg-white font-semibold text-navy-900 shadow-md' : 'text-blue-50 hover:bg-white/10 hover:text-white')}>
                      <n.icon className="size-5 shrink-0" />
                      {n.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-3 text-sm text-blue-100/70">
          YES Lojistik · Nakliye Takip v{health?.version ?? '2'}{health?.commit && ` (${health.commit.slice(0, 7)})`}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:px-6">
          <button className="flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-navy-900 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Menüyü aç"><Menu className="size-6" /><span className="hidden sm:inline">Menü</span></button>
          <GlobalSearch />
          <div className="flex-1" />
          <div className="hidden items-center gap-2 text-base text-slate-700 md:flex">
            <CalendarDays className="size-5" />
            {longDate()}
          </div>
          <AlertsBell />
          <UserMenu name={user!.fullName} role={roleLabel[user!.role]} onLogout={logout} />
        </header>
        {health?.maintenance && (
          <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
            Bakım çalışması yapılıyor: şu an yalnızca görüntüleme yapılabilir, kayıt eklenemez ve değiştirilemez.
          </div>
        )}
        <main className="w-full min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
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
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-5 text-white ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-13 sm:w-[26rem]">
          <div className="border-b border-slate-100 px-5 py-3 text-lg font-bold text-navy-900">Bildirimler</div>
          {count === 0 && <div className="px-4 py-8 text-center text-base text-slate-600">Her şey yolunda, bildirim yok.</div>}
          {data?.map((a, i) => (
            <Link key={i} to={a.link} onClick={() => setOpen(false)} className="flex gap-3 border-b border-slate-100 px-5 py-3 hover:bg-slate-50">
              <span className={clsx('mt-2 size-2.5 shrink-0 rounded-full', a.severity === 'danger' ? 'bg-red-500' : 'bg-amber-400')} />
              <span className="text-base">
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
        <UserCircle2 className="size-9 text-navy-800" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-base font-semibold text-slate-900">{name}</span>
          <span className="block text-sm text-slate-600">{role}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-50 w-72 rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl">
          <div className="px-4 pb-2 pt-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Type className="size-4" /> Yazı boyutu</div>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Yazı boyutu">
              {([['md', 'Normal', 'text-sm'], ['lg', 'Büyük', 'text-base'], ['xl', 'Çok büyük', 'text-lg']] as const).map(([v, l, cls]) => (
                <button key={v} role="radio" aria-checked={textSize === v} onClick={() => setTextSize(v)}
                  className={clsx('min-h-11 rounded-lg border px-1 font-semibold leading-tight', cls,
                    textSize === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="my-1 border-t border-slate-100" />
          <Link to="/ayarlar?tab=password" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 px-4 text-base hover:bg-slate-50">
            <CreditCard className="size-5" /> Şifre Değiştir
          </Link>
          <button onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 px-4 text-base font-medium text-red-700 hover:bg-red-50">
            <LogOut className="size-5" /> Çıkış Yap
          </button>
        </div>
      )}
    </div>
  )
}
