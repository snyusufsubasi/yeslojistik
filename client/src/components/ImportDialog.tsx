import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { api, download, errorMessage } from '../api/client'
import { useToast } from './Toast'
import { Button, Modal } from './ui'

export type ImportEntity = 'customers' | 'vehicles' | 'drivers' | 'suppliers' | 'trips' | 'job-requests' | 'invoices' | 'payments' | 'supplier-payments' | 'expenses' | 'cash-accounts' | 'staff'
type Entity = ImportEntity
interface ImportResult {
  totalRows: number
  created: number
  skipped: number
  errors: { row: number; message: string }[]
  warnings: string[]
  dryRun: boolean
}

const titles: Record<Entity, string> = {
  customers: 'Müşteri', vehicles: 'Araç', drivers: 'Şoför', suppliers: 'Tedarikçi', trips: 'Sevkiyat',
  'job-requests': 'İş Talebi', invoices: 'Fatura', payments: 'Tahsilat', 'supplier-payments': 'Ödeme', expenses: 'Gider', 'cash-accounts': 'Banka / Kasa Hesabı', staff: 'Personel',
}

const hints: Partial<Record<Entity, string>> = {
  customers: '“Devir Bakiyesi” sütununa müşterinin eski sistemden devreden borcunu yazabilirsiniz.',
  suppliers: '“Devir Borcu” sütununa firmanın bu tedarikçiye olan borcunu yazabilirsiniz.',
  vehicles: 'Kiralık araçlarda “Araç Sahibi” sütununa tedarikçi ünvanını yazın (önce tedarikçileri aktarın).',
  drivers: 'Taşeronun şoförüyse “Tedarikçi” sütununa tedarikçi ünvanını yazın; kendi şoförünüzse boş bırakın.',
  trips: 'Geçmiş sevkiyatlar içindir. Müşteri, plaka ve şoför sistemde kayıtlı olmalı. Aynı sevkiyat iki kez aktarılmaz.',
  'job-requests': 'Henüz sevk edilmemiş (ya da iptal edilmiş) talepler içindir. Müşteriler önce aktarılmış olmalı.',
  invoices: 'Eski sistemde kesilmiş faturalar içindir; numarası korunur, e-Fatura gönderilmez. “Toplam” yazarsanız hesaplananla karşılaştırılır.',
  payments: 'Müşterilerden alınan eski tahsilatlar. “Fatura No” yazarsanız o faturaya bağlanır (önce faturaları aktarın).',
  'supplier-payments': 'Taşeronlara ve diğer tedarikçilere yapılmış eski ödemeler. Tedarikçiler önce aktarılmış olmalı.',
  'cash-accounts': 'Kasa ve banka hesapları, eski sistemdeki güncel bakiyeleriyle (“Devir Bakiyesi”). Aynı adlı hesap iki kez açılmaz.',
  staff: 'Ofis ve depo personeli, aylık maaşıyla. Şoförler buraya değil Şoförler sayfasına aktarılır.',
  expenses: 'Eski giderler. “Vadeli: Evet” olanlar tedarikçiye borç yazılır. Plaka ve şoför sistemde kayıtlı olmalı.',
}

export function ImportButton({ entity }: { entity: Entity }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button write variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => setOpen(true)}>Excel'den Aktar</Button>
      {open && <ImportDialog entity={entity} onClose={() => setOpen(false)} />}
    </>
  )
}

export function ImportDialog({ entity, onClose }: { entity: Entity; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const run = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const form = new FormData()
      form.append('file', file!)
      return (await api.post<ImportResult>(`/import/${entity}?dryRun=${dryRun}`, form)).data
    },
    onSuccess: (r, dryRun) => {
      setResult(r)
      if (!dryRun && !r.dryRun) {
        toast.success(`${r.created} kayıt aktarıldı.`)
        qc.invalidateQueries({ queryKey: [entity] })
        // Fatura, tahsilat ve ödemeler cari bakiyeleri değiştirir.
        qc.invalidateQueries({ queryKey: ['customers'] })
        qc.invalidateQueries({ queryKey: ['suppliers'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const pick = (f?: File) => {
    if (!f) return
    setFile(f)
    setResult(null)
  }
  const checked = result?.dryRun && result.errors.length === 0
  const done = result && !result.dryRun

  return (
    <Modal open onClose={onClose} title={`Excel'den ${titles[entity]} Aktarımı`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{done ? 'Kapat' : 'Vazgeç'}</Button>
        {!done && (checked
          ? <Button loading={run.isPending} onClick={() => run.mutate(false)}>{result!.created} Kaydı Aktar</Button>
          : <Button disabled={!file} loading={run.isPending} onClick={() => run.mutate(true)}>Kontrol Et</Button>)}
      </>}>
      <ol className="space-y-4 text-sm">
        <li>
          <div className="mb-1 font-medium">1. Şablonu indirip doldurun</div>
          <Button size="sm" variant="secondary" icon={<Download className="size-3.5" />}
            onClick={() => download(`/import/${entity}/template`, undefined, `${entity}-sablon.xlsx`)}>Şablonu İndir</Button>
          {hints[entity] && <p className="mt-1 text-sm text-slate-500">{hints[entity]}</p>}
          <p className="mt-1 text-sm text-slate-500">Aktarım sırası: 1 Tedarikçiler → 2 Müşteriler → 3 Şoförler → 4 Araçlar → 5 Sevkiyatlar.</p>
        </li>
        <li>
          <div className="mb-1 font-medium">2. Doldurduğunuz dosyayı seçin</div>
          <input ref={input} type="file" accept=".xlsx" className="hidden" aria-label="Excel dosyası" onChange={(e) => pick(e.target.files?.[0])} />
          <Button size="sm" variant="secondary" icon={<Upload className="size-3.5" />} onClick={() => input.current?.click()}>Dosya Seç</Button>
          {file && <span className="ml-2 text-slate-600">{file.name}</span>}
        </li>
        <li>
          <div className="mb-1 font-medium">3. Kontrol edin ve aktarın</div>
          <p className="text-sm text-slate-500">Önce kontrol edilir; hatalı satır varsa hiçbir kayıt aktarılmaz. Sistemde zaten olan kayıtlar atlanır.</p>
        </li>
      </ol>

      {result && (
        <div className="mt-4 space-y-3">
          <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${result.errors.length ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
            {result.errors.length ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
            {result.errors.length
              ? `${result.totalRows} satırdan ${new Set(result.errors.map((e) => e.row)).size} tanesinde hata var. Düzeltip tekrar yükleyin.`
              : done ? `${result.created} kayıt aktarıldı, ${result.skipped} satır atlandı.`
              : `${result.totalRows} satır kontrol edildi: ${result.created} yeni kayıt aktarılmaya hazır, ${result.skipped} satır atlanacak.`}
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
              <table className="w-full">
                <thead><tr><th className="th w-16">Satır</th><th className="th">Hata</th></tr></thead>
                <tbody>{result.errors.map((e, i) => <tr key={i}><td className="td">{e.row}</td><td className="td whitespace-normal">{e.message}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {result.warnings.length > 0 && (
            <ul className="max-h-32 list-inside list-disc overflow-y-auto text-sm text-amber-700">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}
