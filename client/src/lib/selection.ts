import { useMemo, useState } from 'react'

type Key = string | number

/** Listede seçilen satırlar. Sayfa değişince korunur; `resetOn` (filtreler) değişince boşalır. */
export interface RowSelection<T> {
  rows: T[]
  count: number
  isSelected: (row: T) => boolean
  toggle: (row: T) => void
  /** Verilen satırların hepsini seçer (on) ya da seçimden çıkarır. */
  set: (rows: T[], on: boolean) => void
  clear: () => void
}

export function useRowSelection<T>(rowKey: (row: T) => Key, resetOn: unknown[] = []): RowSelection<T> {
  const resetKey = JSON.stringify(resetOn)
  const [state, setState] = useState(() => ({ key: resetKey, map: new Map<Key, T>() }))
  // Filtre değişince seçim effect kullanmadan sıfırlanır (usePage ile aynı yöntem).
  const map = state.key === resetKey ? state.map : null
  const update = (fn: (m: Map<Key, T>) => void) => setState((s) => {
    const next = new Map(s.key === resetKey ? s.map : [])
    fn(next)
    return { key: resetKey, map: next }
  })
  const rows = useMemo(() => (map ? [...map.values()] : []), [map])
  return {
    rows,
    count: rows.length,
    isSelected: (row) => !!map?.has(rowKey(row)),
    toggle: (row) => update((m) => { const k = rowKey(row); if (m.has(k)) m.delete(k); else m.set(k, row) }),
    set: (list, on) => update((m) => { for (const r of list) { if (on) m.set(rowKey(r), r); else m.delete(rowKey(r)) } }),
    clear: () => setState({ key: resetKey, map: new Map() }),
  }
}
