const KEY = 'yl.kurulum'

export interface OnboardingState {
  /** Atlanan adımlar */
  skipped: string[]
  /** Ayarlar adımı sihirbazdan kaydedildi */
  invoiceSaved: boolean
  /** "Boş başla" / "Kurulumu bitir" denildi ya da ana sayfadaki kart gizlendi */
  finished: boolean
  /** Ana sayfadaki kurulum kartı "Şimdilik gizle" ile kapatıldı */
  cardHidden: boolean
}

const empty: OnboardingState = { skipped: [], invoiceSaved: false, finished: false, cardHidden: false }

/** Kurulum ilerlemesi tarayıcıda saklanır (yalnız kolaylık: tamamlanma durumu asıl olarak veriden/ayardan çıkarılır). */
export function readOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<OnboardingState>) } : empty
  } catch {
    return empty
  }
}

export function writeOnboarding(patch: Partial<OnboardingState>): OnboardingState {
  const next = { ...readOnboarding(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* depolama kapalı olabilir */ }
  return next
}
