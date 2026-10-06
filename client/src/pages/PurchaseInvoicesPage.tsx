import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Ban, FileInput, Paperclip, Pencil, Plus } from 'lucide-react'
import { api as apiClient, errorMessage, get, openPdf, post } from '../api/client'
import type { PurchaseInvoice, PurchaseInvoiceKind, PurchaseInvoiceTotals, UninvoicedCarrierTrip } from '../api/types'
import { ExportButton } from '../components/Exports'
import { SumStrip } from '../components/SumStrip'
import { PageShell } from '../components/shell/PageShell'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, ConfirmDialog, DateFilter, Field, IconButton, Modal, PlateBadge, Select } from '../components/ui'
import { FormSelect } from '../components/FormSelect'
import { ControlledChoice } from '../components/Choice'
import { AmountInput, DateQuick } from '../components/Inputs'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { applyServerErrors, idField, money, optStr, req } from '../lib/forms'
import { date, tl2, todayIso } from '../lib/format'
import { crud, useDebounce, useListTotals, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { options, purchaseInvoiceKindLabel, vatRates } from '../lib/labels'
import { grossAmount } from '../lib/tripTerms'

const api = crud<PurchaseInvoice, unknown>('purchase-invoices')

/** Tedarikçiden alınan faturalar (taşeron nakliye faturaları, servis, yakıt). */
export default function PurchaseInvoicesPage() {
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [kind, setKind] = useState<PurchaseInvoiceKind | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editing, setEditing] = useState<PurchaseInvoice | 'new' | null>(null)
  const [cancelling, setCancelling] = useState<PurchaseInvoice | null>(null)
  useOpenNewFromUrl(() => setEditing('new'))
  const debounced = useDebounce(search)
  const suppliers = useLookup('suppliers')
  const toast = useToast()
  const [page, setPage] = usePage([debounced, supplierId, kind, from, to])
  const query = { page, pageSize: 20, search: debounced, supplierId, kind, from, to }
  const { data, isFetching, error, refetch } = usePaged<PurchaseInvoice>('purchase-invoices', query)
  const cancelMut = useSave((id: number) => post<PurchaseInvoice>(`/purchase-invoices/${id}/cancel`, { reason: null }), {
    invalidate: ['purchase-invoices', 'suppliers', 'trips'], success: 'Fatura iptal edildi; sevkiyatları yeniden fatura bekliyor.', onSuccess: () => setCancelling(null),
  })

  const columns: Column<PurchaseInvoice>[] = [
    { key: 'date', header: 'Tarih', render: (p) => date(p.date) },
    { key: 'supplier', header: 'Tedarikçi', className: 'whitespace-normal! min-w-40', render: (p) => <span className="font-medium">{p.supplierTitle}</span> },
    { key: 'no', header: 'Fatura No', render: (p) => <>{p.invoiceNo}<span className="block text-sm text-slate-500">{purchaseInvoiceKindLabel[p.kind]}</span></> },
    { key: 'trips', header: 'Sevkiyat', className: 'whitespace-normal! min-w-24', render: (p) => p.trips.length
      ? <span className="text-sm">{p.trips.map((t) => t.externalRef ?? t.tripId).join(', ')}</span> : <span className="text-sm text-slate-500">—</span> },
    { key: 'subtotal', header: 'Matrah', align: 'right', render: (p) => tl2(p.subtotal) },
    { key: 'vat', header: 'KDV', align: 'right', render: (p) => tl2(p.vatAmount) },
    { key: 'wh', header: 'Tevkifat', align: 'right', render: (p) => p.withholdingAmount ? tl2(p.withholdingAmount) : '—' },
    { key: 'total', header: 'Genel Tutar', align: 'right', render: (p) => <span className="font-medium">{tl2(p.total)}</span> },
  ]
  columns.push({
    key: 'actions', header: '', align: 'right', render: (p) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {p.hasFile && <IconButton label="Faturayı aç" onClick={() => openPdf(`/purchase-invoices/${p.id}/file`, `${p.invoiceNo}.pdf`).catch((e) => toast.error(errorMessage(e)))}><Paperclip className="size-4" /></IconButton>}
        {can('accounting') && <IconButton write label="Düzenle" onClick={() => setEditing(p)}><Pencil className="size-4" /></IconButton>}
        {can('accounting') && <IconButton write label="İptal et" onClick={() => setCancelling(p)}><Ban className="size-4" /></IconButton>}
      </div>
    ),
  })
  const { data: totals } = useListTotals<PurchaseInvoiceTotals>('purchase-invoices', query)

  return (
    <>
      <PageShell title="Alınan Faturalar" subtitle="Taşerondan ve tedarikçilerden gelen faturalar; bağlanan sevkiyatlar fatura bekleyenlerden düşer"
        primary={can('accounting') ? <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Fatura Ekle</Button> : undefined}
        actions={<>
          <ExportButton url="/purchase-invoices/export" params={query} fileName="alinan-faturalar.xlsx" />
          {can('accounting') && <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Fatura Ekle</Button>}
        >}>
      <Card title="Fatura Listesi" icon={<FileInput className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Fatura no, tedarikçi, VKN..." />}>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Tedarikçi" value={supplierId} onChange={setSupplierId} placeholder="Tüm tedarikçiler"
            options={(suppliers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <Select aria-label="Tür" value={kind} onChange={setKind} placeholder="Tüm türler" options={options(purchaseInvoiceKindLabel)} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
        </div>
        {totals && totals.count > 0 && <SumStrip label="Alınan fatura toplamları" items={[
          { label: 'Fatura', value: totals.count },
          { label: 'Matrah', value: tl2(totals.subtotal) },
          { label: 'KDV', value: tl2(totals.vatAmount) },
          { label: 'Tevkifat', value: tl2(totals.withholdingAmount) },
          { label: 'Genel tutar', value: tl2(totals.total) },
        ]} />}
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(p) => p.id}
          onRowClick={can('accounting') ? setEditing : undefined}
          page={page} total={data?.total} onPage={setPage}
          empty={debounced || supplierId || kind || from || to ? 'Aramanıza uyan fatura yok.' : 'Henüz alınan fatura yok. Taşerondan fatura gelince “Fatura Ekle” ile sevkiyatlara bağlayın.'} />
      </Card>
      </PageShell>
      {editing && <PurchaseInvoiceForm invoice={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!cancelling} title="Faturayı iptal et" loading={cancelMut.isPending} confirmText="İptal et"
        message={<>{cancelling?.supplierTitle} – {cancelling?.invoiceNo} iptal edilecek. Bağlı sevkiyatlar yeniden “fatura bekleyen” olur ve borç sevkiyat tutarından hesaplanır.</>}
        onClose={() => setCancelling(null)} onConfirm={() => cancelling && cancelMut.mutate(cancelling.id)} />
    </>
  )
}

const schema = z.object({
  supplierId: idField('Tedarikçi seçin.'),
  invoiceNo: req('Fatura numarası zorunlu.'),
  date: req('Tarih zorunlu.'),
  dueDate: optStr,
  kind: z.enum(['EInvoice', 'EArchive', 'Paper', 'Receipt']),
  subtotal: money(),
  vatAmount: money(),
  withholdingAmount: money(),
  notes: optStr,
})
type FormValues = z.infer<typeof schema>

/** Alınan fatura formu: tedarikçinin fatura bekleyen seferleri işaretlenir, matrah bunlardan önerilir. */
function PurchaseInvoiceForm({ invoice, onClose, supplierId: fixedSupplier }: { invoice: PurchaseInvoice | null; onClose: () => void; supplierId?: number }) {
  const toast = useToast()
  const suppliers = useLookup('suppliers')
  const [tripIds, setTripIds] = useState<number[]>(invoice?.trips.map((t) => t.tripId) ?? [])
  const [file, setFile] = useState<File | null>(null)
  const [vatRate, setVatRate] = useState(20)
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: invoice ? {
      supplierId: invoice.supplierId, invoiceNo: invoice.invoiceNo, date: invoice.date, dueDate: invoice.dueDate ?? '', kind: invoice.kind,
      subtotal: invoice.subtotal, vatAmount: invoice.vatAmount, withholdingAmount: invoice.withholdingAmount, notes: invoice.notes ?? '',
    } : { supplierId: fixedSupplier, date: todayIso(), dueDate: '', kind: 'EInvoice', subtotal: 0, vatAmount: 0, withholdingAmount: 0, notes: '' },
  })
  const supplierId = useWatch({ control, name: 'supplierId' })
  const subtotal = Number(useWatch({ control, name: 'subtotal' })) || 0
  const vat = Number(useWatch({ control, name: 'vatAmount' })) || 0
  const withholding = Number(useWatch({ control, name: 'withholdingAmount' })) || 0
  const validSupplier = !!supplierId && !Number.isNaN(supplierId)
  const trips = useQuery({
    queryKey: ['purchase-invoices', 'uninvoiced', supplierId, invoice?.id],
    queryFn: () => get<UninvoicedCarrierTrip[]>('/purchase-invoices/uninvoiced-trips', { supplierId, invoiceId: invoice?.id }),
    enabled: validSupplier,
  })

  // KDV ve tevkifat, kullanıcı bu kutulara elle yazana kadar matrahtan hesaplanır (kayıtlı faturada elle girilmiş sayılır).
  const [taxEdited, setTaxEdited] = useState(!!invoice)
  /** Matrahtan KDV ve otomatik tevkifat: KDV dahil 12.000 TL'yi aşarsa 2/10 (alıcı biziz, şirket). */
  const fillTax = (base: number, rate: number) => {
    const g = grossAmount(base, rate, null)
    const opts = { shouldDirty: true, shouldValidate: true }
    setValue('vatAmount', g.vat, opts)
    setValue('withholdingAmount', g.withholding, opts)
  }
  /** Seçilen seferlerden matrah, KDV ve (tutar 12.000'i aşarsa) 2/10 tevkifat önerir. */
  const fillFromTrips = (ids: number[], rate = vatRate) => {
    const selected = (trips.data ?? []).filter((t) => ids.includes(t.tripId))
    if (!selected.length) return
    const base = selected.reduce((a, t) => a + t.vehicleCost, 0)
    setValue('subtotal', base, { shouldDirty: true, shouldValidate: true })
    fillTax(base, rate)
  }
  const changeRate = (rate: number) => {
    setVatRate(rate)
    setTaxEdited(false)
    if (tripIds.length) fillFromTrips(tripIds, rate)
    else fillTax(subtotal, rate)
  }
  const toggle = (id: number) => {
    const next = tripIds.includes(id) ? tripIds.filter((x) => x !== id) : [...tripIds, id]
    setTripIds(next)
    fillFromTrips(next)
  }

  const save = useSave(async (v: FormValues) => {
    const body = { ...v, dueDate: v.dueDate || null, notes: v.notes || null, tripIds }
    const saved = invoice ? await api.update(invoice.id, body) : await api.create(body)
    if (file) {
      const form = new FormData()
      form.append('file', file)
      try { await apiClient.post(`/purchase-invoices/${saved.id}/file`, form) } catch (e) { toast.error(`Fatura kaydedildi ama dosya yüklenemedi: ${errorMessage(e)}`) }
    }
    return saved
  }, {
    invalidate: ['purchase-invoices', 'suppliers', 'trips'], success: invoice ? 'Fatura güncellendi.' : 'Fatura eklendi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  const pending = trips.data ?? []

  return (
    <Modal open onClose={onClose} title={invoice ? `Fatura ${invoice.invoiceNo}` : 'Alınan Fatura Ekle'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Tedarikçi" required error={errors.supplierId?.message}>
            <FormSelect control={control} name="supplierId" placeholder="Tedarikçi ara" disabled={!!fixedSupplier} onValueChange={() => setTripIds([])}
              options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.label }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fatura No" required error={errors.invoiceNo?.message}><input className="input uppercase" placeholder="GIB2026000000178" {...register('invoiceNo')} /></Field>
            <Field label="Fatura Tarihi" required error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
          </div>
          <Field group label="Tür">
            <ControlledChoice control={control} name="kind" label="Fatura türü" variant="chips" options={options(purchaseInvoiceKindLabel)} />
          </Field>
          <Field label="Vade Tarihi" hint="Boşsa tedarikçinin vade günü kullanılır." error={errors.dueDate?.message}><input className="input" type="date" {...register('dueDate')} /></Field>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-navy-900">Tutarlar</span>
              <label className="text-sm text-slate-600">KDV
                <select className="input ml-2 inline-block w-24 py-1" value={vatRate} onChange={(e) => changeRate(Number(e.target.value))}>
                  {vatRates.map((r) => <option key={r} value={r}>%{r}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Matrah" error={errors.subtotal?.message}>
                <AmountInput control={control} name="subtotal" words={false} onValueChange={(v) => { if (!taxEdited) fillTax(v, vatRate) }} />
              </Field>
              <Field label="KDV" error={errors.vatAmount?.message}>
                <AmountInput control={control} name="vatAmount" words={false} onValueChange={() => setTaxEdited(true)} />
              </Field>
              <Field label="Tevkifat" error={errors.withholdingAmount?.message}>
                <AmountInput control={control} name="withholdingAmount" words={false} onValueChange={() => setTaxEdited(true)} />
              </Field>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-medium">
              <span>Ödenecek (genel tutar)</span><span>{tl2(subtotal + vat - withholding)}</span>
            </div>
          </div>
          <Field label="Açıklama" error={errors.notes?.message}><textarea className="input min-h-14" {...register('notes')} /></Field>
          <Field label="Fatura dosyası (PDF / görsel)" hint={invoice?.hasFile ? 'Yüklü dosya var; yenisi seçilirse değiştirilir.' : undefined}>
            <input className="input" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <div>
          <div className="mb-2 text-sm font-medium text-navy-900">Faturaya bağlanacak sevkiyatlar</div>
          {!validSupplier && <p className="text-sm text-slate-500">Önce tedarikçiyi seçin.</p>}
          {validSupplier && trips.isFetched && pending.length === 0 && <p className="text-sm text-slate-500">Bu tedarikçinin fatura bekleyen sevkiyatı yok. Servis/yakıt faturası ise sevkiyat seçmeden kaydedin.</p>}
          <ul className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
            {pending.map((t) => (
              <li key={t.tripId}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                  <input type="checkbox" className="mt-1 size-4" checked={tripIds.includes(t.tripId)} onChange={() => toggle(t.tripId)} />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium text-slate-900">No {t.externalRef ?? t.tripId} · {date(t.loadingDate)}{t.plate && <> · <PlateBadge plate={t.plate} /></>}</span>
                    <span className="block truncate text-slate-600">{t.route}</span>
                  </span>
                  <span className="text-right text-sm"><span className="font-mono">{tl2(t.vehicleCost)}</span><span className="block text-slate-500">KDV'li <span className="font-mono">{tl2(t.payable)}</span></span></span>
                </label>
              </li>
            ))}
          </ul>
          {tripIds.length > 0 && <p className="mt-2 text-sm text-slate-600"><Badge tone="blue">{tripIds.length} sevkiyat</Badge> seçildi; tutarlar seçime göre önerildi, faturadakiyle kontrol edin.</p>}
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
