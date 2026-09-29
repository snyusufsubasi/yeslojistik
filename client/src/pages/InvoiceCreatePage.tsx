import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react'
import { get, post } from '../api/client'
import type { CompanySettings, Invoice, PagedResult, Trip } from '../api/types'
import { Badge, Button, Card, Empty, Field, IconButton, PageHeader, Select, Spinner } from '../components/ui'
import { SearchSelect } from '../components/FormSelect'
import { addDaysIso, date, tl2, todayIso } from '../lib/format'
import { useLookup, useSave } from '../lib/hooks'
import { tripStatusLabel, tripStatusTone, withholdingOptions } from '../lib/labels'

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

interface ExtraLine { key: number; description: string; amount: string }

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const customers = useLookup('customers')
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => get<CompanySettings>('/settings') })

  const [customerId, setCustomerId] = useState<number | ''>(params.get('customerId') ? Number(params.get('customerId')) : '')
  const [extra, setExtra] = useState<ExtraLine[]>([])
  const [invDate, setInvDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  // Kullanıcı değiştirmediği sürece varsayılanlar firma ayarlarından gelir.
  const [vatOverride, setVatRate] = useState<number | null>(null)
  const [withholdingOverride, setWithholding] = useState<number | null>(null)
  const [dueOverride, setDueDate] = useState<string | null>(null)
  const vatRate = vatOverride ?? settings.data?.defaultVatRate ?? 20
  const withholding = withholdingOverride ?? settings.data?.defaultWithholdingTenths ?? 0
  const dueDate = dueOverride ?? (settings.data ? addDaysIso(invDate, settings.data.defaultPaymentTermDays) : '')

  const trips = useQuery({
    queryKey: ['trips', 'uninvoiced', customerId],
    queryFn: () => get<PagedResult<Trip>>('/trips', { customerId, invoiced: false, pageSize: 500, sort: 'loadingDate', desc: false }),
    enabled: customerId !== '',
  })
  const available = useMemo(() => trips.data?.items.filter((t) => t.status !== 'Cancelled') ?? [], [trips.data])
  // Kullanıcı seçim yapana kadar teslim edilmiş seferler seçili gelir; müşteri değişince seçim sıfırlanır.
  const [selection, setSelection] = useState<{ customerId: number | ''; ids: Set<number> } | null>(null)
  const selected = selection && selection.customerId === customerId
    ? selection.ids
    : new Set(available.filter((t) => t.status === 'Delivered').map((t) => t.id))
  const setSelected = (update: (s: Set<number>) => Set<number>) => setSelection({ customerId, ids: update(selected) })

  const lineAmounts = [
    ...available.filter((t) => selected.has(t.id)).map((t) => t.salePrice),
    ...extra.map((l) => Number(l.amount) || 0),
  ]
  const subtotal = round2(lineAmounts.reduce((s, a) => s + round2(a), 0))
  const vat = round2(subtotal * vatRate / 100)
  const withheld = round2(vat * withholding / 10)
  const total = round2(subtotal + vat - withheld)

  const create = useSave((asDraft: boolean) => post<Invoice>('/invoices', {
    customerId, date: invDate, dueDate: dueDate || null, vatRate, withholdingTenths: withholding, notes: notes || null, asDraft,
    tripIds: [...selected], extraLines: extra.filter((l) => l.description.trim()).map((l) => ({ description: l.description, amount: Number(l.amount) || 0 })),
  }), {
    invalidate: ['invoices', 'trips', 'customers'], success: 'Fatura oluşturuldu.',
    onSuccess: (inv) => navigate(`/faturalar?id=${inv.id}`),
  })

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allSelected = available.length > 0 && available.every((t) => selected.has(t.id))
  const canSave = customerId !== '' && lineAmounts.length > 0 && extra.every((l) => !l.description.trim() || Number(l.amount) >= 0)

  return (
    <>
      <PageHeader title="Yeni Fatura" subtitle="Müşteri seçin, faturalanacak seferleri işaretleyin"
        actions={<Button variant="secondary" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/faturalar')}>Faturalar</Button>} />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Müşteri ve Seferler" icon={<FileText className="size-4" />}>
            <Field label="Müşteri" required className="mb-4 max-w-md">
              <SearchSelect value={customerId === '' ? null : customerId} onChange={(v) => { setCustomerId(v ?? ''); setExtra([]) }} placeholder="Müşteri adı yazın veya seçin"
                options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
            </Field>
            {customerId === '' ? <Empty>Faturalanacak seferleri görmek için müşteri seçin.</Empty>
              : trips.isLoading ? <Spinner />
              : available.length === 0 ? <Empty>Bu müşterinin faturalanmamış seferi yok. Aşağıdan serbest satır ekleyebilirsiniz.</Empty>
              : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full">
                    <thead><tr>
                      <th className="th w-8"><input type="checkbox" aria-label="Tümünü seç" checked={allSelected}
                        onChange={() => setSelected(() => allSelected ? new Set() : new Set(available.map((t) => t.id)))} /></th>
                      <th className="th">Tarih</th><th className="th">Güzergah</th><th className="th">Plaka</th><th className="th">Durum</th><th className="th text-right">Tutar</th>
                    </tr></thead>
                    <tbody>
                      {available.map((t) => (
                        <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => toggle(t.id)}>
                          <td className="td"><input type="checkbox" aria-label={`Sefer ${t.id}`} checked={selected.has(t.id)} onChange={() => toggle(t.id)} onClick={(e) => e.stopPropagation()} /></td>
                          <td className="td">{date(t.loadingDate)}</td>
                          <td className="td">{t.loadingAddress} → {t.deliveryAddress}</td>
                          <td className="td">{t.vehiclePlate}</td>
                          <td className="td"><Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge></td>
                          <td className="td text-right">{tl2(t.salePrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
          <Card title="Ek Satırlar" actions={<Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} disabled={customerId === ''}
            onClick={() => setExtra((x) => [...x, { key: Date.now(), description: '', amount: '' }])}>Satır Ekle</Button>}>
            {extra.length === 0 ? <p className="text-sm text-slate-500">Hamaliye, bekleme ücreti gibi ek kalemler ekleyebilirsiniz.</p> : (
              <div className="space-y-2">
                {extra.map((l, i) => (
                  <div key={l.key} className="flex gap-2">
                    <input className="input flex-1" placeholder="Açıklama" aria-label={`Satır ${i + 1} açıklama`} value={l.description}
                      onChange={(e) => setExtra((x) => x.map((y) => y.key === l.key ? { ...y, description: e.target.value } : y))} />
                    <input className="input w-36 text-right" type="number" step="0.01" min="0" placeholder="Tutar" aria-label={`Satır ${i + 1} tutar`} value={l.amount}
                      onChange={(e) => setExtra((x) => x.map((y) => y.key === l.key ? { ...y, amount: e.target.value } : y))} />
                    <IconButton label="Satırı sil" onClick={() => setExtra((x) => x.filter((y) => y.key !== l.key))}><Trash2 className="size-4" /></IconButton>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Fatura Bilgileri" className="h-fit xl:sticky xl:top-20">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fatura Tarihi" required><input className="input" type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} /></Field>
              <Field label="Vade Tarihi"><input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
              <Field label="KDV (%)">
                <Select value={vatRate} onChange={(v) => setVatRate(v === '' ? 0 : v)} options={[0, 1, 10, 20].map((v) => ({ value: v, label: `%${v}` }))} />
              </Field>
              <Field label="KDV Tevkifatı">
                <Select value={withholding} onChange={(v) => setWithholding(v === '' ? 0 : v)} options={withholdingOptions} />
              </Field>
            </div>
            <Field label="Not"><textarea className="input min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
              <Line label={`Ara Toplam (${lineAmounts.length} kalem)`} value={subtotal} />
              <Line label={`KDV (%${vatRate})`} value={vat} />
              {withholding > 0 && withheld > 0 && <Line label={`Tevkifat (${withholding}/10)`} value={-withheld} />}
              <div className="border-t border-slate-200 pt-1 text-[0.9375rem] font-semibold text-navy-900"><Line label="Ödenecek Tutar" value={total} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={!canSave} loading={create.isPending && create.variables === true} onClick={() => create.mutate(true)}>Taslak Kaydet</Button>
              <Button className="flex-1" disabled={!canSave} loading={create.isPending && create.variables === false} onClick={() => create.mutate(false)}>Faturayı Kes</Button>
            </div>
            <p className="text-sm text-slate-500">Bu fatura sistem içi kayıttır. Resmi e-Fatura/e-Arşiv mevcut muhasebe programınızdan kesilmeye devam eder.</p>
          </div>
        </Card>
      </div>
    </>
  )
}

function Line({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-2"><span>{label}</span><span className="tabular-nums">{tl2(value)}</span></div>
}
