import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Empty, Spinner } from './ui'
import { useRowSelection, type RowSelection } from '../lib/selection'

/** Seçim sütunu eklenince sayfanın verdiği toplam satırı (<tr>) da bir hücre kaydırılır. */
function withLeadingCell(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child
    const el = child as ReactElement<{ children?: ReactNode }>
    if (el.type === 'tr') return cloneElement(el, {}, <td className="td" aria-hidden />, el.props.children)
    return el.props.children !== undefined && typeof el.type !== 'string' ? cloneElement(el, {}, withLeadingCell(el.props.children)) : el
  })
}

function SelectBox({ checked, indeterminate, label, onChange }: { checked: boolean; indeterminate?: boolean; label: string; onChange: () => void }) {
  return (
    <input type="checkbox" className="size-[1.125rem] cursor-pointer rounded accent-brand-600" aria-label={label}
      checked={checked} onChange={onChange} ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked }} />
  )
}

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
  /** Satırlar seçilebilir: başta onay kutusu sütunu, seçim varken altta işlem çubuğu. */
  selectable?: boolean
  /** Seçimi sayfa yönetir (useRowSelection). Verilmezse tablo kendi seçimini tutar. */
  selection?: RowSelection<T>
  /** Kendi seçiminde: bu değer (ör. filtreler) değişince seçim boşalır. */
  selectionResetKey?: unknown
  /** İşlem çubuğundaki düğmeler; seçilen satırlarla çağrılır (sayfalar arası seçim dahil). */
  bulkActions?: (rows: T[]) => ReactNode
  /** Onay kutusunun ekran okuyucu adı, ör. "Sefer 978". */
  rowLabel?: (row: T) => string
}

export function DataTable<T>({ columns, rows, loading, rowKey, onRowClick, sort, desc, onSort, page = 1, pageSize = 20,
  total, onPage, empty, footer, rowClassName, mobileCard, selectable, selection, selectionResetKey, bulkActions, rowLabel }: Props<T>) {
  const pages = total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const own = useRowSelection(rowKey, [selectionResetKey])
  const sel = selection ?? (selectable ? own : undefined)
  const pageRows = rows ?? []
  const pageSelected = sel ? pageRows.filter((r) => sel.isSelected(r)).length : 0
  const allOnPage = pageRows.length > 0 && pageSelected === pageRows.length
  const togglePage = () => sel?.set(pageRows, !allOnPage)
  const label = (row: T) => `Seç: ${rowLabel ? rowLabel(row) : `kayıt ${rowKey(row)}`}`
  return (
    <div>
      {mobileCard && rows && rows.length > 0 && (
        <ul className={clsx('divide-y divide-slate-100 sm:hidden', loading && 'opacity-50')}>
          {sel && (
            <li className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 text-[0.9375rem] text-slate-700">
              <label className="flex cursor-pointer items-center gap-3">
                <SelectBox checked={allOnPage} indeterminate={pageSelected > 0} label="Bu sayfadaki tüm kayıtları seç" onChange={togglePage} />
                Bu sayfadakilerin tümü
              </label>
            </li>
          )}
          {rows.map((row) => (
            <li key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx('px-4 py-3.5', onRowClick && 'cursor-pointer active:bg-brand-50', sel && 'flex items-start gap-3', sel?.isSelected(row) && 'bg-brand-50/70')}>
              {sel && (
                <label className="-my-3.5 -ml-4 flex cursor-pointer self-stretch py-3.5 pl-4 pr-1" onClick={(e) => e.stopPropagation()}>
                  <SelectBox checked={sel.isSelected(row)} label={label(row)} onChange={() => sel.toggle(row)} />
                </label>
              )}
              {sel ? <div className="min-w-0 flex-1">{mobileCard(row)}</div> : mobileCard(row)}
            </li>
          ))}
        </ul>
      )}
      <div className={clsx('overflow-x-auto', mobileCard && 'hidden sm:block')}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {sel && (
                <th className="th w-10 pr-0">
                  <SelectBox checked={allOnPage} indeterminate={pageSelected > 0} label="Bu sayfadaki tüm kayıtları seç" onChange={togglePage} />
                </th>
              )}
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
              <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} aria-selected={sel ? sel.isSelected(row) : undefined}
                className={clsx('even:bg-slate-50/50', onRowClick ? 'cursor-pointer hover:bg-brand-50' : 'hover:bg-slate-50', sel?.isSelected(row) && 'bg-brand-50/70!', rowClassName?.(row))}>
                {sel && (
                  <td className="td w-10 p-0" onClick={(e) => e.stopPropagation()}>
                    <label className="flex cursor-pointer items-center justify-center px-3 py-3.5">
                      <SelectBox checked={sel.isSelected(row)} label={label(row)} onChange={() => sel.toggle(row)} />
                    </label>
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={clsx('td', c.align === 'right' && 'whitespace-nowrap text-right tabular-nums', c.align === 'center' && 'text-center', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{sel ? withLeadingCell(footer) : footer}</tfoot>}
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
      {sel && sel.count > 0 && (
        <div role="region" aria-label="Seçilen kayıtlar"
          className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 mx-2 mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white shadow-lg lg:bottom-4">
          <span className="mr-auto text-[0.9375rem] font-medium" aria-live="polite">{sel.count} kayıt seçildi</span>
          {bulkActions?.(sel.rows)}
          <button type="button" onClick={sel.clear}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white">
            <X className="size-4" />Seçimi kaldır
          </button>
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
