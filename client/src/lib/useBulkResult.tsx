import { useState } from 'react'
import type { BulkResult } from '../api/types'
import { BulkResultDialog } from '../components/BulkDialogs'
import { useToast } from '../components/Toast'

/** Toplu işlem sonucunu gösterir: hepsi değiştiyse kısa bildirim, atlanan varsa açıklamalı pencere. */
export function useBulkResult() {
  const toast = useToast()
  const [shown, setShown] = useState<{ title: string; done: string; result: BulkResult } | null>(null)
  const show = (title: string, done: string, result: BulkResult) => {
    if (result.skipped.length === 0) toast.success(`${result.updated} ${done}`)
    else setShown({ title, done, result })
  }
  const dialog = shown && <BulkResultDialog {...shown} onClose={() => setShown(null)} />
  return { show, dialog }
}
