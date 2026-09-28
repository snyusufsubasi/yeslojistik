import { useEffect } from 'react'

/** Tarayıcı sekmesinde sayfa adını gösterir. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · YES Lojistik`
    return () => { document.title = 'YES Lojistik – Nakliye Takip Sistemi' }
  }, [title])
}
