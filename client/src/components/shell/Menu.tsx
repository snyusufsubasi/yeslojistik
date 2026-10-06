import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { MoreHorizontal } from 'lucide-react'
import { useAuth, type Permission } from '../../lib/auth'
import { MirrorContext } from '../ui'

/** Açılır menü maddesi. `write`: ayna modunda gizlenir (kayıt değiştiren işler). */
export type MenuItem = { label: string; onClick: () => void; icon?: ReactNode; write?: boolean; perm?: Permission; danger?: boolean; hidden?: boolean }

/** Görünürlük süzgeci: `hidden`, ayna modunda `write`, yetkisiz `perm` elenir. Menüler ve PageShell ortak kullanır. */
export function useVisibleItems(items: MenuItem[]): MenuItem[] {
  const mirror = useContext(MirrorContext)
  const { can } = useAuth()
  return items.filter((i) => !i.hidden && !(i.write && mirror) && (!i.perm || can(i.perm)))
}

/** Açılır liste: klavye (↑↓ Enter Esc), dışarı tıklayınca kapanır. MoreMenu ve RowMenu ortak gövdesi. */
function DropMenu({ items, trigger, align = 'right', label }: { items: MenuItem[]; trigger: (p: { open: boolean; toggle: () => void }) => ReactNode; align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const visible = useVisibleItems(items)
  /** Kapanışta odağı tetikleyici düğmeye geri verir (klavye kullanıcısı kaybolmaz). */
  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) ref.current?.querySelector<HTMLElement>('button')?.focus()
  }
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  if (visible.length === 0) return null
  const onKey = (e: React.KeyboardEvent) => {
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const i = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') { e.stopPropagation(); close() }
    else if (e.key === 'Tab') { close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus() }
  }
  return (
    <div className="relative" ref={ref} onKeyDown={onKey} onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div role="menu" aria-label={label}
          className={clsx('absolute top-full z-40 mt-1 min-w-56 rounded-[4px] border border-line bg-white p-1 shadow-lg', align === 'right' ? 'right-0' : 'left-0')}>
          {visible.map((i) => (
            <button key={i.label} type="button" role="menuitem" onClick={() => { close(); i.onClick() }}
              className={clsx('flex min-h-11 w-full items-center gap-2.5 rounded-[3px] px-3 py-2 text-left text-[0.9375rem] hover:bg-surface-2 focus:bg-surface-2 focus:outline-none [&_svg]:size-4',
                i.danger ? 'text-bad' : 'text-fg')}>
              {i.icon}{i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Sayfa üstündeki "⋯ Diğer": Excel, PDF, İcmal, Excel'den aktar gibi nadir işler. Dokunma hedefi ≥44px (min-h-11 = 2.75rem). */
export function MoreMenu({ items }: { items: MenuItem[] }) {
  return (
    <DropMenu items={items} label="Diğer işlemler" trigger={({ open, toggle }) => (
      <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-[3px] border border-line bg-white px-3.5 text-[0.875rem] font-semibold text-fg hover:bg-surface-2">
        <MoreHorizontal className="size-4" /> Diğer
      </button>
    )} />
  )
}

/** Satır sonundaki "⋯": Düzenle, Kopyala, Sil… Satır tıklamasını tetiklemez. Dokunma hedefi 44px (size-11 = 2.75rem). */
export function RowMenu({ items, label = 'İşlemler' }: { items: MenuItem[]; label?: string }) {
  return (
    <DropMenu items={items} label={label} trigger={({ open, toggle }) => (
      <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={label} title={label}
        className="inline-flex size-11 items-center justify-center rounded-[3px] text-slate-700 hover:bg-surface-2 hover:text-fg">
        <MoreHorizontal className="size-5" />
      </button>
    )} />
  )
}
