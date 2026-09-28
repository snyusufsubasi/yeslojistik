import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  Handshake, HandCoins,
  BarChart3, Bell, Building2, CalendarDays, CreditCard, FileText, Home, LogOut, Menu, Receipt, Settings, Truck,
  UserCircle2, Users, Wallet, X, IdCard, Map as MapIcon, HelpCircle,
} from 'lucide-react'
import { get } from '../api/client'
import type { Alert, Health } from '../api/types'
import { useAuth, type Permission } from '../lib/auth'
import { longDate } from '../lib/format'
import { roleLabel } from '../lib/labels'
import { Logo } from './Logo'

const nav: { to: string; label: string; icon: typeof Home; perm?: Permission }[] = [
  { to: '/', label: 'Ana Sayfa', icon: Home },
  { to: '/seferler', label: 'Seferler', icon: Truck },
  { to: '/araclar', label: 'Araçlar', icon: Building2 },
  { to: '/harita', label: 'Araç Takip Haritası', icon: MapIcon },
  { to: '/musteriler', label: 'Müşteriler / Cari', icon: Users },
  { to: '/tedarikciler', label: 'Tedarikçiler', icon: Handshake },
  { to: '/faturalar', label: 'Faturalar', icon: FileText },
  { to: '/tahsilatlar', label: 'Tahsilatlar', icon: Wallet },
  { to: '/odemeler', label: 'Ödemeler', icon: HandCoins },
  { to: '/soforler', label: 'Şoförler', icon: IdCard },
  { to: '/giderler', label: 'Giderler', icon: Receipt },
  { to: '/raporlar', label: 'Raporlar', icon: BarChart3, perm: 'accounting' },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
  { to: '/yardim', label: 'Yardım', icon: HelpCircle },
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
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-navy-900 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Menüyü kapat"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {nav.filter((n) => !n.perm || can(n.perm)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => clsx('flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition',
                isActive ? 'bg-brand-600 font-medium text-white' : 'text-blue-50 hover:bg-navy-800 hover:text-white')}>
              <n.icon className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3 text-[13px] text-blue-100/60">
          YES Lojistik · Nakliye Takip v{health?.version ?? '2'}{health?.commit && ` (${health.commit.slice(0, 7)})`}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menüyü aç"><Menu className="size-5" /></button>
          <div className="flex-1" />
          <div className="hidden items-center gap-1.5 text-sm text-slate-600 sm:flex">
            <CalendarDays className="size-4" />
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
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 lg:p-6">
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
      <button className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-label="Bildirimler">
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-navy-900">Bildirimler</div>
          {count === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">Her şey yolunda, bildirim yok.</div>}
          {data?.map((a, i) => (
            <Link key={i} to={a.link} onClick={() => setOpen(false)} className="flex gap-3 border-b border-slate-50 px-4 py-2.5 hover:bg-slate-50">
              <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', a.severity === 'danger' ? 'bg-red-500' : 'bg-amber-400')} />
              <span className="text-sm">
                <span className="font-medium text-slate-800">{a.title}</span>
                <span className="block text-slate-500">{a.message}</span>
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
      <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100" onClick={() => setOpen((o) => !o)}>
        <UserCircle2 className="size-8 text-navy-800" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium text-slate-800">{name}</span>
          <span className="block text-[13px] text-slate-500">{role}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          <Link to="/ayarlar?tab=password" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
            <CreditCard className="size-4" /> Şifre Değiştir
          </Link>
          <button onClick={onLogout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-slate-50">
            <LogOut className="size-4" /> Çıkış Yap
          </button>
        </div>
      )}
    </div>
  )
}
