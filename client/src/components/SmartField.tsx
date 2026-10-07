import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown, PencilLine, X } from 'lucide-react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { normalizeSearch } from '../lib/search'
import { mergeOptions, sectorOptions, useOptionUsage, type OptionField, type SectorOption, type SmartOption } from '../lib/sectorOptions'

export interface SmartFieldProps {
  /** Sunucudaki alan adı: kullanım sıklığı buradan gelir; sektör listesi de bu adla seçilir. */
  field: OptionField
  value: string | null | undefined
  onChange: (value: string) => void
  /** Alanın adı (ör. "Yük Cinsi"). Alt düğmelerin adlarına bilerek eklenmez: getByLabel('Yük Cinsi') yalnız yazı kutusunu bulsun. */
  label: string
  /** Bağlama özel öneriler en başa gelir (ör. seçilen müşterinin son yük cinsleri). */
  preferred?: string[]
  /** Sektör listesi yerine başka bir liste (verilmezse `sectorOptions[field]`). */
  sector?: SectorOption[]
  /** Tek dokunuşluk çip sayısı (5-6). */
  chips?: number
  placeholder?: string
  name?: string
  disabled?: boolean
  maxLength?: number
  id?: string
  inputClassName?: string
  onBlur?: () => void
  autoFocus?: boolean
}

/**
 * "Akıllı alan": hem şıklı hem yazılı.
 *  - Üstte en sık 5-6 seçenek tek dokunuşla seçilen çipler; "Diğer…" yazı kutusuna götürür.
 *  - Altında yazı kutusu: yazılan değer aynen kaydedilir (listede olmasa da).
 *  - Kutuya odaklanınca bütün seçenekler aranabilir listede açılır (önce firmanın kendi kullandıkları, sonra sektörde yaygın olanlar).
 * Çipler Tab sırasına girmez (fareyle/dokunarak seçilir); klavyede ok tuşları + Enter listeden seçer.
 */
export function SmartField({ field, value, onChange, label, preferred, sector, chips = 6, placeholder, name, disabled, maxLength = 200, id,
  inputClassName, onBlur, autoFocus }: SmartFieldProps) {
  const usage = useOptionUsage(field)
  const all = useMemo(() => mergeOptions(usage.data, sector ?? sectorOptions[field], preferred), [usage.data, sector, field, preferred])
  const current = (value ?? '').toString()
  const [open, setOpen] = useState(false)
  // Kullanıcı listeyi açıkça istediyse (ok tuşu / ▾) tam eşleşmede de açık kalır.
  const [forced, setForced] = useState(false)
  // Kutuya yazılan arama: liste yazıya göre süzülür. Seçim yapınca/odaktan çıkınca sıfırlanır.
  const [query, setQuery] = useState<string | null>(null)
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const top = all.slice(0, chips)
  const isTop = top.some((o) => same(o.value, current))
  const shown = useMemo(() => {
    const q = normalizeSearch(query ?? '')
    if (!q) return all
    const words = q.split(' ')
    return all.filter((o) => { const l = normalizeSearch(o.value); return words.every((w) => l.includes(w)) })
      .sort((a, b) => Number(!normalizeSearch(a.value).startsWith(q)) - Number(!normalizeSearch(b.value).startsWith(q)))
  }, [all, query])
  const typed = (query ?? '').trim()
  const offerCustom = !!typed && !all.some((o) => same(o.value, typed))
  const count = shown.length + (offerCustom ? 1 : 0)
  // Yazılan değer bir seçenekle birebir aynıysa ya da hiç eşleşme yoksa liste kendiliğinden kapanır:
  // değer zaten tamam (ya da yazıldığı gibi kaydedilecek) ve liste alttaki alanların üstünü örtmez.
  const exact = !!typed && all.some((o) => same(o.value, typed))
  const showList = open && shown.length > 0 && (forced || !exact)

  const close = () => { setOpen(false); setForced(false); setQuery(null); setActive(-1) }
  const choose = (v: string) => { onChange(v); close() }
  const focusInput = () => { inputRef.current?.focus(); setOpen(true) }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!showList) { setOpen(true); setForced(true); setActive(0); return }
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + count) % Math.max(count, 1))
    } else if (e.key === 'Enter') {
      // Yazdıktan sonraki ilk Enter yazılanı onaylar (formu göndermez); ikinci Enter her alandaki gibi formu gönderir.
      if (!showList) {
        if (query !== null) { e.preventDefault(); close() }
        return
      }
      // Enter formu göndermesin: liste açıkken seçimi tamamlar (vurgulanan seçenek ya da yazıldığı gibi).
      e.preventDefault()
      if (active >= 0 && active < shown.length) choose(shown[active].value)
      else close()
    } else if (e.key === 'Escape' && showList) {
      e.stopPropagation()
      close()
    } else if (e.key === 'Tab' && showList && active >= 0 && active < shown.length) {
      onChange(shown[active].value)
      close()
    }
  }

  return (
    // Çipler görünürde yazı kutusunun ÜSTÜNDE (order-first): açılan liste aşağı açılır ve çipleri örtmez.
    // DOM'da kutu önce gelir: <label> içindeki ilk alan kutu olsun (etikete tıklayınca kutuya gider, getByLabel kutuyu bulur).
    <div className="flex flex-col gap-2" data-smart-field={field} data-label={label}>
      <div className="relative">
        <input ref={inputRef} id={id} name={name} role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off" disabled={disabled} maxLength={maxLength} autoFocus={autoFocus}
          className={clsx('input pr-16', inputClassName)} placeholder={placeholder ?? 'Seçin veya yazın…'}
          value={current}
          onFocus={() => { if (!disabled) setOpen(true) }}
          onClick={() => { if (!disabled) setOpen(true) }}
          onChange={(e) => { onChange(e.target.value); setQuery(e.target.value); setActive(-1); setOpen(true); setForced(false) }}
          onBlur={() => { close(); onBlur?.() }}
          onKeyDown={onKeyDown} />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {current && !disabled && (
            <button type="button" tabIndex={-1} aria-label="Seçimi temizle" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(''); focusInput() }}><X className="size-4" /></button>
          )}
          <button type="button" tabIndex={-1} aria-label="Bütün seçenekler" disabled={disabled}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            onMouseDown={(e) => e.preventDefault()} onClick={() => (showList ? close() : (focusInput(), setForced(true)))}>
            <ChevronDown className={clsx('size-4 transition-transform', showList && 'rotate-180')} />
          </button>
        </div>
        {showList && (
          <ul id={listId} role="listbox" aria-label="Seçenekler"
            className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
            // Liste bir <label> içinde: tıklama etikete ulaşıp kutuyu yeniden açmasın.
            onClick={(e) => e.preventDefault()}>
            {shown.map((o, i) => (
              <Row key={o.value} o={o} id={`${listId}-${i}`} active={i === active} selected={same(o.value, current)}
                first={i === 0 || group(shown[i - 1]) !== group(o)} onHover={() => setActive(i)} onPick={() => choose(o.value)} />
            ))}
            {offerCustom && (
              <li id={`${listId}-${shown.length}`} role="option" aria-selected={false} onMouseEnter={() => setActive(shown.length)} onClick={() => choose(typed)}
                className={clsx('mt-1 flex cursor-pointer items-center gap-2 rounded-lg border-t border-line px-3 py-2 font-medium text-brand-700',
                  active === shown.length && 'bg-brand-50')}>
                <PencilLine className="size-4 shrink-0" /> “{typed}” yazdığım gibi kullan
              </li>
            )}
          </ul>
        )}
      </div>
      {!disabled && (
        <div className="order-first flex flex-wrap gap-1.5" role="group" aria-label="Hızlı seçim">
          {top.map((o) => {
            const on = same(o.value, current)
            return (
              <button key={o.value} type="button" tabIndex={-1} aria-pressed={on} title={o.hint}
                onClick={() => onChange(on ? '' : o.value)}
                className={clsx('inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors duration-150',
                  on ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-slate-700 hover:border-slate-300 hover:bg-surface-2')}>
                {on && <Check aria-hidden className="size-3.5" />}{o.value}
              </button>
            )
          })}
          {current && !isTop ? (
            <button type="button" tabIndex={-1} aria-pressed onClick={focusInput}
              className="inline-flex min-h-8 max-w-[16rem] items-center gap-1 truncate rounded-full border border-brand-600 bg-brand-600 px-3 text-[0.8125rem] font-medium text-white">
              <Check aria-hidden className="size-3.5 shrink-0" /><span className="truncate">{current}</span>
            </button>
          ) : (
            <button type="button" tabIndex={-1} onClick={() => { if (isTop) onChange(''); focusInput() }}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 text-[0.8125rem] font-medium text-slate-600 transition-colors duration-150 hover:border-slate-400 hover:bg-surface-2">
              Diğer…
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR') && b.trim() !== ''
const group = (o: SmartOption) => (o.preferred ? 'preferred' : o.count > 0 ? 'usage' : 'sector')
const groupTitle = { preferred: 'Bu kayıt için önerilen', usage: 'Sık kullandıklarınız', sector: 'Sektörde yaygın' }

function Row({ o, id, active, selected, first, onHover, onPick }:
  { o: SmartOption; id: string; active: boolean; selected: boolean; first: boolean; onHover: () => void; onPick: () => void }) {
  return (<>
    {first && <li role="presentation" className="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold text-muted">{groupTitle[group(o)]}</li>}
    <li id={id} role="option" aria-selected={selected} onMouseEnter={onHover} onClick={onPick}
      className={clsx('flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5', active && 'bg-surface-2', selected && 'font-semibold text-brand-700')}>
      <span className="min-w-0 flex-1 break-words">{o.value}{o.hint && <span className="ml-1.5 text-[0.8125rem] font-normal text-muted">{o.hint}</span>}</span>
      {o.count > 0 && <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">{o.count} kez</span>}
      {selected && <Check aria-hidden className="size-4 shrink-0" />}
    </li>
  </>)
}

type ControlledSmartFieldProps<F extends FieldValues> = Omit<SmartFieldProps, 'value' | 'onChange' | 'name' | 'onBlur'> & {
  control: Control<F>
  name: FieldPath<F>
  onValueChange?: (v: string) => void
}

/** react-hook-form alanına bağlı akıllı alan. Boş değer '' olarak tutulur (şemalar boşu "girilmedi" sayar). */
export function ControlledSmartField<F extends FieldValues>({ control, name, onValueChange, ...rest }: ControlledSmartFieldProps<F>) {
  const { field } = useController({ control, name })
  return (
    <SmartField {...rest} name={name} value={(field.value as string | null | undefined) ?? ''} onBlur={field.onBlur}
      onChange={(v) => { field.onChange(v); onValueChange?.(v) }} />
  )
}
