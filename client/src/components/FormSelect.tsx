import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  options: { value: number; label: string }[]
  placeholder?: string
  disabled?: boolean
  onValueChange?: (value: number) => void
}

/**
 * Sayısal id seçen kontrollü açılır liste. Seçenekler sonradan (API'den) yüklense bile formdaki değeri gösterir.
 * Boş seçim NaN olarak iletilir (şemalar bunu "seçilmedi" olarak yorumlar).
 */
export function FormSelect<T extends FieldValues>({ control, name, options, placeholder = 'Seçiniz', disabled, onValueChange }: Props<T>) {
  const { field: { value, onChange, onBlur, ref } } = useController({ control, name })
  const v = value as number | null | undefined
  return (
    <select
      ref={ref}
      name={name}
      className="input"
      disabled={disabled}
      value={v == null || Number.isNaN(v) ? '' : String(v)}
      onBlur={onBlur}
      onChange={(e) => {
        const n = e.target.value === '' ? NaN : Number(e.target.value)
        onChange(n)
        onValueChange?.(n)
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
