import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

/**
 * Bugün ekranının sekmeleri: Bugün (istisna listesi, `/`), Genel Bakış (rakam panosu, `/pano`) ve yeni görünümde
 * Onay Bekleyenler (`/?tab=approvals`, yalnız muhasebe yetkisi). Sayaç, onay bekleyen masraf sayısıdır (varsa).
 */
export function TodayTabBar({ approvals, showApprovals, pendingCount }: { approvals: boolean; showApprovals: boolean; pendingCount: number }) {
  const { pathname } = useLocation()
  const items = [
    { to: '/', label: 'Bugün', active: pathname === '/' && !approvals },
    { to: '/pano', label: 'Genel Bakış', active: pathname === '/pano' && !approvals },
    ...(showApprovals ? [{ to: '/?tab=approvals', label: pendingCount > 0 ? `Onay Bekleyenler (${pendingCount})` : 'Onay Bekleyenler', active: approvals }] : []),
  ]
  return (
    <nav aria-label="Bugün sekmeleri" className="-mt-2 overflow-x-auto border-b border-line">
      <div role="tablist" className="flex min-w-max gap-1">
        {items.map((t) => (
          <Link key={t.to} to={t.to} role="tab" aria-selected={t.active}
            className={clsx('whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[0.9375rem] font-semibold transition',
              t.active ? 'border-accent text-fg' : 'border-transparent text-muted hover:border-slate-300 hover:text-fg')}>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
