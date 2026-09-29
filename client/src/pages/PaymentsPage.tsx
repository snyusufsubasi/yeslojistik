import { useState } from 'react'
import { Download, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { download } from '../api/client'
import type { Payment } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { PaymentForm } from '../components/PaymentForm'
import { Button, Card, ConfirmDialog, IconButton, PageHeader, Select, DateFilter } from '../components/ui'
import { useAuth } from '../lib/auth'
import { date, tl2 } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
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

  const query = { page, pageSize: 20, search: debounced, customerId, from, to, sort: sort.key, desc: sort.desc }
  const { data, isFetching } = usePaged<Payment>('payments', query)
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
        <IconButton label="Düzenle" onClick={() => setEditing(p)}><Pencil className="size-4" /></IconButton>
        <IconButton label="Sil" onClick={() => setDeleting(p)}><Trash2 className="size-4" /></IconButton>
      </div>
    ),
  })

  return (
    <>
      <PageHeader title="Tahsilatlar" subtitle="Müşterilerden alınan ödemeler"
        actions={<>
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => download('/payments/export', query, 'tahsilatlar.xlsx')}>Excel</Button>
          {can('accounting') && <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Tahsilat Ekle</Button>}
        </>} />
      <Card title="Tahsilat Listesi" icon={<Wallet className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Müşteri, fatura no, açıklama..." />}>
        <div className="grid grid-cols-1 gap-2 border-b border-slate-100 p-3 sm:grid-cols-3">
          <Select aria-label="Müşteri" value={customerId} onChange={setCustomerId} placeholder="Tüm müşteriler"
            options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
          <DateFilter label="Başlangıç" value={from} onChange={setFrom} />
          <DateFilter label="Bitiş" value={to} onChange={setTo} />
        </div>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(p) => p.id}
          onRowClick={can('accounting') ? setEditing : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty={debounced || customerId || from || to ? "Aramanıza uyan kayıt yok." : "Henüz tahsilat yok. Ödeme gelince “Tahsilat Ekle” ile kaydedin."} />
      </Card>
      {editing && <PaymentForm payment={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Tahsilatı sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>{deleting?.customerTitle} – {tl2(deleting?.amount)} tutarındaki tahsilat silinecek. Cari bakiye güncellenecek.</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}
