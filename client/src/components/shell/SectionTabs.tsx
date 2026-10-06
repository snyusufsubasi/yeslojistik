import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { sectionFor } from '../../lib/sections'
import { useIsNewUi } from '../../lib/uiMode'

/** Yeni görünümde sayfa başlığının altında bölüm sekmeleri (ör. Müşteriler Cari: Bakiyeler · Tahsilatlar). Klasik görünümde hiçbir şey çizmez. */
export function SectionTabs() {
  const isNew = useIsNewUi()
  const { pathname } = useLocation()
  const { can } = useAuth()
  const section = sectionFor(pathname)
  if (!isNew || !section) return null
  const tabs = section.tabs.filter((t) => !t.perm || can(t.perm))
  if (tabs.length < 2) return null
  return (
    <nav aria-label="Bölüm sekmeleri" className="section-tabs -mt-2 mb-5 overflow-x-auto border-b border-line">
      <div role="tablist" className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const active = t.to === pathname
          return (
            <Link key={t.to} to={t.to} role="tab" aria-selected={active}
              className={clsx('whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[0.9375rem] font-semibold transition',
                active ? 'border-accent text-fg' : 'border-transparent text-muted hover:border-slate-300 hover:text-fg')}>
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
