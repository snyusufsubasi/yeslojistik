import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type SyntheticEvent } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { Button, IconButton, Tabs, hasOpenModal } from '../ui'

export interface DetailDrawerProps {
  /** Adresle eşlenir: `?id=<kayıt>` açıkken true. */
  open: boolean
  onClose: () => void
  /** Kaydın kendi adı, ör. "Sevkiyat #1042"; "Detay" tek başına başlık olmaz. */
  title: string
  /** Verilirse `Tabs` ile sekme şeridi çizilir; içerik seçili sekmeyle (`children` fonksiyonu) üretilir. */
  tabs?: { value: string; label: string }[]
  /** Sağ altta; yazma düğmeleri `Button write` taşır. */
  footer?: ReactNode
  /** İçerideki form kirliyse kapatmadan önce sorar (Modal ile aynı metin). */
  guard?: boolean
  size?: 'md' | 'lg'
  /** İçerik; fonksiyon verilirse seçili sekmenin değeriyle çağrılır. */
  children: ReactNode | ((tab: string) => ReactNode)
}

/** Odak tuzağının kapsamı: FilterPanel ile aynı seçici. */
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Sağdan açılan kayıt çekmecesi — şartname: docs/plan/28-ORTAK-PARCALAR.md §4.
 *
 * Z sırası: FilterPanel 45 · **DetailDrawer 50** · Modal 60 (yazma penceresi çekmecenin üstünde açılır).
 * Masaüstünde md 560px, lg 720px; telefonda tam ekran. Esc kapatır ama üstte bir `Modal` açıksa yalnız onu
 * kapatır (`hasOpenModal`): aksi hâlde düzenleme penceresi ve çekmece birlikte kapanırdı.
 */
export function DetailDrawer({ open, onClose, title, tabs, footer, guard = true, size = 'md', children }: DetailDrawerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [dirty, setDirty] = useState(false)
  const [asking, setAsking] = useState(false)
  const [tab, setTab] = useState(tabs?.[0]?.value ?? '')
  // Yalnızca kullanıcının kapatma yolları (Esc, dışarı tıklama, X) sorar; kaydedince kapanış doğrudan olur.
  const requestClose = useCallback(() => {
    if (guard && dirty) setAsking(true)
    else onClose()
  }, [guard, dirty, onClose])
  // Esc dinleyicisi yalnızca `open` değişince kurulur; en güncel kapatma davranışı ref'ten okunur.
  const closeRef = useRef(requestClose)
  useEffect(() => { closeRef.current = requestClose }, [requestClose])

  // Çekmece kapanınca "değişti" bilgisi ve seçili sekme sıfırlanır (Modal deseni).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) { setDirty(false); setAsking(false) }
    else setTab(tabs?.[0]?.value ?? '')
  }

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      // Üstte bir Modal varsa (ör. düzenleme penceresi) Esc ve Ctrl+Enter yalnız onu ilgilendirir.
      if (hasOpenModal()) return
      // Açık bir menü varsa Esc'i o kapatır (Menu.tsx olayı yukarı göndermez).
      if ((document.activeElement as HTMLElement | null)?.closest('[role="menu"]')) return
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return }
      if (e.key === 'Tab') {
        // Tab çekmecenin içinde döner (odak tuzağı).
        const els = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        if (els.length === 0) return
        const first = els[0]
        const last = els[els.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
        else if (e.shiftKey && (active === first || !ref.current?.contains(active))) { e.preventDefault(); last.focus() }
        return
      }
      // Ctrl+Enter (Mac'te Cmd+Enter): çekmecedeki formu kaydeder.
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const form = ref.current?.querySelector('form')
        if (form) { e.preventDefault(); form.requestSubmit() }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      // Kapanışta odak tetikleyici öğeye döner (klavye kullanıcısı kaybolmaz).
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [open])

  if (!open) return null
  // İç içe pencerelerde (ör. çekmeceden açılan düzenleme penceresi) yalnızca bu çekmecenin alanları sayılır.
  const own = (e: SyntheticEvent) => (e.target as HTMLElement).closest('[role=dialog]') === ref.current
  const touch = (e: SyntheticEvent) => { if (!dirty && own(e)) setDirty(true) }
  const width = size === 'lg' ? 'sm:w-[720px]' : 'sm:w-[560px]'
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30" onClick={requestClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={clsx('absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-xl', width)}>
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <h2 id={titleId} className="min-w-0 truncate text-[1.0625rem] font-bold text-fg">{title}</h2>
          <IconButton label="Kapat" onClick={requestClose}><X className="size-5" /></IconButton>
        </header>
        {tabs && tabs.length > 0 && <div className="shrink-0 px-5 pt-2"><Tabs tabs={tabs} value={tab} onChange={setTab} /></div>}
        <div data-drawer-body className="flex-1 overflow-y-auto px-5 py-4" onInputCapture={touch} onChangeCapture={touch}
          onSubmitCapture={(e) => { if (own(e)) setDirty(false) }}>
          {typeof children === 'function' ? children(tab) : children}
        </div>
        {asking ? (
          <footer role="alert" className="flex flex-wrap items-center justify-end gap-3 border-t border-amber-200 bg-warn-soft px-5 py-3">
            <span className="mr-auto text-[0.9375rem] text-amber-900">Kaydedilmemiş değişiklikler var. Kapatılsın mı?</span>
            <Button variant="secondary" onClick={() => setAsking(false)}>Forma dön</Button>
            <Button variant="danger" onClick={() => { setAsking(false); onClose() }}>Kaydetmeden kapat</Button>
          </footer>
        ) : footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-slate-50 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
