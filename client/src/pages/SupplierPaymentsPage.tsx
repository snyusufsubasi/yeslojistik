import { useState } from 'react'
import { HandCoins, Pencil, Plus, Trash2 } from 'lucide-react'
import { ExportButton, TotalsStrip } from '../components/Exports'
import type { PaymentTotals, SupplierPayment } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { SupplierPaymentForm } from '../components/SupplierPaymentForm'
import { Button, Card, ConfirmDialog, IconButton, PageHeader, Select, DateFilter } from '../components/ui'
import { MobileCards } from '../components/shell/MobileCards'
import { ImportButton } from '../components/ImportDialog'
import { useAuth } from '../lib/auth'
import { date, tl2 } from '../lib/format'
import { crud, useDebounce, useListTotals, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { paymentMethodLabel } from '../lib/labels'
import { useIsNewUi } from '../lib/uiMode'

const api = crud<SupplierPayment, unknown>('supplier-payments')

/** Tedarikçilere (taşeron, servis, istasyon) yapılan ödemeler. */
export default function SupplierPaymentsPage() {
  const { can } = useAuth()
  const isNew = useIsNewUi()
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState({ key: 'date', desc: true })
  const [editing, setEditing] = useState<SupplierPayment | 'new' | null>(null)
  useOpenNewFromUrl(() => setEditing('new'))
  const [deleting, setDeleting] = useState<SupplierPayment | null>(null)
  const debounced = useDebounce(search)
  const suppliers = useLookup('suppliers')
  const [page, setPage] = usePage([debounced, supplierId, from, to])

  const query = { page, pageSize: 20, search: debounced, supplierId, from, to, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<SupplierPayment>('supplier-payments', query)
  const { data: totals } = useListTotals<PaymentTotals>('supplier-payments', query)
  const deleteMut = useSave((id: number) => api.remove(id), {
    invalidate: ['supplier-payments', 'suppliers'], success: 'Ödeme silindi.', onSuccess: () => setDeleting(null),
  })

  const columns: Column<SupplierPayment>[] = [
    { key: 'date', header: 'Tarih', sortKey: 'date', render: (p) => date(p.date) },
    { key: 'supplier', header: 'Tedarikçi', sortKey: 'supplier', render: (p) => <span className="font-medium">{p.supplierTitle}</span> },
    { key: 'trip', header: 'Sevkiyat', className: 'whitespace-normal! min-w-32', render: (p) => p.tripLabel ?? <span className="text-slate-500">Genel</span> },
    { key: 'method', header: 'Yöntem', sortKey: 'method', render: (p) => paymentMethodLabel[p.method] },
    { key: 'desc', header: 'Açıklama', render: (p) => p.description ?? '' },
    { key: 'amount', header: 'Tutar', sortKey: 'amount', align: 'right', render: (p) => <span className="font-medium text-red-700">{tl2(p.amount)}</span> },
  ]
  if (can('accounting')) columns.push({
    key: 'actions', header: '', align: 'right', render: (p) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton write label="Düzenle" onClick={() => setEditing(p)}><Pencil className="size-4" /></IconButton>
        <IconButton write label="Sil" onClick={() => setDeleting(p)}><Trash2 className="size-4" /></IconButton>
      </div>
    ),
  })

  return (
    <>
      <PageHeader title="Ödemeler" subtitle="Taşeronlara, servislere ve istasyonlara yapılan ödemeler"
        actions={<>
          <ExportButton url="/supplier-payments/export" params={query} fileName="odemeler.xlsx" />
          {can('accounting') && <ImportButton entity="supplier-payments" />}
          {can('accounting') && <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Ödeme Yap</Button>}
        </>} />
      <Card title="Ödeme Listesi" icon={<HandCoins className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Tedarikçi, açıklama..." />}>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-3">
          <Select aria-label="Tedarikçi" value={supplierId} onChange={setSupplierId} placeholder="Tüm tedarikçiler"
            options={(suppliers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
        </div>
        {totals && totals.count > 0 && <TotalsStrip items={[
          { label: 'Ödeme', value: totals.count },
          { label: 'Toplam', value: tl2(totals.total), tone: 'text-red-700' },
          ...(totals.refunds > 0 ? [{ label: 'Gelen iadeler (düşüldü)', value: tl2(totals.refunds) }] : []),
        ]} />}
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(p) => p.id}
          onRowClick={can('accounting') ? setEditing : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty={debounced || supplierId || from || to ? "Aramanıza uyan kayıt yok." : "Henüz ödeme yok. Taşerona ya da tedarikçiye ödeme yapınca “Ödeme Yap” ile kaydedin."}
          mobileCard={isNew ? (p) => (
            /* Telefon kartı — yalnız yeni görünüm; klasik görünümde tablo davranışı aynı kalır. */
            <div className="-my-3.5">
              <MobileCards menuLabel={`${p.supplierTitle} ödemesi işlemleri`} cards={[{
                id: p.id,
                title: p.supplierTitle,
                badge: p.isRefund ? { tone: 'orange', label: 'İade' } : undefined,
                info: [
                  `${date(p.date)} · ${paymentMethodLabel[p.method]}`,
                  p.tripLabel ? `Sevkiyat ${p.tripLabel}` : 'Genel ödeme',
                  p.description ?? p.cashAccountName ?? '—',
                ],
                amount: <span className="text-bad">{tl2(p.amount)}</span>,
                onOpen: can('accounting') ? () => setEditing(p) : undefined,
                menu: [
                  { label: 'Düzenle', icon: <Pencil className="size-4" />, write: true, perm: 'accounting', onClick: () => setEditing(p) },
                  { label: 'Sil', icon: <Trash2 className="size-4" />, write: true, perm: 'accounting', danger: true, onClick: () => setDeleting(p) },
                ],
              }]} />
            </div>
          ) : undefined} />
      </Card>
      {editing && <SupplierPaymentForm payment={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Ödemeyi sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>{deleting?.supplierTitle} – {tl2(deleting?.amount)} tutarındaki ödeme silinecek. Tedarikçi bakiyesi güncellenecek.</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}
