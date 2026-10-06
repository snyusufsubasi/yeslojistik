import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { sectionFor } from '../../lib/sections'
import { useIsNewUi } from '../../lib/uiMode'

/**
 * Yeni görünümde sayfa başlığının altında bölüm sekmeleri (ör. Müşteriler Cari: Bakiyeler · Tahsilatlar). Klasik görünümde hiçbir şey çizmez.
 *
 * Telefonda (390px) e-Fatura'nın dört sekmesi ekrana sığmaz: şerit kendi içinde yatay kaydırılır
 * (`overflow-x-auto`), sayfa yana kaymaz. Kaydırma çubuğu gizlenir (`scrollbar-width:none` +
 * `::-webkit-scrollbar`), sekmeler tek satırda kalır (`whitespace-nowrap`). Etkin sekme şeridin
 * görünür alanına kaydırılır (`scrollIntoView`, `block/inline:'nearest'`: sayfa oynamaz).
 */
export function SectionTabs() {
  const isNew = useIsNewUi()
  const { pathname, search } = useLocation()
  const { can } = useAuth()
  const activeRef = useRef<HTMLAnchorElement>(null)
  const section = sectionFor(pathname)
  const activeKey = section ? pathname + search : ''
  useEffect(() => {
    if (!isNew) return
    // `inline:'nearest'` şeridi yalnız gerektiği kadar kaydırır; `block:'nearest'` sayfayı dikey oynatmaz.
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [isNew, activeKey])
  if (!isNew || !section) return null
  const tabs = section.tabs.filter((t) => !t.perm || can(t.perm))
  if (tabs.length < 2) return null
  const params = new URLSearchParams(search)
  /** Sekme adresi sorgu taşıyorsa o sorgu da eşleşmeli; taşımıyorsa adreste "sekme" parametresi olmamalı. */
  const isActive = (to: string) => {
    const [path, query] = to.split('?')
    if (path !== pathname) return false
    if (!query) return !params.get('sekme')
    const want = new URLSearchParams(query)
    for (const [k, v] of want) if (params.get(k) !== v) return false
    return true
  }
  return (
    <nav aria-label="Bölüm sekmeleri"
      className="section-tabs -mt-2 mb-5 max-w-full overflow-x-auto border-b border-line [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" className="flex min-w-max gap-1 whitespace-nowrap">
        {tabs.map((t) => {
          const active = isActive(t.to)
          return (
            <Link key={t.to} to={t.to} role="tab" aria-selected={active} ref={active ? activeRef : undefined}
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
