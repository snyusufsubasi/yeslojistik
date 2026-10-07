import { useContext, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FileSpreadsheet, Plus } from 'lucide-react'
import { Button, MirrorContext } from './ui'

/**
 * Hiç kaydı olmayan liste için "ilk adım" boş durumu (`DataTable`'ın `empty` alanına konur, yalnız süzülmemiş boş listede).
 * Ekle düğmesi ve Excel bağlantısı yazma işlemidir: pratikortam aynası açıkken gizlenir, yerine açıklama gelir.
 */
export function FirstUse({ title, children, addLabel, onAdd, importEntity }:
  { title: string; children: ReactNode; addLabel?: string; onAdd?: () => void; importEntity?: 'customers' | 'suppliers' | 'vehicles' | 'drivers' }) {
  const mirror = useContext(MirrorContext)
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-1 text-[1.0625rem] font-bold text-fg">{title}</div>
      <p>{mirror ? 'Pratikortam aynası açık: kayıtlar pratikortam’dan gelir, bir sonraki senkronda burada görünür.' : children}</p>
      {!mirror && (onAdd || importEntity) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {onAdd && <Button write icon={<Plus className="size-4" />} onClick={onAdd}>{addLabel}</Button>}
          {importEntity && (
            <Link to={`/aktar?tur=${importEntity}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[0.875rem] font-semibold text-fg hover:bg-surface-2">
              <FileSpreadsheet className="size-4" /> Excel'den aktarın
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
