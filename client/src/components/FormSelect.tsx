import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import { ChevronDown, History, Plus, Search, X } from 'lucide-react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { normalizeSearch } from '../lib/search'

type Option = { value: number; label: string }

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  options: Option[]
  placeholder?: string
  disabled?: boolean
  onValueChange?: (value: number) => void
  /** Verilirse son seçilen kayıtlar kutunun altında tek tıklık kısayol olarak çıkar (ör. "customers"). */
  recentKey?: string
  /** Verilirse listenin sonunda "+ Yeni … ekle" çıkar; yazılan metin yeni kaydın adı olarak gelir. */
  onCreate?: (text: string) => void
  /** "+ Yeni müşteri ekle" gibi düğme yazısı. */
  createLabel?: string
}

const RECENT_MAX = 4
/** Alan adına göre "son seçilenler" listesi: müşteri, araç, şoför, tedarikçi ve hesap seçimlerinde kendiliğinden açıktır. */
const autoRecent: Record<string, string> = {
  customerId: 'customers', vehicleId: 'vehicles', driverId: 'drivers', defaultDriverId: 'drivers',
  supplierId: 'suppliers', carrierSupplierId: 'suppliers', cashAccountId: 'cash-accounts',
}
function readRecent(key: string): number[] {
  try { return (JSON.parse(localStorage.getItem(`yes.recent.${key}`) ?? '[]') as number[]).filter(Number.isFinite) } catch { return [] }
}
function pushRecent(key: string, id: number) {
  const next = [id, ...readRecent(key).filter((x) => x !== id)].slice(0, RECENT_MAX)
  try { localStorage.setItem(`yes.recent.${key}`, JSON.stringify(next)) } catch { /* gizli pencere */ }
  return next
}

/**
 * Aranabilir seçim kutusu: kutuya yazdıkça liste süzülür, ok tuşları ve Enter ile seçilir.
 * Aranan kayıt yoksa (onCreate verildiyse) aynı yerden yeni kayıt eklenir.
 */
export function SearchSelect({ value, onChange, options, placeholder = 'Seçiniz', disabled, name, onCreate, createLabel = 'Yeni ekle', recent = [], ariaLabel, clearable = true }:
  { value: number | null | undefined; onChange: (v: number | null) => void; options: Option[]; placeholder?: string; disabled?: boolean; name?: string
    onCreate?: (text: string) => void; createLabel?: string; recent?: number[]; ariaLabel?: string; clearable?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = value == null || Number.isNaN(value) ? undefined : options.find((o) => o.value === value)

  const shown = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q) {
      // Arama yokken son seçilenler en üstte
      const top = recent.map((id) => options.find((o) => o.value === id)).filter((o): o is Option => !!o)
      return [...top, ...options.filter((o) => !recent.includes(o.value))]
    }
    const words = q.split(' ')
    return options.filter((o) => { const l = normalizeSearch(o.label); return words.every((w) => l.includes(w)) })
      .sort((a, b) => Number(!normalizeSearch(a.label).startsWith(q)) - Number(!normalizeSearch(b.label).startsWith(q)))
  }, [query, options, recent])
  const canCreate = !!onCreate && !(query && shown.some((o) => normalizeSearch(o.label) === normalizeSearch(query)))
  const count = shown.length + (canCreate ? 1 : 0)

  const close = () => { setOpen(false); setQuery('') }
  const choose = (o: Option) => { onChange(o.value); close(); inputRef.current?.blur() }
  const create = () => { const t = query.trim(); close(); onCreate?.(t) }
  const openList = () => { if (disabled) return; setOpen(true); setActive(0) }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return openList()
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + count) % Math.max(count, 1))
    } else if (e.key === 'Enter') {
      if (!open) return
      e.preventDefault()
      if (active < shown.length) choose(shown[active])
      else if (canCreate) create()
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation()
      close()
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input ref={inputRef} name={name} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-label={ariaLabel}
        aria-activedescendant={open && count ? `${listId}-${active}` : undefined}
        autoComplete="off" disabled={disabled}
        className={clsx('input pl-9 pr-16', selected && !open && 'placeholder:text-slate-900')}
        placeholder={selected ? selected.label : open ? 'Yazarak arayın…' : placeholder}
        value={open ? query : selected?.label ?? ''}
        onFocus={openList} onClick={openList}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true) }}
        onBlur={close} onKeyDown={onKeyDown} />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        {clearable && selected && !disabled && (
          <button type="button" tabIndex={-1} aria-label="Seçimi temizle" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(null); close() }}><X className="size-4" /></button>
        )}
        <ChevronDown className="pointer-events-none size-4 text-slate-500" />
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label={ariaLabel ?? placeholder}
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}>
          {shown.map((o, i) => (
            <li key={o.value} id={`${listId}-${i}`} role="option" aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)} onClick={() => choose(o)}
              className={clsx('flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2', i === active && 'bg-slate-100', o.value === value && 'font-medium text-brand-700')}>
              {!query && recent.includes(o.value) && <History aria-hidden className="size-4 shrink-0 text-slate-400" />}
              <span className="min-w-0 break-words">{o.label}</span>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-2 text-slate-500">“{query}” bulunamadı.</li>}
          {canCreate && (
            <li id={`${listId}-${shown.length}`} role="option" aria-selected={false} onMouseEnter={() => setActive(shown.length)} onClick={create}
              className={clsx('mt-1 flex cursor-pointer items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2.5 font-medium text-brand-700', active === shown.length && 'bg-brand-50')}>
              <Plus className="size-4 shrink-0" />{query.trim() ? `“${query.trim()}” — ${createLabel}` : createLabel}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/**
 * Sayısal id seçen, forma bağlı aranabilir kutu. Seçenekler sonradan (API'den) yüklense bile formdaki değeri gösterir.
 * Boş seçim NaN olarak iletilir (şemalar bunu "seçilmedi" olarak yorumlar).
 */
export function FormSelect<T extends FieldValues>({ control, name, options, placeholder = 'Seçiniz', disabled, onValueChange, recentKey: explicitKey, onCreate, createLabel }: Props<T>) {
  const recentKey = explicitKey ?? autoRecent[String(name).split('.').pop() ?? '']
  const { field: { value, onChange } } = useController({ control, name })
  const [recent, setRecent] = useState(() => (recentKey ? readRecent(recentKey) : []))
  const v = value as number | null | undefined
  const choose = (n: number) => {
    onChange(n)
    onValueChange?.(n)
    if (recentKey && Number.isFinite(n)) setRecent(pushRecent(recentKey, n))
  }
  const shortcuts = recent.map((id) => options.find((o) => o.value === id)).filter((o): o is Option => !!o).filter((o) => o.value !== v)
  return (
    <div className="space-y-2">
      <SearchSelect name={name} value={v} options={options} placeholder={placeholder} disabled={disabled} recent={recent}
        onChange={(n) => choose(n ?? NaN)} onCreate={onCreate} createLabel={createLabel} />
      {shortcuts.length > 0 && !disabled && (v == null || Number.isNaN(v)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-sm text-slate-500"><History className="size-4" /> Son seçilenler:</span>
          {shortcuts.map((o) => (
            <button key={o.value} type="button" onClick={() => choose(o.value)}
              className="min-h-8 max-w-[16rem] truncate rounded-full border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
