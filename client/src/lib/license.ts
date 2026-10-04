import { useQuery } from '@tanstack/react-query'
import { get } from '../api/client'

export type LicenseState = 'owner' | 'active' | 'grace' | 'expired' | 'invalid'

/** GET /api/license/status */
export interface LicenseStatus {
  state: LicenseState
  plan: string | null
  customer: string | null
  /** 0 = sınırsız */
  vehicleLimit: number
  vehicleCount: number
  expiresAt: string | null
  daysLeft: number | null
  features: string[]
  message: string | null
  /** env = sunucu ayarından (panelden değişmez), db = panelden girilmiş */
  source: 'env' | 'db' | 'none'
  readOnly: boolean
  instanceId: string | null
  graceDays: number
}

export const planLabel: Record<string, string> = {
  Deneme: 'Deneme', Baslangic: 'Başlangıç', Standart: 'Standart', Profesyonel: 'Profesyonel', Kurumsal: 'Kurumsal',
}

export const featureLabel: Record<string, string> = {
  eFatura: 'e-Fatura', uetds: 'UETDS', gps: 'GPS bağlantısı', portal: 'Müşteri portalı',
}

export const stateLabel: Record<LicenseState, string> = {
  owner: 'Sahip modu', active: 'Aktif', grace: 'Ek süre', expired: 'Süresi bitti', invalid: 'Anahtar geçersiz',
}

export const stateTone: Record<LicenseState, 'gray' | 'green' | 'orange' | 'red'> = {
  owner: 'gray', active: 'green', grace: 'orange', expired: 'red', invalid: 'red',
}

export function useLicense() {
  return useQuery({ queryKey: ['license'], queryFn: () => get<LicenseStatus>('/license/status'), staleTime: 60_000, refetchInterval: 10 * 60_000 })
}

/** Üst bantta gösterilecek uyarı; yoksa null. Yalnızca bitişe 14 gün kala, ek süredeyken ve bittikten sonra çıkar. */
export function licenseNotice(s: LicenseStatus | undefined): { tone: 'warn' | 'bad'; text: string } | null {
  if (!s || s.state === 'owner') return null
  const left = s.daysLeft ?? 0
  if (s.state === 'invalid') return { tone: 'bad', text: 'Lisans anahtarı geçersiz: şu an yalnızca görüntüleme yapılabilir.' }
  if (s.state === 'expired') return { tone: 'bad', text: 'Aboneliğiniz bitti: şu an yalnızca görüntüleme yapılabilir.' }
  if (s.state === 'grace') {
    const days = Math.max(1, s.graceDays + left)
    return { tone: 'warn', text: `Aboneliğiniz bitti. ${days} gün içinde yenilenmezse yalnızca görüntüleme yapılabilir.` }
  }
  if (left <= 14) return { tone: 'warn', text: left <= 0 ? 'Aboneliğiniz bugün bitiyor.' : `Aboneliğiniz ${left} gün sonra bitiyor.` }
  return null
}
