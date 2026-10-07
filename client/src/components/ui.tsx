import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type SyntheticEvent } from 'react'
import clsx from 'clsx'
import { AlertTriangle, ChevronLeft, Inbox, Loader2, RefreshCw, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { HelpTip } from './Inputs'
import type { Tone } from '../lib/labels'
import { usePageTitle } from '../lib/usePageTitle'
import { errorMessage, isTransientError } from '../api/client'
import { SectionTabs } from './shell/SectionTabs'
import { useIsNewUi } from '../lib/uiMode'
import { newTitles } from '../lib/sections'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700',
  secondary: 'bg-white text-fg border border-line shadow-xs hover:bg-surface-2 hover:border-slate-300',
  success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700',
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
      className={clsx('inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4',
        size === 'sm' ? 'min-h-9 px-3 text-[0.8125rem]' : 'min-h-11 px-4 text-[0.875rem]', variants[variant], className)}
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
      className={clsx('inline-flex size-11 items-center justify-center rounded-lg text-slate-700 transition hover:bg-surface-2 hover:text-fg disabled:opacity-40', className)}
      {...rest}>
      {children}
    </button>
  )
}

/** Durum etiketi tonları (tam yuvarlak hap): soft zemin üstünde koyu yazı (Planlandı info, Yüklendi warn, Yolda accent, Teslim good, İptal muted). */
const tones: Record<Tone, string> = {
  yellow: 'bg-warn-soft text-warn',
  green: 'bg-good-soft text-good',
  blue: 'bg-info-soft text-info',
  gray: 'bg-surface-2 text-muted',
  red: 'bg-bad-soft text-bad',
  teal: 'bg-accent-soft text-accent',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-violet-100 text-violet-800',
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    // font-sans: tutar hücresinin (mono) içinde de durum etiketi normal yazıyla kalır
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 font-sans text-[0.75rem] font-medium leading-none tracking-normal', tones[tone])}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />{children}
    </span>
  )
}

/** Plaka rozeti: ince çerçeve, solda mavi "TR" şeridi, sağda eşit genişlikli rakamlarla plaka. */
export function PlateBadge({ plate, className }: { plate?: string | null; className?: string }) {
  if (!plate) return null
  return (
    <span className={clsx('inline-flex items-stretch overflow-hidden whitespace-nowrap rounded-md border border-slate-400 bg-white align-middle leading-none', className)}>
      <span aria-hidden className="flex items-center bg-plate px-[3px] pt-px text-[0.5625rem] font-bold text-white">TR</span>
      <span className="px-1.5 pb-[2px] pt-[4px] font-mono text-[0.8125rem] font-semibold uppercase text-fg">{plate}</span>
    </span>
  )
}

export function Card({ title, icon, actions, children, className, bodyClassName }:
  { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-t-2xl border-b border-line px-5 py-2.5">
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
            {icon && <span className="flex text-muted [&_svg]:size-4">{icon}</span>}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(bodyClassName ?? 'p-5')}>{children}</div>
    </section>
  )
}

export function PageHeader({ title: pageTitle, subtitle, actions, back }: { title: string; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  const { pathname } = useLocation()
  const isNew = useIsNewUi()
  // Yeni görünüm: başlık pratikortam adıyla, açıklama cümlesi (düz yazı alt başlık) gizli, altında bölüm sekmeleri.
  const title = (isNew && newTitles[pathname]) || pageTitle
  const showSubtitle = subtitle && !(isNew && typeof subtitle === 'string')
  usePageTitle(title)
  const page = pathname.split('/')[1] ?? ''
  return (<>
    <div className={isNew ? 'mb-3.5 flex flex-wrap items-end justify-between gap-3' : 'mb-5 flex flex-wrap items-end justify-between gap-3'}>
      <div>
        {back && (
          <nav aria-label="Konum" className="mb-1.5 text-sm">
            <Link to={back.to} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"><ChevronLeft className="size-4" />{back.label}</Link>
          </nav>
        )}
        <div className="flex items-center">
          <h1 className="text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-fg">{title}</h1>
          {!back && !isNew && <HelpTip page={page} />}
        </div>
        {showSubtitle && <p className="mt-1.5 text-[0.9375rem] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
    <SectionTabs />
  </>)
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
      {error ? <span className="mt-1 block text-[0.8125rem] text-bad">{error}</span>
        : hint ? <span className="mt-1 block text-[0.8125rem] text-muted">{hint}</span> : null}
    </Tag>
  )
}

const modalStack: object[] = []

/** Açık bir Modal var mı? Alt katmanlar (DetailDrawer) Esc'i yalnız üstteki pencereye bırakmak için sorar. */
export function hasOpenModal() { return modalStack.length > 0 }

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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/30 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={requestClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={clsx('flex max-h-[95vh] w-full flex-col rounded-t-2xl border border-line bg-white shadow-xl sm:rounded-2xl', width)}
        onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line py-2.5 pl-6 pr-3">
          <h2 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
          <IconButton label="Kapat" onClick={requestClose}><X className="size-5" /></IconButton>
        </header>
        <div data-modal-body className="flex-1 overflow-y-auto px-6 py-5" onInputCapture={touch} onChangeCapture={touch}
          onSubmitCapture={(e) => { if (own(e)) setDirty(false) }}>{children}</div>
        {asking ? (
          <footer role="alert" className="flex flex-wrap items-center justify-end gap-3 border-t border-amber-200 bg-warn-soft px-6 py-3 sm:rounded-b-2xl">
            <span className="mr-auto text-[0.9375rem] text-amber-900">Kaydedilmemiş değişiklikler var. Kapatılsın mı?</span>
            <Button variant="secondary" onClick={() => setAsking(false)}>Forma dön</Button>
            <Button variant="danger" onClick={() => { setAsking(false); onClose() }}>Kaydetmeden kapat</Button>
          </footer>
        ) : footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-slate-50/70 px-6 py-3 sm:rounded-b-2xl">{footer}</footer>}
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

/** Boş liste: yumuşak daire içinde simge, kısa açıklama, varsa ilk adım düğmesi. */
export function Empty({ children = 'Kayıt bulunamadı.', icon, action, hint }: { children?: ReactNode; icon?: ReactNode; action?: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center text-[0.9375rem] text-slate-600">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted [&_svg]:size-6" aria-hidden>{icon ?? <Inbox />}</span>
      <div className="max-w-md text-fg">{children}</div>
      {hint && <div className="-mt-1 max-w-md text-[0.875rem] text-muted">{hint}</div>}
      {action}
    </div>
  )
}

/**
 * Tablo yüklenirken satır iskeleti (docs/plan/29-GORSEL-SISTEM.md §5).
 * Dönen simge yerine içerik yer tutucusu: sayfa "zıplamaz", ekran okuyucu "Yükleniyor" duyar.
 */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 px-3 py-4" role="status">
      <span className="sr-only">Yükleniyor…</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3" aria-hidden>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={clsx('h-4 animate-pulse rounded-md bg-surface-2', c === 0 ? 'w-24' : c === cols - 1 ? 'w-16' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mb-px flex flex-wrap gap-x-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={clsx('whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.875rem] font-semibold transition',
            value === t.value ? 'border-brand-600 text-fg' : 'border-transparent text-muted hover:border-slate-300 hover:text-fg')}>
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
  const tone = { blue: 'text-info', green: 'text-good', orange: 'text-warn', red: 'text-bad' }[color]
  return (
    <button onClick={onClick} className="card group flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:border-slate-300 hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[0.75rem] font-medium text-muted">
          <span className={clsx('flex [&_svg]:size-3.5', tone)}>{icon}</span>{title}
        </div>
        <div className="mt-1 truncate font-mono text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-fg">{value}</div>
        {sub && <div className="mt-0.5 text-[0.8125rem] text-muted">{sub}</div>}
      </div>
    </button>
  )
}

/**
 * Ana sayfa rakamları düzeni: yan yana kutular, aralarında ince çizgi (dar ekranda alt alta da çizgiyle ayrılır).
 * İçine `Figure` konur; sütun sayısı `className` ile verilir (ör. "sm:grid-cols-2 xl:grid-cols-4").
 */
export function Figures({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <div aria-label={label} className={clsx('grid gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-xs', className)}>{children}</div>
}

/** Tek rakam kutusu: küçük sakin etiket, eşit genişlikli rakamlarla 22px değer. `highlight` sarı (bill-soft) zeminli vurgu. */
export function Figure({ label, value, sub, tone, highlight, onClick }:
  { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: string; highlight?: boolean; onClick?: () => void }) {
  const body = <>
    <span className={clsx('block text-[0.75rem] font-medium', highlight ? 'text-bill' : 'text-muted')}>{label}</span>
    <span className={clsx('mt-1 block truncate font-mono text-[1.375rem] font-semibold leading-tight tracking-[-0.02em]', tone ?? 'text-fg')}>{value}</span>
    {sub && <span className={clsx('mt-0.5 block text-[0.8125rem]', highlight ? 'text-bill' : 'text-muted')}>{sub}</span>}
  </>
  const cls = clsx('block min-w-0 px-5 py-3.5 text-left', highlight ? 'bg-bill-soft' : 'bg-white')
  return onClick
    ? <button type="button" onClick={onClick} className={clsx(cls, 'w-full transition', highlight ? 'hover:bg-[#fbecc0]' : 'hover:bg-surface-2')}>{body}</button>
    : <div className={cls}>{body}</div>
}

/** Yuvarlak filtre çipi (Bugün / Hepsi gibi): seçiliyken accent zemin, beyaz yazı. Sekme gibi davranıyorsa `role="tab"` verilir. */
export function Chip({ active, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button type="button" {...rest}
      className={clsx('inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[0.8125rem] font-medium transition [&_svg]:size-4',
        active ? 'border-accent bg-accent text-white shadow-xs' : 'border-line bg-white text-fg hover:border-slate-300 hover:bg-surface-2', className)}>
      {children}
    </button>
  )
}

/** Filtre çubuklarındaki tarih kutusu: etiket kutunun içinde solda ("Başlangıç", "Bitiş"). */
export function DateFilter({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={clsx('input flex items-center gap-2 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100', className)}>
      <span className="shrink-0 text-[0.8125rem] text-muted">{label}</span>
      <input className="min-w-0 flex-1 bg-transparent outline-none" type="date" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
