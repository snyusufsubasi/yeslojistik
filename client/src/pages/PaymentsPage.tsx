import { useState } from 'react'
import { Download, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { download, errorMessage } from '../api/client'
import { ExportButton } from '../components/Exports'
import { SumStrip } from '../components/SumStrip'
import { PageShell } from '../components/shell/PageShell'
import type { Payment, PaymentTotals } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { useRowSelection } from '../lib/selection'
import { useToast } from '../components/Toast'
import { PaymentForm } from '../components/PaymentForm'
import { Button, Card, ConfirmDialog, IconButton, DateFilter } from '../components/ui'
import { SearchSelect } from '../components/FormSelect'
import { ImportButton } from '../components/ImportDialog'
import { useAuth } from '../lib/auth'
import { date, tl2 } from '../lib/format'
import { crud, useDebounce, useListTotals, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { paymentMethodLabel } from '../lib/labels'

const api = crud<Payment, unknown>('payments')

export default function PaymentsPage() {
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState({ key: 'date', desc: true })
  const [editing, setEditing] = useState<Payment | 'new' | null>(null)
  useOpenNewFromUrl(() => setEditing('new'))
  const [deleting, setDeleting] = useState<Payment | null>(null)
  const debounced = useDebounce(search)
  const customers = useLookup('customers')
  const [page, setPage] = usePage([debounced, customerId, from, to])
  const selection = useRowSelection<Payment>((p) => p.id, [debounced, customerId, from, to])
  const toast = useToast()

  const query = { page, pageSize: 20, search: debounced, customerId, from, to, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<Payment>('payments', query)
  const { data: totals } = useListTotals<PaymentTotals>('payments', query)
  const deleteMut = useSave((id: number) => api.remove(id), {
    invalidate: ['payments', 'invoices', 'customers'], success: 'Tahsilat silindi.', onSuccess: () => setDeleting(null),
  })

  const columns: Column<Payment>[] = [
    { key: 'date', header: 'Tarih', sortKey: 'date', render: (p) => date(p.date) },
    { key: 'customer', header: 'Müşteri', sortKey: 'customer', render: (p) => <span className="font-medium">{p.customerTitle}</span> },
    { key: 'invoice', header: 'Fatura', render: (p) => p.invoiceNo ?? <span className="text-slate-500">Genel</span> },
    { key: 'method', header: 'Yöntem', sortKey: 'method', render: (p) => paymentMethodLabel[p.method] },
    { key: 'desc', header: 'Açıklama', render: (p) => p.description ?? '' },
    { key: 'amount', header: 'Tutar', sortKey: 'amount', align: 'right', render: (p) => <span className="font-medium text-emerald-700">{tl2(p.amount)}</span> },
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
      <PageShell title="Tahsilatlar" subtitle="Müşterilerden alınan ödemeler"
        more={[{ label: "Excel'e aktar", icon: <Download className="size-4" />, onClick: () => download('/payments/export', query, 'tahsilatlar.xlsx').catch((e) => toast.error(errorMessage(e))) }]}
        primary={can('accounting') ? <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Tahsilat Ekle</Button> : undefined}
        actions={<>
          <ExportButton url="/payments/export" params={query} fileName="tahsilatlar.xlsx" />
          {can('accounting') && <ImportButton entity="payments" />}
          {can('accounting') && <Button write icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Tahsilat Ekle</Button>}
        }>
      <Card title="Tahsilat Listesi" icon={<Wallet className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Müşteri, fatura no, açıklama..." />}>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-3">
          <SearchSelect ariaLabel="Müşteri" value={customerId === "" ? null : customerId} onChange={(v) => setCustomerId(v ?? "")} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
        </div>
        {totals && totals.count > 0 && <SumStrip label="Tahsilat toplamları" items={[
          { label: 'Tahsilat', value: totals.count },
          { label: 'Toplam', value: tl2(totals.total), tone: 'text-emerald-700' },
          ...(totals.refunds > 0 ? [{ label: 'İadeler (düşüldü)', value: tl2(totals.refunds) }] : []),
        ]} />}
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(p) => p.id}
          onRowClick={can('accounting') ? setEditing : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage}
          selectable selection={selection} rowLabel={(p) => `Tahsilat ${p.customerTitle} ${tl2(p.amount)}`}
          bulkActions={(rows) => <Button size="sm" variant="secondary" icon={<Download />}
            onClick={() => download('/payments/export', { ids: rows.map((p) => p.id).join(','), sort: sort.key, desc: sort.desc }, 'secilen-tahsilatlar.xlsx')
              .catch((e) => toast.error(errorMessage(e)))}>Excel'e aktar</Button>}
          empty={debounced || customerId || from || to ? "Aramanıza uyan kayıt yok." : "Henüz tahsilat yok. Ödeme gelince “Tahsilat Ekle” ile kaydedin."} />
      </Card>
      </PageShell>
      {editing && <PaymentForm payment={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Tahsilatı sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>{deleting?.customerTitle} – {tl2(deleting?.amount)} tutarındaki tahsilat silinecek. Cari bakiye güncellenecek.</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}
