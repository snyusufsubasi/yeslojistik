import type { ReactNode } from 'react'
import clsx from 'clsx'

export interface SumItem { label: ReactNode; value: ReactNode; tone?: string }

/**
 * "Kazanç şeridi" (docs/TASARIM-HARK.md): yan yana kutular, aralarında ince dikey çizgi.
 * Etiket 12px sakin, değer eşit genişlikli rakamlarla 15px. `end` kutusu sağa yaslı durur; `highlight` ise bill-soft zeminli
 * ("Faturası kesilecek" gibi yapılacak iş). Telefonda iki sütunlu ızgara olur, sağdaki kutu tam satır.
 * Sevkiyatlar ve Faturalar listelerinde kullanılır.
 */
export function SumStrip({ items, end, label }: {
  items: SumItem[]
  end?: { label: ReactNode; value?: ReactNode; highlight?: boolean; onClick?: () => void; title?: string; note?: boolean }
  label: string
}) {
  const box = 'flex min-w-0 flex-col justify-between border-b border-line px-4 py-2.5 odd:border-r sm:border-b-0 sm:border-r'
  return (
    <div aria-label={label} className="grid grid-cols-2 border-b border-line bg-white sm:flex sm:flex-wrap sm:items-stretch">
      {items.map((i, n) => (
        <div key={n} className={box}>
          <div className="text-[0.75rem] font-medium leading-tight text-muted">{i.label}</div>
          <div className={clsx('mt-0.5 truncate font-mono text-[0.9375rem] font-semibold leading-snug tracking-[-0.02em]', i.tone ?? 'text-fg')}>{i.value}</div>
        </div>
      ))}
      {end && (() => {
        const cls = clsx('col-span-2 min-w-0 px-4 py-2.5 text-left sm:col-span-1 sm:ml-auto',
          end.note ? 'self-center sm:flex-1 sm:basis-48 sm:text-right' : 'sm:border-l sm:border-line', end.highlight ? 'bg-bill-soft text-bill' : 'text-muted')
        const body = end.note
          ? <div className="text-[0.78125rem] leading-snug">{end.label}</div>
          : <>
            <div className="text-[0.75rem] font-medium leading-tight">{end.label}</div>
            <div className="mt-0.5 truncate font-mono text-[0.9375rem] font-semibold leading-snug tracking-[-0.02em]">{end.value}</div>
          </>
        return end.onClick
          ? <button type="button" title={end.title} onClick={end.onClick} className={clsx(cls, 'transition hover:brightness-[.97]')}>{body}</button>
          : <div className={cls}>{body}</div>
      })()}
    </div>
  )
}
