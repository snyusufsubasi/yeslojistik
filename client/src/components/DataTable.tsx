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
              className={clsx('px-4 py-3', onRowClick && 'cursor-pointer active:bg-slate-50')}>
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
                        {active && (desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
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
                className={clsx(onRowClick && 'cursor-pointer', 'hover:bg-slate-50', rowClassName?.(row))}>
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
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-slate-600">
          <span>Toplam {total} kayıt</span>
          <div className="flex items-center gap-1">
            <button className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-100 disabled:opacity-30" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Önceki sayfa">
              <ChevronLeft className="size-5" />
            </button>
            <span>Sayfa {page} / {pages}</span>
            <button className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-100 disabled:opacity-30" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Sonraki sayfa">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Ara...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-8" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  )
}
