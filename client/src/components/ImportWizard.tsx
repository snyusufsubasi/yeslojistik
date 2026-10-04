import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import clsx from 'clsx'
import { api, download, errorMessage } from '../api/client'
import { Badge, Button, Chip, Figure, Figures } from './ui'
import { errorReportCsv, statusInfo, wizardEntities, type ImportResult, type ImportRowInfo, type WizardEntity } from '../lib/importMeta'

const MAX_BYTES = 5 * 1024 * 1024
const SHOW_LIMIT = 200

type Filter = 'problem' | 'all'

function saveText(name: string, text: string) {
  const href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

/**
 * Adım adım içe aktarma: şablon indir → dosya seç (xlsx/csv) → önizleme (kaç satır hazır, uyarılı, hatalı, tekrar) → yalnız geçerli satırları aktar.
 * Hatalı satırlar hiçbir zaman aktarılmaz; sebepleri satır numarasıyla gösterilir ve CSV olarak indirilebilir.
 */
export function ImportWizard({ entity, onImported }: { entity: WizardEntity; onImported?: (created: number) => void }) {
  const meta = wizardEntities.find((e) => e.value === entity)!
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('problem')

  const run = useMutation({
    mutationFn: async ({ f, dryRun }: { f: File; dryRun: boolean }) => {
      const form = new FormData()
      form.append('file', f)
      return (await api.post<ImportResult>(`/import/${entity}?dryRun=${dryRun}&skipInvalid=true`, form)).data
    },
    onSuccess: (r, { dryRun }) => {
      setFileError(null)
      setResult(r)
      if (!dryRun) {
        for (const key of [entity, 'customers', 'suppliers', 'vehicles', 'drivers', 'dashboard', 'alerts']) qc.invalidateQueries({ queryKey: [key] })
        onImported?.(r.created)
      }
    },
    onError: (e) => {
      setResult(null)
      setFileError(errorMessage(e))
    },
  })

  const reset = () => {
    setFile(null)
    setResult(null)
    setFileError(null)
    if (input.current) input.current.value = ''
  }

  const pick = (f?: File) => {
    if (!f) return
    setResult(null)
    setFilter('problem')
    if (f.size > MAX_BYTES) {
      setFile(f)
      setFileError(`Dosya çok büyük (${(f.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB). En fazla 5 MB yükleyebilirsiniz; dosyayı ikiye bölün.`)
      return
    }
    setFile(f)
    setFileError(null)
    run.mutate({ f, dryRun: true })
  }

  const rows = result?.rows ?? []
  const count = (s: ImportRowInfo['status']) => rows.filter((r) => r.status === s).length
  const done = !!result && !result.dryRun
  const problems = rows.filter((r) => r.status !== 'ok')
  const shown = (filter === 'problem' && problems.length > 0 ? problems : rows).slice(0, SHOW_LIMIT)
  const shownTotal = filter === 'problem' && problems.length > 0 ? problems.length : rows.length
  const errorCount = count('error')

  return (
    <div className="space-y-5">
      <ol className="space-y-4 text-[0.9375rem]">
        <li>
          <div className="mb-1 font-semibold">1. Şablonu indirin ve doldurun</div>
          <Button size="sm" variant="secondary" icon={<Download className="size-3.5" />}
            onClick={() => download(`/import/${entity}/template`, undefined, `${entity}-sablon.xlsx`)}>Şablonu indir</Button>
          <p className="mt-1.5 text-[0.8125rem] text-muted">{meta.hint} Şablondaki iki örnek satırı silip kendi kayıtlarınızı yazın. Kendi Excel/CSV dosyanız varsa sütun adları şablona benziyorsa o da okunur.</p>
        </li>
        <li>
          <div className="mb-1 font-semibold">2. Dosyayı seçin (Excel .xlsx ya da .csv)</div>
          <input ref={input} type="file" accept=".xlsx,.csv,text/csv" className="hidden" aria-label="Excel veya CSV dosyası" onChange={(e) => pick(e.target.files?.[0])} />
          <Button size="sm" variant="secondary" icon={<Upload className="size-3.5" />} loading={run.isPending && !done} onClick={() => input.current?.click()}>
            {file ? 'Başka dosya seç' : 'Dosya seç'}
          </Button>
          {file && <span className="ml-2 inline-flex items-center gap-1 text-[0.875rem] text-muted"><FileSpreadsheet className="size-4" />{file.name}</span>}
          <p className="mt-1.5 text-[0.8125rem] text-muted">En fazla 5.000 satır ve 5 MB. Dosya seçince önce kontrol edilir; henüz hiçbir şey kaydedilmez.</p>
        </li>
      </ol>

      {fileError && (
        <div role="alert" className="flex items-start gap-2 rounded-[4px] border border-[#e8b9b5] bg-bad-soft px-3 py-2.5 text-[0.875rem] text-bad">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{fileError}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3" aria-live="polite">
          <div className="font-semibold">{done ? '3. Sonuç' : '3. Kontrol sonucu'}</div>
          {done ? (
            <div role="status" className="flex items-start gap-2 rounded-[4px] border border-[#b7dcc6] bg-good-soft px-3 py-2.5 text-[0.9375rem] text-good">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <span>
                <b>{result.created} {meta.one} eklendi.</b>
                {result.skipped > 0 && <> {result.skipped} satır zaten kayıtlı olduğu için atlandı.</>}
                {errorCount > 0 && <> {new Set(result.errors.map((e) => e.row)).size} hatalı satır aktarılmadı; hata raporunu indirip düzeltin ve tekrar yükleyin.</>}
              </span>
            </div>
          ) : (
            <Figures label="Kontrol özeti" className="grid-cols-2 sm:grid-cols-5">
              <Figure label="Toplam satır" value={result.totalRows} />
              <Figure label="Aktarılacak" value={count('ok') + count('warning')} tone="text-good" />
              <Figure label="Uyarılı" value={count('warning')} tone={count('warning') ? 'text-warn' : undefined} sub="yine de aktarılır" />
              <Figure label="Hatalı" value={errorCount} tone={errorCount ? 'text-bad' : undefined} sub="aktarılmaz" />
              <Figure label="Tekrar" value={count('duplicate')} sub="zaten var, atlanır" />
            </Figures>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Chip active={filter === 'problem'} onClick={() => setFilter('problem')}>Sorunlu satırlar ({problems.length})</Chip>
                <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Tüm satırlar ({rows.length})</Chip>
                {problems.length > 0 && (
                  <Button size="sm" variant="secondary" className="ml-auto" icon={<Download className="size-3.5" />}
                    onClick={() => saveText(`hata-raporu-${entity}.csv`, errorReportCsv(rows))}>Hata raporunu indir (CSV)</Button>
                )}
              </div>
              <div className="max-h-80 overflow-auto rounded-[4px] border border-line">
                <table className="w-full">
                  <thead><tr><th className="th w-16">Satır</th><th className="th w-24">Durum</th><th className="th">Kayıt</th><th className="th">Açıklama</th></tr></thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.row} data-status={r.status}>
                        <td className="td font-mono">{r.row}</td>
                        <td className="td"><Badge tone={statusInfo[r.status].tone}>{statusInfo[r.status].label}</Badge></td>
                        <td className="td">{r.label ?? '—'}</td>
                        <td className={clsx('td whitespace-normal', r.status === 'error' && 'text-bad')}>{r.message ?? (r.status === 'ok' ? 'Sorun yok.' : '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {shownTotal > SHOW_LIMIT && <p className="text-[0.8125rem] text-muted">İlk {SHOW_LIMIT} satır gösteriliyor; tamamı için hata raporunu indirin.</p>}
            </>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!done && (
              <Button loading={run.isPending} disabled={count('ok') + count('warning') === 0} onClick={() => file && run.mutate({ f: file, dryRun: false })}>
                {errorCount > 0 ? `Geçerli ${count('ok') + count('warning')} satırı içe aktar` : `İçe aktar (${count('ok') + count('warning')} ${meta.one})`}
              </Button>
            )}
            {!done && errorCount > 0 && <span className="text-[0.8125rem] text-muted">Hatalı satırlar atlanır; sonra düzeltip aynı dosyayı yükleyebilirsiniz (olanlar tekrar eklenmez).</span>}
            {!done && errorCount === 0 && count('ok') + count('warning') === 0 && <span className="text-[0.8125rem] text-muted">Aktarılacak yeni kayıt yok.</span>}
            {done && <Link to={meta.list} className="inline-flex min-h-9 items-center rounded-[3px] bg-accent px-3.5 text-[0.875rem] font-semibold text-white hover:opacity-90">{meta.label} listesine git</Link>}
            <Button variant="secondary" icon={<RotateCcw className="size-3.5" />} onClick={reset}>{done ? 'Başka dosya aktar' : 'Vazgeç'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
