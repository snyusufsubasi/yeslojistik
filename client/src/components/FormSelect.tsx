import { useState } from 'react'
import clsx from 'clsx'
import { History } from 'lucide-react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  options: { value: number; label: string }[]
  placeholder?: string
  disabled?: boolean
  onValueChange?: (value: number) => void
  /** Verilirse son seçilen kayıtlar kutunun üstünde tek tıklık kısayol olarak çıkar (ör. "customers"). */
  recentKey?: string
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
 * Sayısal id seçen kontrollü açılır liste. Seçenekler sonradan (API'den) yüklense bile formdaki değeri gösterir.
 * Boş seçim NaN olarak iletilir (şemalar bunu "seçilmedi" olarak yorumlar).
 */
export function FormSelect<T extends FieldValues>({ control, name, options, placeholder = 'Seçiniz', disabled, onValueChange, recentKey: explicitKey }: Props<T>) {
  const recentKey = explicitKey ?? autoRecent[String(name).split('.').pop() ?? '']
  const { field: { value, onChange, onBlur, ref } } = useController({ control, name })
  const [recent, setRecent] = useState(() => (recentKey ? readRecent(recentKey) : []))
  const v = value as number | null | undefined
  const choose = (n: number) => {
    onChange(n)
    onValueChange?.(n)
    if (recentKey && Number.isFinite(n)) setRecent(pushRecent(recentKey, n))
  }
  const shortcuts = recent.map((id) => options.find((o) => o.value === id)).filter((o): o is { value: number; label: string } => !!o)
  return (
    <div className="space-y-2">
      {shortcuts.length > 0 && !disabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-sm text-slate-600"><History className="size-4" /> Son seçilenler:</span>
          {shortcuts.map((o) => (
            <button key={o.value} type="button" onClick={() => choose(o.value)}
              className={clsx('min-h-9 max-w-[16rem] truncate rounded-full border px-3 text-sm font-semibold transition',
                v === o.value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      <select
        ref={ref}
        name={name}
        className="input"
        disabled={disabled}
        value={v == null || Number.isNaN(v) ? '' : String(v)}
        onBlur={onBlur}
        onChange={(e) => choose(e.target.value === '' ? NaN : Number(e.target.value))}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
