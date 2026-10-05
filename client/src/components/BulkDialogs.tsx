import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HandCoins } from 'lucide-react'
import { errorMessage, post } from '../api/client'
import type { BulkPaymentPreview, BulkResult, BulkSkipped, BulkSupplierPaymentResult, PaymentMethod } from '../api/types'
import { tl2, todayIso } from '../lib/format'
import { useLookup, useSave } from '../lib/hooks'
import { options, paymentMethodLabel } from '../lib/labels'
import { useToast } from './Toast'
import { Button, Field, Modal, Select, Spinner } from './ui'

/** Değiştirilmeyen kayıtların listesi (nedeniyle). */
function SkippedList({ title, items }: { title: string; items: BulkSkipped[] }) {
  return (
    <div className="rounded-xl bg-amber-50 px-4 py-3 text-[0.9375rem] text-amber-900">
      <p className="font-medium">{title}</p>
      <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto">
        {items.map((s) => <li key={s.id}><span className="font-medium">{s.label}</span>: {s.reason}</li>)}
      </ul>
    </div>
  )
}

/** Toplu işlemden sonra: kaç kayıt değişti, hangileri neden atlandı. */
export function BulkResultDialog({ title, done, result, onClose }: { title: string; done: string; result: BulkResult; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={title} size="sm" footer={<Button onClick={onClose}>Tamam</Button>}>
      <div className="space-y-4">
        <p className="text-[0.9375rem] text-slate-800">
          {result.updated > 0 ? <><b>{result.updated}</b> {done}</> : 'Hiçbir sevkiyat değişmedi.'}
        </p>
        {result.skipped.length > 0 && <SkippedList title={`${result.skipped.length} sevkiyat değişmedi:`} items={result.skipped} />}
      </div>
    </Modal>
  )
}

/**
 * Toplu tedarikçi ödemesi (eski paneldeki "Seçilenleri listeye ekle" + ödeme): seçilen taşeron seferlerinin kalan borcu
 * tedarikçi başına tek ödeme olarak kaydedilir. Önce sunucudan önizleme alınır, kullanıcı tutarları görüp onaylar.
 */
export function BulkSupplierPaymentDialog({ tripIds, onClose, onDone }: { tripIds: number[]; onClose: () => void; onDone?: () => void }) {
  const toast = useToast()
  const accounts = useLookup('cash-accounts')
  const preview = useQuery({
    queryKey: ['supplier-payments', 'bulk-preview', tripIds],
    queryFn: () => post<BulkPaymentPreview>('/supplier-payments/bulk/preview', { tripIds }),
    gcTime: 0, retry: false,
  })
  const [date, setDate] = useState(todayIso())
  const [method, setMethod] = useState<PaymentMethod>('BankTransfer')
  const [cashAccountId, setCashAccountId] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const data = preview.data
  const payable = data?.suppliers.flatMap((s) => s.trips.map((t) => t.tripId)) ?? []
  const save = useSave(() => post<BulkSupplierPaymentResult>('/supplier-payments/bulk', {
    tripIds: payable, date, method, cashAccountId: cashAccountId === '' ? null : cashAccountId, description: description.trim() || null,
  }), {
    invalidate: ['supplier-payments', 'suppliers', 'trips', 'cari', 'cash-accounts'],
    onSuccess: (r) => {
      toast.success(`${r.payments.length} ödeme kaydedildi, toplam ${tl2(r.total)}.`)
      onDone?.()
      onClose()
    },
  })
  const count = data?.suppliers.length ?? 0

  return (
    <Modal open onClose={onClose} title="Toplu Ödeme" size="lg"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button write variant="success" icon={<HandCoins className="size-4" />} loading={save.isPending} disabled={count === 0 || !date}
          onClick={() => save.mutate(undefined)}>{count > 1 ? `${count} ödemeyi kaydet` : 'Ödemeyi kaydet'}</Button>
      </>}>
      {preview.isLoading ? <Spinner /> : preview.isError ? <p className="text-[0.9375rem] text-red-700">{errorMessage(preview.error)}</p> : data && (
        <div className="space-y-5">
          <p className="text-[0.9375rem] text-slate-600">Seçilen sevkiyatların kalan borcu, her tedarikçiye tek ödeme olarak kaydedilir. Ödeme önce bu sevkiyatları kapatır.</p>
          {count === 0 ? <p className="text-[0.9375rem] font-medium text-slate-800">Seçilen sevkiyatlarda ödenecek taşeron borcu yok.</p> : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse">
                <thead><tr><th className="th">Tedarikçi / sevkiyat</th><th className="th text-right">Tutar</th></tr></thead>
                {data.suppliers.map((s) => (
                  <tbody key={s.supplierId}>
                    <tr className="bg-slate-50/70">
                      <td className="td font-medium">{s.supplierTitle} <span className="font-normal text-slate-500">· {s.trips.length} sevkiyat</span></td>
                      <td className="td text-right font-semibold tabular-nums">{tl2(s.total)}</td>
                    </tr>
                    {s.trips.map((t) => (
                      <tr key={t.tripId}>
                        <td className="td py-2 pl-8 text-sm text-slate-600">{t.label}{t.note && <span className="block text-slate-500">{t.note}</span>}</td>
                        <td className="td py-2 text-right text-sm tabular-nums text-slate-600">{t.amount > 0 ? tl2(t.amount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
                <tfoot><tr><td className="td font-semibold">Toplam ({count} ödeme)</td><td className="td text-right font-semibold tabular-nums">{tl2(data.total)}</td></tr></tfoot>
              </table>
            </div>
          )}
          {data.skipped.length > 0 && <SkippedList title={`Ödemeye eklenmeyecek ${data.skipped.length} sevkiyat:`} items={data.skipped} />}
          {count > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tarih" required><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Nasıl ödediniz?" required>
                <Select aria-label="Ödeme yöntemi" value={method} onChange={(v) => v && setMethod(v)} options={options(paymentMethodLabel)} />
              </Field>
              {(accounts.data?.length ?? 0) > 0 && (
                <Field label="Para hangi hesaptan çıktı?" hint="İsteğe bağlı.">
                  <Select aria-label="Hesap" value={cashAccountId} onChange={setCashAccountId} placeholder="— Seçilmedi —"
                    options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.label }))} />
                </Field>
              )}
              <Field label="Açıklama" hint="Boş bırakılırsa sevkiyat numaraları yazılır.">
                <input className="input" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
