import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronDown, HelpCircle, X } from 'lucide-react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { amountWords, parseAmount } from '../lib/amountWords'
import { todayIso } from '../lib/format'
import { pageHelp } from '../lib/pageHelp'

const moneyFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

interface AmountProps<F extends FieldValues> {
  control: Control<F>
  name: FieldPath<F>
  placeholder?: string
  disabled?: boolean
  /** Tutarın okunuşunu altında göster (varsayılan açık). */
  words?: boolean
  onValueChange?: (v: number) => void
  id?: string
}

/**
 * Büyük tutar kutusu: solda ₺, yazmayı bitirince binlik ayırır (25.000), altında okunuşu yazar
 * ("yirmi beş bin lira"). Değer forma sayı olarak gider.
 */
export function AmountInput<F extends FieldValues>({ control, name, placeholder = '0', disabled, words = true, onValueChange, id }: AmountProps<F>) {
  const { field: { value, onChange, onBlur, ref }, fieldState } = useController({ control, name })
  const num = value as number | null | undefined
  // Yazarken kullanıcının metni tutulur; kutudan çıkınca değer biçimli gösterilir (dışarıdan gelen değişiklikler de böyle görünür).
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? (num == null || Number.isNaN(num) ? '' : moneyFmt.format(num))
  const n = parseAmount(text)
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-500">₺</span>
        <input id={id} ref={ref} name={name} inputMode="decimal" autoComplete="off" disabled={disabled} placeholder={placeholder}
          className={clsx('input pl-9 text-lg font-medium tabular-nums', fieldState.error && 'input-error')}
          value={text}
          onChange={(e) => {
            setDraft(e.target.value)
            const v = parseAmount(e.target.value)
            onChange(v)
            if (!Number.isNaN(v)) onValueChange?.(v)
          }}
          onBlur={() => { setDraft(null); onBlur() }} />
      </div>
      {words && !Number.isNaN(n) && n > 0 && <p className="mt-1 text-sm text-slate-600">Yazıyla: {amountWords(n)}</p>}
    </div>
  )
}

function addYears(iso: string, years: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

interface DateProps<F extends FieldValues> {
  control: Control<F>
  name: FieldPath<F>
  /** Hazır seçenekler: "today" = Bugün/Dün/Yarın, "due" = başlangıca göre +gün, "expiry" = +1/+2/+5 yıl. */
  quick?: 'today' | 'due' | 'expiry' | 'none'
  /** "due" ve "expiry" için başlangıç tarihi (boşsa bugün). */
  from?: string
  dueDays?: number[]
  disabled?: boolean
  id?: string
}

/** Tarih kutusu ve yanında tek tıklık hazır seçenekler ("Bugün", "+30 gün", "+1 yıl"). */
export function DateQuick<F extends FieldValues>({ control, name, quick = 'today', from, dueDays = [15, 30, 60, 90], disabled, id }: DateProps<F>) {
  const { field: { value: raw, onChange, onBlur, ref } } = useController({ control, name })
  const value = (raw as string | null | undefined) ?? ''
  const base = from || todayIso()
  const chips: { label: string; v: string }[] =
    quick === 'today' ? [{ label: 'Bugün', v: todayIso() }, { label: 'Dün', v: addDays(todayIso(), -1) }, { label: 'Yarın', v: addDays(todayIso(), 1) }]
    : quick === 'due' ? dueDays.map((d) => ({ label: `+${d} gün`, v: addDays(base, d) }))
    : quick === 'expiry' ? [1, 2, 5].map((y) => ({ label: `+${y} yıl`, v: addYears(base, y) }))
    : []
  return (
    <div className="space-y-2">
      <input id={id} ref={ref} name={name} type="date" className="input" disabled={disabled}
        value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      {chips.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button key={c.label} type="button" onClick={() => onChange(c.v)}
              className={clsx('min-h-9 rounded-full border px-3 text-sm font-medium transition',
                value === c.v ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}>
              {c.label}
            </button>
          ))}
          {value && quick !== 'today' && (
            <button type="button" onClick={() => onChange('')} className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-sm text-slate-600 hover:bg-slate-100">
              <X className="size-4" /> Temizle
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Form içinde numaralı bölüm başlığı: "1 · Müşteri ve güzergâh". */
export function Section({ n, title, hint, children, className }: { n?: number; title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('space-y-4', className)}>
      <header className="flex items-center gap-3 border-b border-slate-100 pb-2">
        {n != null && <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.9375rem] font-semibold text-white">{n}</span>}
        <div>
          <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
          {hint && <p className="text-sm text-slate-600">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

/** İsteğe bağlı alanlar kapalı durur; "Diğer bilgiler ▾" ile açılır. İçinde hata varsa kendiliğinden açık gelir. */
export function MoreFields({ title = 'Diğer bilgiler (isteğe bağlı)', children, defaultOpen, hasError }: { title?: string; children: ReactNode; defaultOpen?: boolean; hasError?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  const isOpen = open || !!hasError
  return (
    <div className="rounded-xl border border-dashed border-slate-300">
      <button type="button" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen}
        className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left text-[0.9375rem] font-medium text-slate-700 hover:bg-slate-50">
        {title}
        <ChevronDown className={clsx('size-5 transition', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="space-y-4 border-t border-dashed border-slate-300 p-4">{children}</div>}
    </div>
  )
}

/** Sayfa başlığının yanındaki "?" düğmesi: o sayfada ne yapılacağını 3 maddede anlatır. */
export function HelpTip({ page }: { page: string }) {
  const [open, setOpen] = useState(false)
  const help = pageHelp[page]
  if (!help) return null
  return (
    <span className="relative inline-block align-middle">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Bu sayfa ne işe yarar?"
        className="ml-2 inline-flex size-9 items-center justify-center rounded-full text-brand-600 hover:bg-brand-50">
        <HelpCircle className="size-6" />
      </button>
      {open && (
        <span role="dialog" aria-label="Sayfa yardımı" className="absolute left-0 top-11 z-30 block w-[min(24rem,85vw)] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl">
          <span className="mb-2 flex items-center justify-between">
            <span className="text-[0.9375rem] font-semibold text-navy-900">Burada ne yapılır?</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
          </span>
          <span className="block space-y-2">
            {help.map((h, i) => (
              <span key={i} className="flex gap-2.5 text-[0.9375rem] font-normal text-slate-700">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{i + 1}</span>
                <span>{h}</span>
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  )
}
