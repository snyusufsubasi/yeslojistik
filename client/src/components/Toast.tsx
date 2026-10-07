import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

interface ToastItem { id: number; kind: 'success' | 'error'; text: string }
interface ToastApi { success: (t: string) => void; error: (t: string) => void }

const Ctx = createContext<ToastApi | null>(null)
let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const remove = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const push = useCallback((kind: ToastItem['kind'], text: string) => {
    const id = nextId++
    setItems((xs) => [...xs, { id, kind, text }])
    setTimeout(() => remove(id), kind === 'error' ? 6000 : 3000)
  }, [remove])
  const api = useMemo(() => ({ success: (t: string) => push('success', t), error: (t: string) => push('error', t) }), [push])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {items.map((t) => (
          <div key={t.id} role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[0.875rem] text-fg shadow-lg">
            {t.kind === 'success'
              ? <CheckCircle2 aria-hidden className="mt-0.5 size-[1.125rem] shrink-0 text-good" />
              : <XCircle aria-hidden className="mt-0.5 size-[1.125rem] shrink-0 text-bad" />}
            <span className="flex-1">{t.text}</span>
            <button onClick={() => remove(t.id)} aria-label="Kapat" className="rounded-md p-0.5 text-muted transition hover:bg-surface-2 hover:text-fg"><X className="size-4" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast, ToastProvider içinde kullanılmalı')
  return ctx
}
