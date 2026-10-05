import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react'
import { get, post } from '../api/client'
import type { CompanySettings, CustomerInvoiceDefaults, Invoice, PagedResult, Trip } from '../api/types'
import { Badge, Button, Card, Chip, Empty, Field, IconButton, PageHeader, PlateBadge, Spinner } from '../components/ui'
import { SearchSelect } from '../components/FormSelect'
import { addDaysIso, date, tl2, todayIso } from '../lib/format'
import { useLookup, useSave } from '../lib/hooks'
import { tripStatusLabel, tripStatusTone, vatExemptionOptions, vatRateChoices, withholdingOptions } from '../lib/labels'
import { autoWithholding } from '../lib/tripTerms'
import { ChoiceChips } from '../components/Choice'

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100
/** Tevkifat seçiminde "Otomatik" (sunucuya boş gider, tutara ve müşteriye göre belirlenir). */
const AUTO = -1
const OTHER = 'other'
const dueDays = [0, 15, 30, 60, 90]
/** Faturaya sık eklenen ek kalemler: tıklayınca açıklaması dolu satır eklenir, tutar girilir. */
const quickLines = ['Bekleme ücreti', 'Hamaliye', 'Ek teslim noktası', 'Ardiye']

interface ExtraLine { key: number; description: string; amount: string }

export default function InvoiceCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const customers = useLookup('customers')
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => get<CompanySettings>('/settings') })

  const [customerId, setCustomerId] = useState<number | ''>(params.get('customerId') ? Number(params.get('customerId')) : '')
  const [extra, setExtra] = useState<ExtraLine[]>([])
  const [invDate, setInvDate] = useState(todayIso())
  // Not: kullanıcı yazana kadar müşterinin fatura şablonundaki not (ve seçili hazır not) önerilir.
  const [notesOverride, setNotes] = useState<string | null>(null)
  // Kullanıcı değiştirmediği sürece KDV seçili seferlerden (yoksa firma ayarından), tevkifat "Otomatik" gelir.
  const [vatOverride, setVatRate] = useState<number | null>(null)
  const [withholdingOverride, setWithholding] = useState<number | null>(null)
  const [exemption, setExemption] = useState('311')
  const [dueOverride, setDueDate] = useState<string | null>(null)
  const dueDate = dueOverride ?? (settings.data ? addDaysIso(invDate, settings.data.defaultPaymentTermDays) : '')

  const trips = useQuery({
    queryKey: ['trips', 'uninvoiced', customerId],
    queryFn: () => get<PagedResult<Trip>>('/trips', { customerId, invoiced: false, pageSize: 500, sort: 'loadingDate', desc: false }),
    enabled: customerId !== '',
  })
  const available = useMemo(() => trips.data?.items.filter((t) => t.status !== 'Cancelled') ?? [], [trips.data])
  // Sevkiyatlar'da seçilip "Fatura kes" denildiyse (?tripIds=1,2) o seferler seçili gelir.
  const [preset] = useState(() => ({
    customerId: params.get('customerId') ? Number(params.get('customerId')) : '',
    ids: new Set((params.get('tripIds') ?? '').split(',').map(Number).filter((n) => n > 0)),
  }))
  // Kullanıcı seçim yapana kadar teslim edilmiş seferler seçili gelir; müşteri değişince seçim sıfırlanır.
  const [selection, setSelection] = useState<{ customerId: number | ''; ids: Set<number> } | null>(null)
  const fromList = preset.ids.size > 0 && preset.customerId === customerId
  const selected = selection && selection.customerId === customerId
    ? selection.ids
    : fromList
      ? new Set(available.filter((t) => preset.ids.has(t.id)).map((t) => t.id))
      : new Set(available.filter((t) => t.status === 'Delivered').map((t) => t.id))
  // Listede seçilip burada bulunmayanlar (bu arada faturalanmış ya da iptal edilmiş olabilir).
  const missingFromList = fromList && trips.data ? [...preset.ids].filter((id) => !available.some((t) => t.id === id)).length : 0
  const setSelected = (update: (s: Set<number>) => Set<number>) => setSelection({ customerId, ids: update(selected) })

  const chosen = available.filter((t) => selected.has(t.id))
  // Seçili seferlerin hepsi aynı KDV oranındaysa o oran (ör. uluslararası taşımada %0) önerilir.
  const tripRates = [...new Set(chosen.map((t) => t.terms?.saleVatRate ?? 20))]
  const vatRate = vatOverride ?? (tripRates.length === 1 ? tripRates[0] : settings.data?.defaultVatRate ?? 20)
  const lineAmounts = [
    ...chosen.map((t) => t.salePrice),
    // Müşteriye faturalanan ek masraf ayrı satır olur (KDV dahil girildiyse KDV hariç yazılır; sunucuyla aynı).
    ...chosen.filter((t) => t.terms?.extraChargeInvoiced && t.terms.extraCharge > 0)
      .map((t) => t.terms!.extraChargeVatIncluded && vatRate > 0 ? round2(t.terms!.extraCharge * 100 / (100 + vatRate)) : t.terms!.extraCharge),
    ...extra.map((l) => Number(l.amount) || 0),
  ]
  const subtotal = round2(lineAmounts.reduce((s, a) => s + round2(a), 0))
  // Otomatik tevkifat için müşterinin şirket (10 haneli VKN) olup olmadığı.
  const buyer = useQuery({
    queryKey: ['customers', customerId, 'invoice-defaults', false],
    queryFn: () => get<CustomerInvoiceDefaults>(`/customers/${customerId}/invoice-defaults`, { withholding: false }),
    enabled: customerId !== '',
  })
  const autoTenths = autoWithholding(subtotal, vatRate, buyer.data?.isCompany ?? false)
  const withholdingChoice = withholdingOverride ?? AUTO
  const withholding = withholdingChoice === AUTO ? autoTenths : withholdingChoice
  const vat = round2(subtotal * vatRate / 100)
  const withheld = round2(vat * withholding / 10)
  const total = round2(subtotal + vat - withheld)
  const defaults = useQuery({
    queryKey: ['customers', customerId, 'invoice-defaults', withholding > 0],
    queryFn: () => get<CustomerInvoiceDefaults>(`/customers/${customerId}/invoice-defaults`, { withholding: withholding > 0 }),
    enabled: customerId !== '',
  })
  const notes = notesOverride ?? defaults.data?.notes ?? ''

  const create = useSave((asDraft: boolean) => post<Invoice>('/invoices', {
    customerId, date: invDate, dueDate: dueDate || null, vatRate, withholdingTenths: withholdingChoice === AUTO ? null : withholdingChoice,
    vatExemptionCode: vatRate === 0 ? exemption.trim() || null : null, notes: notes || null, asDraft,
    tripIds: [...selected], extraLines: extra.filter((l) => l.description.trim()).map((l) => ({ description: l.description, amount: Number(l.amount) || 0 })),
  }), {
    invalidate: ['invoices', 'trips', 'customers'], success: 'Fatura oluşturuldu.',
    onSuccess: (inv) => navigate(`/faturalar?id=${inv.id}`),
  })

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allSelected = available.length > 0 && available.every((t) => selected.has(t.id))
  const canSave = customerId !== '' && lineAmounts.length > 0 && extra.every((l) => !l.description.trim() || Number(l.amount) >= 0)
    && (vatRate !== 0 || /^\d{3}$/.test(exemption.trim()))

  return (
    <>
      <PageHeader title="Yeni Fatura" subtitle="Müşteri seçin, faturalanacak sevkiyatları işaretleyin"
        actions={<Button variant="secondary" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/faturalar')}>Faturalar</Button>} />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Müşteri ve Sevkiyatlar" icon={<FileText className="size-4" />}>
            <Field label="Müşteri" required className="mb-4 max-w-md">
              <SearchSelect value={customerId === '' ? null : customerId} onChange={(v) => { setCustomerId(v ?? ''); setExtra([]); setNotes(null) }} placeholder="Müşteri adı yazın veya seçin"
                options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
            </Field>
            {customerId === '' ? <Empty>Faturalanacak sevkiyatları görmek için müşteri seçin.</Empty>
              : trips.isLoading ? <Spinner />
              : <>
                {missingFromList > 0 && <p className="mb-3 rounded-lg bg-amber-50 px-4 py-2.5 text-[0.9375rem] text-amber-900">
                  Sevkiyatlar'da seçilen {missingFromList} sevkiyat burada yok: faturası kesilmiş ya da iptal edilmiş olabilir.</p>}
                {available.length === 0 ? <Empty>Bu müşterinin faturalanmamış sevkiyatı yok. Aşağıdan serbest satır ekleyebilirsiniz.</Empty>
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
                          <td className="td"><input type="checkbox" aria-label={`Sevkiyat ${t.id}`} checked={selected.has(t.id)} onChange={() => toggle(t.id)} onClick={(e) => e.stopPropagation()} /></td>
                          <td className="td">{date(t.loadingDate)}</td>
                          <td className="td">{t.loadingAddress} → {t.deliveryAddress}</td>
                          <td className="td"><PlateBadge plate={t.vehiclePlate} /></td>
                          <td className="td"><Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge></td>
                          <td className="td whitespace-nowrap text-right tabular-nums">{tl2(t.salePrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </>}
          </Card>
          <Card title="Ek Satırlar" actions={<Button write size="sm" variant="secondary" icon={<Plus className="size-3.5" />} disabled={customerId === ''}
            onClick={() => setExtra((x) => [...x, { key: Date.now(), description: '', amount: '' }])}>Satır Ekle</Button>}>
            {customerId !== '' && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-slate-600">Hızlı ekle:</span>
                {quickLines.map((d) => (
                  <Chip key={d} tabIndex={-1}
                    onClick={() => setExtra((x) => [...x, { key: Date.now(), description: d, amount: '' }])}>+ {d}</Chip>
                ))}
              </div>
            )}
            {extra.length === 0 ? <p className="text-sm text-slate-500">Hamaliye, bekleme ücreti gibi ek kalemler ekleyebilirsiniz.</p> : (
              <div className="space-y-2">
                {extra.map((l, i) => (
                  <div key={l.key} className="flex gap-2">
                    <input className="input flex-1" placeholder="Açıklama" aria-label={`Satır ${i + 1} açıklama`} value={l.description}
                      onChange={(e) => setExtra((x) => x.map((y) => y.key === l.key ? { ...y, description: e.target.value } : y))} />
                    <input className="input w-36 text-right" type="number" step="0.01" min="0" placeholder="Tutar" aria-label={`Satır ${i + 1} tutar`} value={l.amount}
                      onChange={(e) => setExtra((x) => x.map((y) => y.key === l.key ? { ...y, amount: e.target.value } : y))} />
                    <IconButton write label="Satırı sil" onClick={() => setExtra((x) => x.filter((y) => y.key !== l.key))}><Trash2 className="size-4" /></IconButton>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Fatura Bilgileri" className="h-fit xl:sticky xl:top-20">
          <div className="space-y-3">
            <Field label="Fatura Tarihi" required><input className="input" type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} /></Field>
            <Field group label="Vade">
              <input className="input" type="date" aria-label="Vade Tarihi" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <div className="mt-2">
                <ChoiceChips label="Vade günü" value={dueDays.find((d) => addDaysIso(invDate, d) === dueDate) ?? ''}
                  onChange={(d) => setDueDate(addDaysIso(invDate, d))}
                  options={dueDays.map((d) => ({ value: d, label: d === 0 ? 'Peşin' : `${d} gün` }))} />
              </div>
            </Field>
            <Field group label="KDV oranı">
              <ChoiceChips label="KDV oranı" value={vatRate} onChange={setVatRate} options={vatRateChoices(vatRate).map((v) => ({ value: v, label: `%${v}` }))} />
            </Field>
            {vatRate === 0 && (
              <Field label="İstisna kodu" hint="Yurt dışı taşımada 311.">
                <select className="input" value={vatExemptionOptions.some((o) => o.value === exemption) ? exemption : OTHER}
                  onChange={(e) => setExemption(e.target.value === OTHER ? '' : e.target.value)}>
                  {vatExemptionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  <option value={OTHER}>Diğer</option>
                </select>
                {!vatExemptionOptions.some((o) => o.value === exemption) && (
                  <input className="input mt-2" inputMode="numeric" maxLength={3} placeholder="Kod (3 hane)" aria-label="İstisna kodu (diğer)"
                    value={exemption} onChange={(e) => setExemption(e.target.value.replace(/\D/g, ''))} />
                )}
              </Field>
            )}
            <Field group label="KDV tevkifatı" hint={withholdingChoice === AUTO
              ? `Otomatik: ${autoTenths > 0 ? `${autoTenths}/10 uygulanıyor` : 'tevkifat yok'} (KDV dahil 12.000 TL üstü ve VKN'li müşteride 2/10).`
              : undefined}>
              <ChoiceChips label="KDV tevkifatı" value={withholdingChoice} onChange={setWithholding}
                options={[{ value: AUTO, label: 'Otomatik' }, ...withholdingOptions]} />
            </Field>
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
