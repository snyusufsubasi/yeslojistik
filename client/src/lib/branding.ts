import { useQuery } from '@tanstack/react-query'
import { get } from '../api/client'

export interface Branding {
  companyName: string
  logoDataUrl?: string | null
}

const KEY = 'yl.brand'
/** Ürünün kendi adı: firma adı ayarda hiç değiştirilmediyse (ya da boşsa) eski görünüm (sarı "YES" kutusu) korunur. */
const DEFAULT_NAME = 'YES Lojistik'

const fold = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim()

export function isDefaultBrand(name?: string | null) {
  return !name || fold(name) === fold(DEFAULT_NAME)
}

/** Ad ve logo; sayfa açılırken titremesin diye son bilinen değer tarayıcıda saklanır (yalnız kolaylık, sunucu asıl kaynak). */
function remembered(): Branding | undefined {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Branding) : undefined
  } catch {
    return undefined
  }
}

function remember(b: Branding) {
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* depolama kapalı ya da dolu olabilir */ }
}

export const brandingKey = ['public', 'branding'] as const

export function useBranding() {
  const { data } = useQuery({
    queryKey: brandingKey,
    queryFn: async () => {
      const b = await get<Branding>('/public/branding')
      remember(b)
      return b
    },
    initialData: remembered,
    initialDataUpdatedAt: 0, // saklı değer hemen eskimiş sayılır: sayfa açılınca sunucudan tazelenir
    staleTime: 60_000,
  })
  const name = data?.companyName?.trim() || DEFAULT_NAME
  const isDefault = isDefaultBrand(name)
  return {
    /** Ekranda gösterilecek ad ("YES LOJİSTİK" kayıtlı olsa bile "YES Lojistik"). */
    name: isDefault ? DEFAULT_NAME : name,
    isDefault,
    logo: data?.logoDataUrl ?? null,
    initials: initials(name),
  }
}

/** "Örnek Taşımacılık A.Ş." → "ÖT" (en çok iki harf). */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w))
  const letters = words.slice(0, 2).map((w) => w[0].toLocaleUpperCase('tr-TR')).join('')
  return letters || '•'
}
