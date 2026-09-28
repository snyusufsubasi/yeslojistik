import { z } from 'zod'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { fieldErrors } from '../api/client'

export const req = (msg: string) => z.string().trim().min(1, msg)
export const optStr = z.string().trim().optional().or(z.literal(''))
export const money = (msg = 'Geçerli bir tutar girin.') =>
  z.number({ error: msg }).min(0, 'Tutar negatif olamaz.').refine((v) => Number.isFinite(v), msg)
export const idField = (msg: string) => z.number({ error: msg }).int().positive(msg)
export const optId = z.number().int().positive().nullable().optional().or(z.nan().transform(() => null))

/** Boş string'leri null'a çevirir (API'ye gönderirken). */
export function nullify<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' || Number.isNaN(v) ? null : v])) as T
}

/** Sunucudan gelen alan hatalarını forma işler. Hiçbir alan eşleşmezse false döner. */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>) {
  const errors = fieldErrors(err)
  let any = false
  for (const [k, msg] of Object.entries(errors)) {
    setError(k as Path<T>, { message: msg })
    any = true
  }
  return any
}
