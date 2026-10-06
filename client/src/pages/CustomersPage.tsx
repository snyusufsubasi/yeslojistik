import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Download, FileSpreadsheet, Plus, Users, Wallet } from 'lucide-react'
import type { Customer } from '../api/types'
import { CustomerForm } from '../components/CustomerForm'
import { ImportButton, useImportAction } from '../components/ImportDialog'
import { FirstUse } from '../components/FirstUse'
import { ExportButton, useExportAction } from '../components/Exports'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Button, Card } from '../components/ui'
import { PageShell } from '../components/shell/PageShell'
import type { MenuItem } from '../components/shell/Menu'
import { tl } from '../lib/format'
import { useDebounce, usePaged, usePage, useOpenNewFromUrl } from '../lib/hooks'

export default function CustomersPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'title', desc: false })
  const [creating, setCreating] = useState(false)
  useOpenNewFromUrl(() => setCreating(true))
  const debounced = useDebounce(search)
  const [page, setPage] = usePage([debounced])

  const query = { page, pageSize: 20, search: debounced, sort: sort.key, desc: sort.desc }
  const { data, isFetching, error, refetch } = usePaged<Customer>('customers', query)
  const exp = useExportAction()
  const imp = useImportAction('customers')

  // Yeni görünümde nadir işler "⋯ Diğer" menüsünde toplanır (docs/plan/28-ORTAK-PARCALAR.md)
  const more: MenuItem[] = [
    ...(can('accounting') ? [{ label: 'Cari Tablosu', icon: <Wallet className="size-4" />, onClick: () => navigate('/cari/musteriler') }] : []),
    { label: "Excel'e aktar", icon: <Download className="size-4" />, onClick: () => exp.run('/customers/export', 'musteriler.xlsx', query) },
    { label: "Excel'den aktar", icon: <FileSpreadsheet className="size-4" />, write: true, onClick: imp.run },
  ]

  const columns: Column<Customer>[] = [
    { key: 'no', header: 'No', sortKey: 'id', render: (c) => <span className="text-slate-500">{c.customerNo}</span> },
    { key: 'title', header: 'Müşteri', sortKey: 'title', render: (c) => <span className="font-medium">{c.title}</span> },
    { key: 'tax', header: 'VKN/TCKN', render: (c) => c.taxNumber ?? '—' },
    { key: 'contact', header: 'İletişim', render: (c) => c.phone || c.email ? <>
      {c.phone && <span className="block whitespace-nowrap">{c.phone}</span>}
      {c.email && <span className="block break-all text-sm text-slate-500">{c.email}</span>}
    </> : '—' },
    { key: 'address', header: 'Adres', className: 'min-w-40', render: (c) => c.address ?? '—' },
    {
      key: 'balance', header: 'Cari Bakiye', sortKey: 'balance', align: 'right',
      render: (c) => <span className={c.balance > 0 ? 'font-medium text-red-600' : c.balance < 0 ? 'font-medium text-emerald-700' : ''}>{tl(c.balance)}</span>,
    },
  ]

  return (
    <>
      <PageShell title="Müşteriler" subtitle="Müşteri kartları. Bütün bakiyeleri tek tabloda görmek için “Cari Tablosu”."
        more={more}
        primary={<Button write icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Yeni Müşteri</Button>}
        actions={<>
          {can('accounting') && <Button variant="secondary" onClick={() => navigate('/cari/musteriler')}>Cari Tablosu</Button>}
          <ExportButton url="/customers/export" params={query} fileName="musteriler.xlsx" />
          <ImportButton entity="customers" />
          <Button write icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Yeni Müşteri</Button>
        </>}>
      <Card title="Müşteri Listesi" icon={<Users className="size-4" />} bodyClassName="p-0"
        actions={<SearchBox value={search} onChange={setSearch} placeholder="Ünvan, VKN, telefon..." />}>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} error={error} onRetry={refetch} rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/musteriler/${c.id}`)}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty={debounced ? "Aramanıza uyan kayıt yok." : (
            <FirstUse title="İlk müşterinizi ekleyin" addLabel="Yeni müşteri" onAdd={() => setCreating(true)} importEntity="customers">
              Sevkiyat ve fatura için önce müşteri kartı gerekir. Tek tek ekleyin ya da elinizdeki listeyi Excel'den aktarın.
            </FirstUse>)}
          mobileCard={(c) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-navy-900">{c.title}</div>
                <div className="truncate text-sm text-slate-500">{[c.phone, c.address].filter(Boolean).join(' · ') || `No ${c.customerNo}`}</div>
              </div>
              <span className={c.balance > 0 ? 'shrink-0 font-medium text-red-600' : 'shrink-0 text-slate-500'}>{tl(c.balance)}</span>
            </div>
          )} />
      </Card>
      </PageShell>
      {imp.dialog}
      {creating && <CustomerForm customer={null} onClose={() => setCreating(false)} onSaved={(c) => navigate(`/musteriler/${c.customer.id}`)} />}
    </>
  )
}
