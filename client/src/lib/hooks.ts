import { useCallback, useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { del, errorMessage, get, post, put } from '../api/client'
import type { ListParams, LookupItem, PagedResult } from '../api/types'
import { useToast } from '../components/Toast'

export function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Sayfa numarası; filtreler değişince kendiliğinden 1'e döner (effect kullanmadan). */
export function usePage(filters: unknown[]) {
  const key = JSON.stringify(filters)
  const [state, setState] = useState({ key, page: 1 })
  const page = state.key === key ? state.page : 1
  const setPage = useCallback((p: number) => setState({ key, page: p }), [key])
  return [page, setPage] as const
}

export function usePaged<T>(resource: string, params: ListParams) {
  return useQuery({
    queryKey: [resource, 'list', params],
    queryFn: () => get<PagedResult<T>>(`/${resource}`, params),
    placeholderData: keepPreviousData,
  })
}

export function useLookup(resource: 'customers' | 'vehicles' | 'drivers' | 'suppliers') {
  return useQuery({
    queryKey: [resource, 'lookup'],
    queryFn: () => get<LookupItem[]>(`/${resource}/lookup`),
    staleTime: 60_000,
  })
}

/** Kaydet/sil sonrası ilgili tüm listeleri tazeleyip bildirim gösteren mutation. */
export function useSave<TBody, TResult = unknown>(
  fn: (body: TBody) => Promise<TResult>,
  opts: { invalidate: string[]; success?: string; onSuccess?: (r: TResult) => void; onError?: (e: unknown) => void },
) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      for (const key of [...opts.invalidate, 'dashboard', 'alerts']) qc.invalidateQueries({ queryKey: [key] })
      if (opts.success) toast.success(opts.success)
      opts.onSuccess?.(r)
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      opts.onError?.(e)
    },
  })
}

export const crud = <T, TBody>(resource: string) => ({
  create: (body: TBody) => post<T>(`/${resource}`, body),
  update: (id: number, body: TBody) => put<T>(`/${resource}/${id}`, body),
  remove: (id: number) => del(`/${resource}/${id}`),
})
