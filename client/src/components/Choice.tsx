import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'

import type { ChoiceOption } from '../lib/choices'

interface ChoiceProps<T extends string | number> {
  options: ChoiceOption<T>[]
  value: T | '' | null | undefined
  onChange: (v: T) => void
  /** Ekran okuyucu ve testler için grup adı (ör. "Ödeme yöntemi"). */
  label: string
  /** Kart görünümünde sütun sayısı (telefonda en fazla 2). */
  columns?: 2 | 3 | 4 | 5
  disabled?: boolean
  name?: string
}

const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' }

/** Ok tuşlarıyla seçenekler arasında gezinme (radiogroup davranışı). */
function useArrowKeys<T extends string | number>(options: ChoiceOption<T>[], value: ChoiceProps<T>['value'], onChange: (v: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (i + step + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  const tabIndex = (i: number) => {
    const selected = options.findIndex((o) => o.value === value)
    return (selected === -1 ? i === 0 : i === selected) ? 0 : -1
  }
  return { refs, onKeyDown, tabIndex }
}

/**
 * Şık usulü seçim: az seçenekli alanlar (ödeme yöntemi, gider türü, sahiplik…) açılır liste yerine
 * büyük, ikonlu kartlarla tek tıkla seçilir. Seçili kart mavi çerçeve ve ✓ ile belli olur.
 */
export function ChoiceCards<T extends string | number>({ options, value, onChange, label, columns = 3, disabled, name }: ChoiceProps<T>) {
  const { refs, onKeyDown, tabIndex } = useArrowKeys(options, value, onChange)
  return (
    <div role="radiogroup" aria-label={label} data-name={name} className={clsx('grid grid-cols-2 gap-2.5', cols[columns])}>
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={active} disabled={disabled}
            ref={(el) => { refs.current[i] = el }} tabIndex={tabIndex(i)} onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(o.value)}
            className={clsx('relative flex min-h-14 items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition disabled:opacity-50',
              active ? 'border-brand-600 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
            {o.icon && (
              <span className={clsx('flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5',
                active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>{o.icon}</span>
            )}
            <span className="min-w-0 flex-1 leading-tight">
              <span className={clsx('block text-base', active ? 'font-bold text-brand-800' : 'font-semibold text-slate-800')}>{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-sm text-slate-600">{o.hint}</span>}
            </span>
            {active && <Check aria-hidden className="absolute right-2 top-2 size-4 text-brand-600" />}
          </button>
        )
      })}
    </div>
  )
}

/** Şık usulü seçimin kompakt hali: yan yana hap düğmeler (KDV oranı, yük birimi, vade günü…). */
export function ChoiceChips<T extends string | number>({ options, value, onChange, label, disabled, name }: Omit<ChoiceProps<T>, 'columns'>) {
  const { refs, onKeyDown, tabIndex } = useArrowKeys(options, value, onChange)
  return (
    <div role="radiogroup" aria-label={label} data-name={name} className="flex flex-wrap gap-2">
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={active} disabled={disabled}
            ref={(el) => { refs.current[i] = el }} tabIndex={tabIndex(i)} onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(o.value)}
            className={clsx('inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-base transition disabled:opacity-50 [&_svg]:size-4',
              active ? 'border-brand-600 bg-brand-600 font-semibold text-white shadow-sm' : 'border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50')}>
            {active ? <Check aria-hidden /> : o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

interface ControlledProps<F extends FieldValues, T extends string | number> {
  control: Control<F>
  name: FieldPath<F>
  options: ChoiceOption<T>[]
  label: string
  variant?: 'cards' | 'chips'
  columns?: ChoiceProps<T>['columns']
  disabled?: boolean
  onValueChange?: (v: T) => void
}

/** react-hook-form alanına bağlı şık usulü seçim. */
export function ControlledChoice<F extends FieldValues, T extends string | number>(
  { control, name, options, label, variant = 'cards', columns, disabled, onValueChange }: ControlledProps<F, T>) {
  const { field } = useController({ control, name })
  const onChange = (v: T) => { field.onChange(v); onValueChange?.(v) }
  return variant === 'chips'
    ? <ChoiceChips options={options} value={field.value as T} onChange={onChange} label={label} disabled={disabled} name={name} />
    : <ChoiceCards options={options} value={field.value as T} onChange={onChange} label={label} columns={columns} disabled={disabled} name={name} />
}

interface ToggleProps<F extends FieldValues> {
  control: Control<F>
  name: FieldPath<F>
  label: string
  /** Doğru ve yanlış seçeneklerin yazısı, ör. ['Aktif', 'Pasif']. */
  labels: [string, string]
  icons?: [ReactNode, ReactNode]
  variant?: 'cards' | 'chips'
  disabled?: boolean
}

/** Onay kutusu yerine iki şıklı seçim (Aktif / Pasif, e-Fatura / e-Arşiv, Ödendi / Vadeli): ne seçildiği hep yazıyla görünür. */
export function ControlledToggle<F extends FieldValues>({ control, name, label, labels, icons, variant = 'chips', disabled }: ToggleProps<F>) {
  const { field } = useController({ control, name })
  const options: ChoiceOption<'yes' | 'no'>[] = [
    { value: 'yes', label: labels[0], icon: icons?.[0] },
    { value: 'no', label: labels[1], icon: icons?.[1] },
  ]
  const value = field.value ? 'yes' : 'no'
  const onChange = (v: 'yes' | 'no') => field.onChange(v === 'yes')
  return variant === 'cards'
    ? <ChoiceCards options={options} value={value} onChange={onChange} label={label} columns={2} disabled={disabled} name={name} />
    : <ChoiceChips options={options} value={value} onChange={onChange} label={label} disabled={disabled} name={name} />
}
