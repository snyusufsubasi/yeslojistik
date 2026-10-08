import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react'
import { LOAD_ERROR_EVENT, SERVER_STATUS_EVENT } from '../api/client'

/**
 * Ekranın üstünde ince bir şerit: sunucu uyanırken "açılıyor" bilgisi, bir sayfa verisi yüklenemediğinde hata mesajı.
 * İkisinde de "Tekrar dene" açık sorguları yeniden çalıştırır. Sunucu yeniden yanıt verince şerit kendiliğinden kalkar.
 */
export function ServerStatusBanner() {
  const qc = useQueryClient()
  const { pathname } = useLocation()
  const [down, setDown] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onStatus = (e: Event) => {
      const isDown = (e as CustomEvent<boolean>).detail
      setDown(isDown)
      if (!isDown) setError(null)
    }
    const onError = (e: Event) => setError((e as CustomEvent<string>).detail)
    window.addEventListener(SERVER_STATUS_EVENT, onStatus)
    window.addEventListener(LOAD_ERROR_EVENT, onError)
    return () => {
      window.removeEventListener(SERVER_STATUS_EVENT, onStatus)
      window.removeEventListener(LOAD_ERROR_EVENT, onError)
    }
  }, [])

  if (!down && !error) return null
  // Tanıtım sayfasındaki ziyaretçiye sunucu şeridi gösterilmez (sayfa sunucuyu beklemeden çalışır).
  if (pathname === '/' && !hadSessionHint()) return null
  const retry = () => { setError(null); void qc.refetchQueries({ type: 'active' }) }

  return (
    <div role="status" aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-sm shadow-sm ${down ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'}`}>
      {down ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
      <span>{down ? 'Sunucu birkaç saniye içinde açılıyor olabilir.' : `Veriler yüklenemedi: ${error}`}</span>
      <button className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 font-medium hover:bg-white" onClick={retry}>
        <RefreshCw className="size-3.5" />Tekrar dene
      </button>
      {!down && <button className="rounded p-0.5 hover:bg-white/60" aria-label="Kapat" onClick={() => setError(null)}><X className="size-4" /></button>}
    </div>
  )
}

function hadSessionHint(): boolean {
  try { return localStorage.getItem('yl:had-session') === '1' } catch { return false }
}
