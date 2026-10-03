import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { del, errorMessage, get, post, put } from '../api/client'
import type { ListParams, LookupItem, MirrorStatus, PagedResult } from '../api/types'
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

/** Liste sorgusundan sayfa ve sıralama bilgisini çıkarır: Excel ve toplamlar filtrenin tamamını kullanır. */
export function listFilters(query: object) {
  const { page: _p, pageSize: _s, sort: _o, desc: _d, ...filters } = query as Record<string, unknown>
  return filters
}

/** Filtre toplamı (yalnızca görünen sayfanın değil): /{resource}/totals ucundan. */
export function useListTotals<T>(resource: string, query: object, enabled = true) {
  const filters = listFilters(query)
  return useQuery({
    queryKey: [resource, 'totals', filters],
    queryFn: () => get<T>(`/${resource}/totals`, filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useLookup(resource: 'customers' | 'vehicles' | 'drivers' | 'suppliers' | 'cash-accounts') {
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

/**
 * Adreste ?new=1 varsa (ana sayfadaki kutu ya da üstteki "+ Yeni" menüsünden gelindiyse) formu açar ve parametreyi siler.
 * Sayfa zaten açıkken menüden tekrar seçilirse de çalışır (yalnızca adres değişir, sayfa yeniden kurulmaz).
 */
export function useOpenNewFromUrl(open: () => void) {
  const [params, setParams] = useSearchParams()
  const openRef = useRef(open)
  useEffect(() => { openRef.current = open })
  useEffect(() => {
    if (params.get('new') === null) return
    openRef.current()
    const next = new URLSearchParams(params)
    next.delete('new')
    setParams(next, { replace: true })
  }, [params, setParams])
}

/** Pratikortam aynası durumu: açıkken kayıtlar pratikortam'dan gelir, panelde ekleme/düzenleme kapalıdır. */
export function useMirror() {
  const { data } = useQuery({ queryKey: ['legacy', 'status'], queryFn: () => get<MirrorStatus>('/legacy/status'), staleTime: 60_000 })
  return { mirror: data?.mirrorMode ?? false, status: data }
}
