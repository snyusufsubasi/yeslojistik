import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronLeft, Loader2, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { HelpTip } from './Inputs'
import type { Tone } from '../lib/labels'
import { usePageTitle } from '../lib/usePageTitle'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-xs',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20',
  ghost: 'text-slate-700 hover:bg-slate-100',
}

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      className={clsx('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-5',
        size === 'sm' ? 'min-h-10 px-3.5 text-[0.9375rem]' : 'min-h-11 px-5 text-base', variants[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button title={label} aria-label={label}
      className={clsx('inline-flex size-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40', className)}
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
  return <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold leading-none', tones[tone])}>{children}</span>
}

export function Card({ title, icon, actions, children, className, bodyClassName }:
  { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-navy-900">
            {icon && <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-5">{icon}</span>}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(bodyClassName ?? 'p-5')}>{children}</div>
    </section>
  )
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  usePageTitle(title)
  const { pathname } = useLocation()
  const page = pathname.split('/')[1] ?? ''
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <nav aria-label="Konum" className="mb-1 text-base">
            <Link to={back.to} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><ChevronLeft className="size-5" />{back.label}</Link>
          </nav>
        )}
        <div className="flex items-center">
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-navy-900">{title}</h1>
          {!back && <HelpTip page={page} />}
        </div>
        {subtitle && <p className="mt-1 text-base text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, error, required, children, className, hint, group }:
  { label: string; error?: string; required?: boolean; children: ReactNode; className?: string; hint?: string
    /** Şık usulü seçim gibi birden çok düğme içeren alanlar: <label> yerine grup olarak çizilir (etikete tıklamak ilk seçeneği seçmesin). */
    group?: boolean }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={clsx('block', className)} {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span className="label">{label}{required && <span className="text-red-600" title="Zorunlu alan"> *</span>}</span>
      {children}
      {error ? <span className="mt-1.5 block text-sm font-medium text-red-700">{error}</span>
        : hint ? <span className="mt-1.5 block text-sm text-slate-600">{hint}</span> : null}
    </Tag>
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
        className={clsx('flex max-h-[95vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', width)}
        onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold text-navy-900">{title}</h2>
          <IconButton label="Kapat" onClick={onClose}><X className="size-5" /></IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4 sm:rounded-b-2xl">{footer}</footer>}
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
      <div className="text-base text-slate-700">{message}</div>
    </Modal>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <div className={clsx('flex justify-center py-10 text-brand-600', className)}><Loader2 className="size-8 animate-spin" /></div>
}

export function Empty({ children = 'Kayıt bulunamadı.' }: { children?: ReactNode }) {
  return <div className="px-4 py-12 text-center text-base text-slate-600">{children}</div>
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mb-px flex flex-wrap gap-x-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={clsx('whitespace-nowrap border-b-[3px] px-3.5 py-3 text-base font-semibold transition',
            value === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900')}>
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
  const bg = { blue: 'bg-gradient-to-br from-brand-500 to-brand-700', green: 'bg-gradient-to-br from-emerald-500 to-emerald-700', orange: 'bg-gradient-to-br from-orange-500 to-orange-600', red: 'bg-gradient-to-br from-red-500 to-red-700' }[color]
  return (
    <button onClick={onClick} className={clsx('group flex w-full items-center gap-4 rounded-2xl p-5 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg', bg)}>
      <div className="rounded-xl bg-white/15 p-3">{icon}</div>
      <div className="min-w-0">
        <div className="text-base font-semibold text-white/95">{title}</div>
        <div className="text-[2rem] font-bold leading-tight tracking-tight">{value}</div>
        {sub && <div className="truncate text-sm text-white/90">{sub}</div>}
      </div>
    </button>
  )
}

/** Filtre çubuklarındaki tarih kutusu: üst kenarında küçük etiket ("Başlangıç", "Bitiş"). */
export function DateFilter({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={clsx('relative block', className)}>
      <span className="pointer-events-none absolute -top-2 left-2.5 z-10 bg-white px-1 text-sm font-semibold leading-none text-slate-600">{label}</span>
      <input className="input" type="date" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
