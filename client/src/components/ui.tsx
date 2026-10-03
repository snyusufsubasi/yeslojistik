import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type SyntheticEvent } from 'react'
import clsx from 'clsx'
import { AlertTriangle, ChevronLeft, Loader2, RefreshCw, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { HelpTip } from './Inputs'
import type { Tone } from '../lib/labels'
import { usePageTitle } from '../lib/usePageTitle'
import { errorMessage, isTransientError } from '../api/client'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-700 hover:bg-slate-100',
}

/**
 * Pratikortam aynası açıkken (Layout sağlar) kayıt ekleyen/değiştiren düğmeler gizlenir: o dönemde kayıtlar pratikortam'dan gelir.
 * Böyle düğmeler `write` ile işaretlenir; sunucu da aynı işlemleri reddeder.
 */
export const MirrorContext = createContext(false)

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, write, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode; write?: boolean }) {
  const mirror = useContext(MirrorContext)
  if (write && mirror) return null
  return (
    <button
      className={clsx('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-[1.125rem]',
        size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-10 px-4 text-[0.9375rem]', variants[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, write, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; write?: boolean }) {
  const mirror = useContext(MirrorContext)
  if (write && mirror) return null
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
  gray: 'bg-slate-100 text-slate-700',
  red: 'bg-red-100 text-red-700',
  teal: 'bg-teal-100 text-teal-800',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-violet-100 text-violet-800',
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium leading-none', tones[tone])}>{children}</span>
}

export function Card({ title, icon, actions, children, className, bodyClassName }:
  { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2.5 text-lg text-slate-900">
            {icon && <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 [&_svg]:size-[1.125rem]">{icon}</span>}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(bodyClassName ?? 'p-6')}>{children}</div>
    </section>
  )
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  usePageTitle(title)
  const { pathname } = useLocation()
  const page = pathname.split('/')[1] ?? ''
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <nav aria-label="Konum" className="mb-1.5 text-sm">
            <Link to={back.to} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"><ChevronLeft className="size-4" />{back.label}</Link>
          </nav>
        )}
        <div className="flex items-center">
          <h1 className="text-[1.875rem] leading-tight text-slate-900">{title}</h1>
          {!back && <HelpTip page={page} />}
        </div>
        {subtitle && <p className="mt-1.5 text-[0.9375rem] text-slate-600">{subtitle}</p>}
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
      {error ? <span className="mt-1.5 block text-sm text-red-700">{error}</span>
        : hint ? <span className="mt-1.5 block text-sm text-slate-600">{hint}</span> : null}
    </Tag>
  )
}

const modalStack: object[] = []

export function Modal({ open, onClose, title, children, footer, size = 'md', guard = true }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'
    /** Alanlara bir şey yazıldıysa Esc, dışarı tıklama ve X kapatmadan önce sorar. Arama gibi pencerelerde kapatılır. */
    guard?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [dirty, setDirty] = useState(false)
  const [asking, setAsking] = useState(false)
  // Yalnızca kullanıcının kapatma yolları (Esc, dışarı tıklama, X) sorar; kaydedince ya da "Vazgeç" ile kapanış doğrudan olur.
  const requestClose = useCallback(() => {
    if (guard && dirty) setAsking(true)
    else onClose()
  }, [guard, dirty, onClose])

  // Pencere kapanınca "değişti" bilgisi sıfırlanır (aynı bileşen açık kalıp tekrar açıldığında).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) { setDirty(false); setAsking(false) }
  }

  useEffect(() => {
    if (!open) return
    // Pencere açılınca ilk alana odaklan (alan kendi autoFocus'unu kullandıysa ona dokunma).
    const box = ref.current
    if (box && !box.contains(document.activeElement)) {
      const first = box.querySelector<HTMLElement>('[data-modal-body] :is(input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea):not([disabled]):not([readonly])')
      // Arama kutusu (combobox) odaklanınca listeyi açar ve seçili değeri gizler; ilk alan oysa odaklanma.
      if (first && first.getAttribute('role') !== 'combobox') first.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    // Üst üste açılan pencerelerde (ör. sefer formundan "yeni müşteri") Esc yalnızca en üsttekini kapatır.
    const token = {}
    modalStack.push(token)
    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return
      if (e.key === 'Escape') { e.preventDefault(); requestClose() }
      // Ctrl+Enter (Mac'te Cmd+Enter): penceredeki formu kaydeder.
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const form = ref.current?.querySelector('form')
        if (form) { e.preventDefault(); form.requestSubmit() }
      }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      modalStack.splice(modalStack.indexOf(token), 1)
      if (modalStack.length === 0) document.body.style.overflow = ''
    }
  }, [open, requestClose])
  if (!open) return null
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl', xl: 'sm:max-w-6xl' }[size]
  // İç içe pencerelerde (ör. fatura içinden "Tahsilat Ekle") yalnızca bu pencerenin kendi alanları sayılır.
  const own = (e: SyntheticEvent) => (e.target as HTMLElement).closest('[role=dialog]') === ref.current
  const touch = (e: SyntheticEvent) => { if (!dirty && own(e)) setDirty(true) }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onMouseDown={requestClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={clsx('flex max-h-[95vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', width)}
        onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl text-slate-900">{title}</h2>
          <IconButton label="Kapat" onClick={requestClose}><X className="size-5" /></IconButton>
        </header>
        <div data-modal-body className="flex-1 overflow-y-auto px-6 py-6" onInputCapture={touch} onChangeCapture={touch}
          onSubmitCapture={(e) => { if (own(e)) setDirty(false) }}>{children}</div>
        {asking ? (
          <footer role="alert" className="flex flex-wrap items-center justify-end gap-3 border-t border-amber-200 bg-amber-50 px-6 py-4 sm:rounded-b-2xl">
            <span className="mr-auto text-[0.9375rem] text-amber-900">Kaydedilmemiş değişiklikler var. Kapatılsın mı?</span>
            <Button variant="secondary" onClick={() => setAsking(false)}>Forma dön</Button>
            <Button variant="danger" onClick={() => { setAsking(false); onClose() }}>Kaydetmeden kapat</Button>
          </footer>
        ) : footer && <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4 sm:rounded-b-2xl">{footer}</footer>}
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
      <div className="text-[0.9375rem] text-slate-700">{message}</div>
    </Modal>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <div className={clsx('flex justify-center py-10 text-brand-600', className)}><Loader2 className="size-8 animate-spin" /></div>
}

/** Veri yüklenemediğinde gösterilir: sunucu uyanıyorsa bunu söyler, değilse hatanın kendisini; altta "Tekrar dene". */
export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const text = isTransientError(error) ? 'Sunucu birkaç saniye içinde açılıyor olabilir.' : errorMessage(error)
  return (
    <div role="alert" className={clsx('flex flex-col items-center gap-3 px-4 py-10 text-center text-[0.9375rem] text-slate-700', className)}>
      <AlertTriangle className="size-6 text-amber-600" />
      <p>{text}</p>
      {onRetry && <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={onRetry}>Tekrar dene</Button>}
    </div>
  )
}

/** Veri gelene kadar: hata varsa hata ekranı ("Tekrar dene" ile), yoksa dönen simge. */
export function Loading({ error, onRetry, className }: { error?: unknown; onRetry?: () => void; className?: string }) {
  return error ? <ErrorState error={error} onRetry={onRetry} className={className} /> : <Spinner className={className} />
}

export function Empty({ children = 'Kayıt bulunamadı.' }: { children?: ReactNode }) {
  return <div className="px-4 py-14 text-center text-[0.9375rem] text-slate-600">{children}</div>
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mb-px flex flex-wrap gap-x-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={clsx('whitespace-nowrap border-b-2 px-3.5 py-3 text-[0.9375rem] font-medium transition',
            value === t.value ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900')}>
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
  const chip = { blue: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600', red: 'bg-red-50 text-red-600' }[color]
  return (
    <button onClick={onClick} className="card group flex w-full items-start gap-4 p-5 text-left transition hover:border-slate-300 hover:shadow-sm">
      <div className={clsx('rounded-xl p-2.5 [&_svg]:size-5', chip)}>{icon}</div>
      <div className="min-w-0">
        <div className="text-sm text-slate-600">{title}</div>
        <div className="mt-0.5 text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900">{value}</div>
        {sub && <div className="mt-0.5 text-sm text-slate-500">{sub}</div>}
      </div>
    </button>
  )
}

/** Filtre çubuklarındaki tarih kutusu: etiket kutunun içinde solda ("Başlangıç", "Bitiş"). */
export function DateFilter({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={clsx('input flex items-center gap-2 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100', className)}>
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <input className="min-w-0 flex-1 bg-transparent outline-none" type="date" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
