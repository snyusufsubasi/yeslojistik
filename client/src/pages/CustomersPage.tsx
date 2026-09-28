import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import type { Customer } from '../api/types'
import { CustomerForm } from '../components/CustomerForm'
import { ImportButton } from '../components/ImportDialog'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Button, Card, PageHeader } from '../components/ui'
import { tl } from '../lib/format'
import { useDebounce, usePaged, usePage } from '../lib/hooks'

export default function CustomersPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'title', desc: false })
  const [creating, setCreating] = useState(!!params.get('new'))
  const debounced = useDebounce(search)
  const [page, setPage] = usePage([debounced])
  useEffect(() => {
    if (params.get('new')) { params.delete('new'); setParams(params, { replace: true }) }
  }, [params, setParams])

  const { data, isFetching } = usePaged<Customer>('customers', { page, pageSize: 20, search: debounced, sort: sort.key, desc: sort.desc })

  const columns: Column<Customer>[] = [
    { key: 'no', header: 'No', sortKey: 'id', render: (c) => <span className="text-slate-500">{c.customerNo}</span> },
    { key: 'title', header: 'Müşteri', sortKey: 'title', render: (c) => <span className="font-medium">{c.title}</span> },
    { key: 'tax', header: 'VKN/TCKN', render: (c) => c.taxNumber ?? '—' },
    { key: 'phone', header: 'Telefon', render: (c) => c.phone ?? '—' },
    { key: 'email', header: 'E-posta', render: (c) => c.email ?? '—' },
    { key: 'address', header: 'Adres', render: (c) => c.address ?? '—' },
    {
      key: 'balance', header: 'Cari Bakiye', sortKey: 'balance', align: 'right',
      render: (c) => <span className={c.balance > 0 ? 'font-semibold text-red-600' : c.balance < 0 ? 'font-semibold text-emerald-700' : ''}>{tl(c.balance)}</span>,
    },
  ]

  return (
    <>
      <PageHeader title="Müşteriler / Cari" subtitle="Müşteri kartları ve cari bakiyeler"
        actions={<>
          <ImportButton entity="customers" />
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Yeni Müşteri</Button>
        </>} />
      <Card title="Müşteri Listesi" icon={<Users className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Ünvan, VKN, telefon..." />}>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/musteriler/${c.id}`)}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty="Müşteri bulunamadı."
          mobileCard={(c) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-navy-900">{c.title}</div>
                <div className="truncate text-xs text-slate-500">{[c.phone, c.address].filter(Boolean).join(' · ') || `No ${c.customerNo}`}</div>
              </div>
              <span className={c.balance > 0 ? 'shrink-0 font-semibold text-red-600' : 'shrink-0 text-slate-500'}>{tl(c.balance)}</span>
            </div>
          )} />
      </Card>
      {creating && <CustomerForm customer={null} onClose={() => setCreating(false)} onSaved={(c) => navigate(`/musteriler/${c.customer.id}`)} />}
    </>
  )
}
