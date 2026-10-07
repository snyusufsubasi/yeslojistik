import { useEffect, useRef, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

export type FilterChip = { label: string; onClear: () => void }

/** Listenin üstündeki tek satır: arama, 1-2 hızlı süzgeç, "Süzgeç (n)" düğmesi; altında açık süzgeç çipleri. */
export function FilterBar({ search, quick, chips, onOpen, onClearAll }:
  { search?: ReactNode; quick?: ReactNode; chips: FilterChip[]; onOpen: () => void; onClearAll?: () => void }) {
  return (
    <div className="space-y-2.5">
      <div className="filter-row flex flex-wrap items-center gap-2.5">
        {search && <div className="min-w-56 flex-1 sm:max-w-md">{search}</div>}
        {quick}
        <button type="button" onClick={onOpen} aria-haspopup="dialog"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[0.875rem] font-semibold text-fg hover:bg-surface-2">
          <SlidersHorizontal className="size-4" /> Süzgeç{chips.length > 0 && <span className="rounded-md bg-accent px-1.5 text-[0.75rem] text-white">{chips.length > 99 ? '99+' : chips.length}</span>}
        </button>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Açık süzgeçler">
          {chips.map((c) => (
            <button key={c.label} type="button" onClick={c.onClear} title="Süzgeci kaldır"
              className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent-soft px-2 py-1 text-[0.8125rem] font-medium text-accent hover:bg-accent/15">
              {c.label} <X className="size-3.5" aria-label="kaldır" />
            </button>
          ))}
          {onClearAll && <button type="button" onClick={onClearAll} className="px-1.5 text-[0.8125rem] font-medium text-muted underline underline-offset-2 hover:text-fg">Süzgeci temizle</button>}
        </div>
      )}
    </div>
  )
}

/** Sağdan açılan süzgeç paneli (telefonda tam ekran). Süzgeç kutuları değişince liste hemen güncellenir; panel yalnız yerleşimdir. */
export function FilterPanel({ open, onClose, children, title = 'Süzgeç', onClearAll }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; onClearAll?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    // Esc kapatır; Tab panelin içinde döner (odak tuzağı), açıkken gövde kaydırması kilitlenir.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const els = [...(ref.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])]
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && (active === first || !ref.current?.contains(active))) { e.preventDefault(); last.focus() }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLElement>('input, select, button')?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[45]">
      <div className="absolute inset-0 bg-slate-950/30" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="filter-panel-title"
        className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-xl sm:w-[400px]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 id="filter-panel-title" className="text-[1.0625rem] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="flex size-11 items-center justify-center rounded-lg hover:bg-surface-2"><X className="size-5" /></button>
        </div>
        <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex shrink-0 justify-between gap-2 border-t border-line px-5 py-3">
          {onClearAll ? <button type="button" onClick={onClearAll} className="text-[0.875rem] font-medium text-muted underline underline-offset-2 hover:text-fg">Süzgeci temizle</button> : <span />}
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg bg-accent px-5 text-[0.875rem] font-semibold text-white hover:bg-brand-700">Listeyi göster</button>
        </div>
      </div>
    </div>
  )
}
