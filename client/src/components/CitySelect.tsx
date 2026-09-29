import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { cities } from '../lib/cities'
import { SearchSelect } from './FormSelect'

const cityOptions = cities.map((c, i) => ({ value: i + 1, label: c }))

/** İl seçimi: 81 il içinde yazarak arama ("ist" → İstanbul). Forma il adı (metin) olarak yazılır. */
export function CitySelect<F extends FieldValues>({ control, name, placeholder = 'İl yazın' }: { control: Control<F>; name: FieldPath<F>; placeholder?: string }) {
  const { field } = useController({ control, name })
  const i = cities.indexOf((field.value as string | null) ?? '')
  return (
    <SearchSelect name={name} value={i >= 0 ? i + 1 : null} options={cityOptions} placeholder={placeholder}
      onChange={(n) => field.onChange(n ? cities[n - 1] : '')} />
  )
}
