import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import { Loader2, X } from 'lucide-react'
import type { Tone } from '../lib/labels'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      className={clsx('inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm', variants[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button title={label} aria-label={label}
      className={clsx('inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40', className)}
      {...rest}>
      {children}
    </button>
  )
}

const tones: Record<Tone, string> = {
  yellow: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-slate-100 text-slate-600',
  red: 'bg-red-100 text-red-700',
  teal: 'bg-teal-100 text-teal-800',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-violet-100 text-violet-800',
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

export function Card({ title, icon, actions, children, className, bodyClassName }:
  { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            {icon && <span className="text-brand-600">{icon}</span>}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(bodyClassName ?? 'p-4')}>{children}</div>
    </section>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, error, required, children, className, hint }:
  { label: string; error?: string; required?: boolean; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="label">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span>
        : hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl', xl: 'sm:max-w-6xl' }[size]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={clsx('flex max-h-[95vh] w-full flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl', width)}
        onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-navy-900">{title}</h2>
          <IconButton label="Kapat" onClick={onClose}><X className="size-5" /></IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmText = 'Evet', danger = true, loading, onConfirm, onClose }:
  { open: boolean; title: string; message: ReactNode; confirmText?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmText}</Button>
      </>}>
      <div className="text-sm text-slate-600">{message}</div>
    </Modal>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <div className={clsx('flex justify-center py-10 text-brand-600', className)}><Loader2 className="size-6 animate-spin" /></div>
}

export function Empty({ children = 'Kayıt bulunamadı.' }: { children?: ReactNode }) {
  return <div className="py-10 text-center text-sm text-slate-400">{children}</div>
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mb-px flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={clsx('whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
            value === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Select<T extends string | number>({ value, onChange, options, placeholder, className, ...rest }:
  { value: T | '' | undefined; onChange: (v: T | '') => void; options: { value: T; label: string }[]; placeholder?: string; className?: string; 'aria-label'?: string }) {
  return (
    <select className={clsx('input', className)} value={value ?? ''} {...rest}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange('')
        const opt = options.find((o) => String(o.value) === raw)
        onChange(opt ? opt.value : '')
      }}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
    </select>
  )
}

export function StatCard({ title, value, sub, icon, color, onClick }:
  { title: string; value: ReactNode; sub?: ReactNode; icon: ReactNode; color: 'blue' | 'green' | 'orange' | 'red'; onClick?: () => void }) {
  const bg = { blue: 'bg-brand-600', green: 'bg-emerald-600', orange: 'bg-orange-500', red: 'bg-red-600' }[color]
  return (
    <button onClick={onClick} className={clsx('flex w-full items-center gap-4 rounded-lg p-4 text-left text-white shadow-sm transition hover:brightness-105', bg)}>
      <div className="rounded-full bg-white/15 p-3">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-white/90">{title}</div>
        <div className="text-3xl font-bold leading-tight">{value}</div>
        {sub && <div className="truncate text-xs text-white/80">{sub}</div>}
      </div>
    </button>
  )
}
