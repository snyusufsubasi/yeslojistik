import { useEffect, useId, useRef, useState, type Ref } from 'react'
import clsx from 'clsx'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, todayIso } from '../lib/format'
import { isoToTr, pad, trToIso } from '../lib/dates'

/**
 * Türkçe tarih kutusu: her yerde gg.aa.yyyy (ör. 07.10.2026). Tarayıcının yerel ayarına bağlı `<input type="date">` yerine kullanılır
 * (İngilizce tarayıcıda "mm/dd/yyyy" gösteriyordu). Değer dışarıya her zaman ISO ("2026-10-07") ya da boş ("") olarak gider.
 *  - Yazarken noktalar kendiliğinden gelir ("07102026" → "07.10.2026"); "7.10.26" gibi kısa yazım da kabul edilir.
 *  - Sağdaki takvim düğmesi Türkçe ay takvimi açar (Pazartesi başlar), altında "Bugün" ve "Temizle".
 *  - Geçersiz yazım kutudan çıkınca eski değere döner.
 */
export interface DateInputProps {
  value: string | null | undefined
  onChange: (iso: string) => void
  onBlur?: () => void
  id?: string
  name?: string
  disabled?: boolean
  className?: string
  /** Kutunun kendi sınıfı (varsayılan `input`); filtre çubuğunda çerçevesiz kullanılır. */
  inputClassName?: string
  placeholder?: string
  'aria-label'?: string
  inputRef?: Ref<HTMLInputElement>
  /** Takvim düğmesi gizlensin (dar filtre kutuları). */
  noCalendar?: boolean
}

/** Yazarken: yalnız rakamları alır, 2. ve 4. rakamdan sonra nokta koyar. Kullanıcı nokta yazdıysa onun yazımına dokunmaz. */
function maskTyping(raw: string) {
  if (/[./\-\s]/.test(raw)) return raw.replace(/[^\d./\-\s]/g, '').slice(0, 10)
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
}

export function DateInput({ value, onChange, onBlur, id, name, disabled, className, inputClassName = 'input', placeholder = 'gg.aa.yyyy',
  inputRef, noCalendar, ...rest }: DateInputProps) {
  const iso = value ?? ''
  const [draft, setDraft] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const text = draft ?? isoToTr(iso)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey, true) }
  }, [open])

  const commit = (t: string) => {
    if (!t.trim()) { if (iso) onChange(''); return }
    const parsed = trToIso(t)
    if (parsed && parsed !== iso) onChange(parsed)
  }

  return (
    <div ref={wrap} className={clsx('relative', className)}>
      <input ref={inputRef} id={id} name={name} type="text" inputMode="numeric" autoComplete="off" disabled={disabled}
        aria-label={rest['aria-label']} placeholder={placeholder} maxLength={10}
        className={clsx(inputClassName, 'tabular-nums', !noCalendar && 'pr-10')} value={text}
        onChange={(e) => {
          const next = maskTyping(e.target.value)
          setDraft(next)
          // Tam bir tarih yazıldıysa hemen iletilir (liste süzgeçleri beklemeden güncellensin).
          if (!next) onChange('')
          else if (/^\d{1,2}[./\-\s]\d{1,2}[./\-\s]\d{4}$/.test(next)) { const p = trToIso(next); if (p && p !== iso) onChange(p) }
        }}
        onBlur={() => { if (draft !== null) commit(draft); setDraft(null); onBlur?.() }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft !== null) { commit(draft); setDraft(null) }
          if (e.key === 'ArrowDown' && e.altKey && !noCalendar) { e.preventDefault(); setOpen(true) }
        }} />
      {!noCalendar && (
        <button type="button" tabIndex={-1} disabled={disabled} aria-label="Takvimi aç" aria-expanded={open}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-fg disabled:opacity-40"
          onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); setOpen((o) => !o) }}>
          <CalendarDays className="size-4" />
        </button>
      )}
      {open && <Calendar value={iso} onPick={(v) => { setDraft(null); onChange(v); setOpen(false) }} />}
    </div>
  )
}

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

/** Ay takvimi (Pazartesi başlar). Tıklamalar etiketi (<label>) tetiklemesin diye olaylar burada durdurulur. */
function Calendar({ value, onPick }: { value: string; onPick: (iso: string) => void }) {
  const today = todayIso()
  const start = value || today
  const [ym, setYm] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }))
  const labelId = useId()
  const first = new Date(ym.y, ym.m, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const move = (delta: number) => setYm(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const isoOf = (d: number) => `${ym.y}-${pad(ym.m + 1)}-${pad(d)}`
  return (
    <div role="dialog" aria-labelledby={labelId} data-date-calendar
      className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-line bg-white p-3 shadow-lg"
      onMouseDown={(e) => e.preventDefault()} onClick={(e) => e.preventDefault()}>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Önceki ay" className="flex size-8 items-center justify-center rounded-md hover:bg-surface-2" onClick={() => move(-1)}><ChevronLeft className="size-4" /></button>
        <span id={labelId} className="text-[0.875rem] font-semibold text-fg">{MONTHS[ym.m]} {ym.y}</span>
        <button type="button" aria-label="Sonraki ay" className="flex size-8 items-center justify-center rounded-md hover:bg-surface-2" onClick={() => move(1)}><ChevronRight className="size-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w) => <span key={w} className="py-1 text-[0.6875rem] font-semibold text-muted">{w}</span>)}
        {cells.map((d, i) => d == null ? <span key={`e${i}`} /> : (
          <button key={d} type="button" aria-label={`${pad(d)}.${pad(ym.m + 1)}.${ym.y}`} aria-pressed={isoOf(d) === value}
            className={clsx('h-8 rounded-lg text-[0.8125rem] tabular-nums transition',
              isoOf(d) === value ? 'bg-brand-600 font-semibold text-white'
                : isoOf(d) === today ? 'font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-accent-soft' : 'text-fg hover:bg-surface-2')}
            onClick={() => onPick(isoOf(d))}>{d}</button>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-line pt-2">
        <button type="button" className="rounded-md px-2 py-1 text-[0.8125rem] font-medium text-muted hover:bg-surface-2" onClick={() => onPick('')}>Temizle</button>
        <button type="button" className="rounded-md px-2 py-1 text-[0.8125rem] font-semibold text-brand-700 hover:bg-accent-soft" onClick={() => onPick(today)}>Bugün</button>
      </div>
    </div>
  )
}
