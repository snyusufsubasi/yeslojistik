import clsx from 'clsx'

export function Logo({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 40" className="h-8 w-12 shrink-0" aria-hidden>
        <path d="M2 10h6M0 16h8M4 22h4" stroke={dark ? '#1570cd' : '#fff'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M12 6h28v22H12zM40 13h10l8 8v7H40z" fill={dark ? '#0b2a55' : '#fff'} />
        <circle cx="21" cy="31" r="5" fill="#1e88e5" stroke={dark ? '#fff' : '#0b2a55'} strokeWidth="2" />
        <circle cx="49" cy="31" r="5" fill="#1e88e5" stroke={dark ? '#fff' : '#0b2a55'} strokeWidth="2" />
      </svg>
      <div className="leading-tight">
        <div className={clsx('text-lg font-extrabold italic tracking-tight', dark ? 'text-navy-900' : 'text-white')}>YES LOJİSTİK</div>
        <div className={clsx('text-[10px] italic', dark ? 'text-slate-500' : 'text-blue-100/80')}>Güvenle, Her Yere...</div>
      </div>
    </div>
  )
}
