import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Download } from 'lucide-react'
import { download, errorMessage, openPdf, withQuery } from '../api/client'
import { Button } from './ui'
import { useToast } from './Toast'

/**
 * Dosya indirme düğmesi (Excel). İnerken bekleme işareti, hata olursa bildirim gösterir.
 * Kayıt değiştirmediği için aynada da görünür (`write` almaz).
 */
/**
 * Menü maddesi içinden Excel indirmek için ortak eylem (docs/plan/28-ORTAK-PARCALAR.md).
 * Aynı bekleme/hata davranışını paylaşır; düğme çizmez.
 */
export function useExportAction() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = async (url: string, fileName: string, params?: object) => {
    setBusy(true)
    try { await download(url, params, fileName) }
    catch (e) { toast.error(errorMessage(e)) }
    finally { setBusy(false) }
  }
  return { busy, run }
}

export function ExportButton({ url, params, fileName, label = 'Excel', icon, size }:
  { url: string; params?: object; fileName: string; label?: string; icon?: ReactNode; size?: 'sm' | 'md' }) {
  const { busy, run } = useExportAction()
  return <Button variant="secondary" size={size} loading={busy} icon={icon ?? <Download className="size-4" />} onClick={() => run(url, fileName, params)}>{label}</Button>
}

/** PDF'i yeni sekmede açan düğme (filtreler adrese eklenir). */
export function PdfButton({ url, params, fileName, label, icon, size }:
  { url: string; params?: object; fileName: string; label: string; icon?: ReactNode; size?: 'sm' | 'md' }) {
  const toast = useToast()
  return <Button variant="secondary" size={size} icon={icon} onClick={() => openPdf(withQuery(url, params), fileName).catch((e) => toast.error(errorMessage(e)))}>{label}</Button>
}

export interface TotalItem { label: string; value: ReactNode; tone?: string }

/** Filtre toplamı şeridi: listenin üstünde, filtreye uyan bütün kayıtların (yalnızca bu sayfanın değil) toplamı. */
export function TotalsStrip({ items, note }: { items: TotalItem[]; note?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b border-slate-100 bg-slate-50/70 px-6 py-3" aria-label="Filtre toplamı">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <div className="text-sm text-slate-500">{i.label}</div>
          <div className={clsx('text-base font-semibold tabular-nums', i.tone ?? 'text-slate-900')}>{i.value}</div>
        </div>
      ))}
      {note && <div className="pb-0.5 text-sm text-slate-500">{note}</div>}
    </div>
  )
}
