import type { ReactNode } from 'react'

export interface ChoiceOption<T extends string | number> {
  value: T
  label: string
  icon?: ReactNode
  hint?: string
}

/** Etiket haritasından (lib/labels) seçenek listesi; ikonlar isteğe bağlı. */
export function choices<T extends string>(labels: Record<T, string>, icons?: Partial<Record<T, ReactNode>>, hints?: Partial<Record<T, string>>): ChoiceOption<T>[] {
  return (Object.keys(labels) as T[]).map((k) => ({ value: k, label: labels[k], icon: icons?.[k], hint: hints?.[k] }))
}
