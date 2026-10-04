import { useEffect } from 'react'
import { useBranding } from './branding'

/** Tarayıcı sekmesinde sayfa adını gösterir (ürün adı: ayardaki firma adı, değişmediyse "YES Lojistik"). */
export function usePageTitle(title: string) {
  const { name } = useBranding()
  useEffect(() => {
    document.title = `${title} · ${name}`
    return () => { document.title = `${name} – Nakliye Takip Sistemi` }
  }, [title, name])
}
