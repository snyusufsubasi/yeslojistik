import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, FileText, Handshake, IdCard, Search, Truck, Users } from 'lucide-react'
import { get } from '../api/client'
import type { SearchResult } from '../api/types'
import { useDebounce } from '../lib/hooks'
import { Modal, Spinner } from './ui'

const typeInfo: Record<SearchResult['type'], { label: string; icon: typeof Truck }> = {
  trip: { label: 'Sevkiyat', icon: Truck },
  customer: { label: 'Müşteri', icon: Users },
  supplier: { label: 'Tedarikçi', icon: Handshake },
  vehicle: { label: 'Araç', icon: Building2 },
  driver: { label: 'Şoför', icon: IdCard },
  invoice: { label: 'Fatura', icon: FileText },
}

/** Üst çubuktaki arama: seferler (referans, plaka, müşteri), müşteriler, tedarikçiler, araçlar, şoförler ve faturalar. Ctrl+K ile açılır. */
export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Ara (Ctrl+K)"
        className="flex min-h-9 items-center gap-2 rounded-[3px] border border-line bg-slate-50 px-3 text-[0.8125rem] text-muted hover:border-slate-300 hover:bg-white sm:min-w-80">
        <Search className="size-4" />
        <span className="hidden sm:inline">Ne arıyorsunuz? (plaka, müşteri, fatura…)</span>
        <kbd className="ml-auto hidden rounded-[2px] border border-line bg-white px-1.5 font-mono text-[0.6875rem] text-muted lg:inline">Ctrl K</kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const debounced = useDebounce(q.trim(), 250)
  const input = useRef<HTMLInputElement>(null)
  const results = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => get<SearchResult[]>('/search', { q: debounced }),
    enabled: debounced.length >= 2,
  })
  const items = debounced.length >= 2 ? results.data ?? [] : []
  const go = (r: SearchResult) => { onClose(); navigate(r.link) }

  return (
    <Modal open onClose={onClose} title="Ara" size="md" guard={false}>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input ref={input} autoFocus className="input pl-9" placeholder="Plaka, müşteri, referans no, fatura no, şoför…" aria-label="Arama"
          value={q} onChange={(e) => { setQ(e.target.value); setActive(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            if (e.key === 'Enter' && items[active]) go(items[active])
          }} />
      </div>
      {debounced.length < 2 ? <p className="py-6 text-center text-sm text-slate-500">En az 2 karakter yazın.</p>
        : results.isLoading ? <Spinner />
        : items.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Sonuç yok.</p>
        : (
          <ul className="divide-y divide-slate-100" role="listbox">
            {items.map((r, i) => {
              const info = typeInfo[r.type]
              return (
                <li key={`${r.type}-${r.id}`} role="option" aria-selected={i === active}>
                  <button onClick={() => go(r)} onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-start gap-3 px-2 py-2.5 text-left ${i === active ? 'bg-brand-50' : ''}`}>
                    <info.icon className="mt-0.5 size-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800">{r.title}</span>
                      {r.subtitle && <span className="block truncate text-sm text-slate-500">{r.subtitle}</span>}
                    </span>
                    <span className="shrink-0 text-sm text-slate-500">{info.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
    </Modal>
  )
}
