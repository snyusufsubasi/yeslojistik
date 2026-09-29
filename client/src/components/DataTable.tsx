import type { ReactNode } from 'react'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Empty, Spinner } from './ui'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  sortKey?: string
  align?: 'left' | 'right' | 'center'
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  loading?: boolean
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  sort?: string
  desc?: boolean
  onSort?: (key: string, desc: boolean) => void
  page?: number
  pageSize?: number
  total?: number
  onPage?: (page: number) => void
  empty?: ReactNode
  footer?: ReactNode
  rowClassName?: (row: T) => string | undefined
  /** Verilirse telefonda (sm altı) tablo yerine bu kartlar gösterilir. */
  mobileCard?: (row: T) => ReactNode
}

export function DataTable<T>({ columns, rows, loading, rowKey, onRowClick, sort, desc, onSort, page = 1, pageSize = 20,
  total, onPage, empty, footer, rowClassName, mobileCard }: Props<T>) {
  const pages = total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : 1
  return (
    <div>
      {mobileCard && rows && rows.length > 0 && (
        <ul className={clsx('divide-y divide-slate-100 sm:hidden', loading && 'opacity-50')}>
          {rows.map((row) => (
            <li key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx('px-4 py-3.5', onRowClick && 'cursor-pointer active:bg-brand-50')}>
              {mobileCard(row)}
            </li>
          ))}
        </ul>
      )}
      <div className={clsx('overflow-x-auto', mobileCard && 'hidden sm:block')}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = c.sortKey && sort === c.sortKey
                return (
                  <th key={c.key} className={clsx('th', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                    {c.sortKey && onSort ? (
                      <button className="inline-flex items-center gap-1 hover:text-slate-900"
                        onClick={() => onSort(c.sortKey!, active ? !desc : false)}>
                        {c.header}
                        {active && (desc ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />)}
                      </button>
                    ) : c.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className={clsx(loading && rows && 'opacity-50')}>
            {rows?.map((row) => (
              <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx('even:bg-slate-50/50', onRowClick ? 'cursor-pointer hover:bg-brand-50' : 'hover:bg-slate-50', rowClassName?.(row))}>
                {columns.map((c) => (
                  <td key={c.key} className={clsx('td', c.align === 'right' && 'whitespace-nowrap text-right tabular-nums', c.align === 'center' && 'text-center', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
      {!rows && loading && <Spinner />}
      {rows && rows.length === 0 && <Empty>{empty}</Empty>}
      {onPage && total !== undefined && total > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[0.9375rem] text-slate-700">
          <span>Toplam <b>{total}</b> kayıt</span>
          <div className="flex items-center gap-2">
            <button className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 font-medium hover:bg-slate-50 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Önceki sayfa">
              <ChevronLeft className="size-5" /><span className="hidden sm:inline">Önceki</span>
            </button>
            <span className="px-1">Sayfa {page} / {pages}</span>
            <button className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 font-medium hover:bg-slate-50 disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Sonraki sayfa">
              <span className="hidden sm:inline">Sonraki</span><ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Ara...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
      <input className="input pl-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  )
}
