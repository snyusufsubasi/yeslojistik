import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Plus, Truck } from 'lucide-react'
import type { Supplier, SupplierKind } from '../api/types'
import { ImportButton } from '../components/ImportDialog'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { SupplierForm } from '../components/SupplierForm'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { tl } from '../lib/format'
import { useDebounce, usePaged, usePage } from '../lib/hooks'
import { supplierKindLabel } from '../lib/labels'

export default function SuppliersPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<SupplierKind | ''>('')
  const [sort, setSort] = useState({ key: 'title', desc: false })
  const [creating, setCreating] = useState(false)
  const debounced = useDebounce(search)
  const [page, setPage] = usePage([debounced, kind])
  const { data, isFetching } = usePaged<Supplier>('suppliers', { page, pageSize: 20, search: debounced, kind: kind || undefined, sort: sort.key, desc: sort.desc })

  const columns: Column<Supplier>[] = [
    { key: 'no', header: 'No', sortKey: 'id', render: (s) => <span className="text-slate-500">{s.supplierNo}</span> },
    {
      key: 'title', header: 'Tedarikçi', sortKey: 'title',
      render: (s) => <span className="font-medium">{s.title}{!s.isActive && <span className="ml-2"><Badge tone="gray">Pasif</Badge></span>}</span>,
    },
    { key: 'kind', header: 'Tür', sortKey: 'kind', render: (s) => supplierKindLabel[s.kind] },
    { key: 'contact', header: 'Yetkili / Telefon', render: (s) => [s.contactName, s.phone].filter(Boolean).join(' · ') || '—' },
    { key: 'city', header: 'İl', sortKey: 'city', render: (s) => s.city ?? '—' },
    {
      key: 'balance', header: 'Borcumuz', align: 'right',
      render: (s) => <span className={s.balance > 0 ? 'font-medium text-red-600' : ''}>{tl(s.balance)}</span>,
    },
  ]

  return (
    <>
      <PageHeader title="Tedarikçiler" subtitle="Taşeron araç sahipleri, servisler ve akaryakıt istasyonları · firmanın borçlu olduğu taraflar"
        actions={<>
          {can('accounting') && <Button variant="secondary" onClick={() => navigate('/cari/tedarikciler')}>Cari Tablosu</Button>}
          <ImportButton entity="suppliers" />
          <Button write icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Yeni Tedarikçi</Button>
        </>} />
      <Card title="Tedarikçi Listesi" icon={<Truck className="size-4" />} bodyClassName="p-0"
        actions={<div className="flex flex-wrap gap-2">
          <select className="input w-auto" aria-label="Tür" value={kind} onChange={(e) => setKind(e.target.value as SupplierKind | '')}>
            <option value="">Tüm türler</option>
            {Object.entries(supplierKindLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <SearchBox value={search} onChange={setSearch} placeholder="Ünvan, VKN, telefon..." />
        </div>}>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(s) => s.id}
          onRowClick={(s) => navigate(`/tedarikciler/${s.id}`)}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage}
          empty={debounced || kind ? 'Aramanıza uyan kayıt yok.' : 'Henüz tedarikçi yok. Kiralık araç sahiplerini “Yeni Tedarikçi” ile ekleyin ya da “Excel\'den Aktar” ile yükleyin.'}
          mobileCard={(s) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-navy-900">{s.title}</div>
                <div className="truncate text-sm text-slate-500">{[supplierKindLabel[s.kind], s.phone].filter(Boolean).join(' · ')}</div>
              </div>
              <span className={s.balance > 0 ? 'shrink-0 font-medium text-red-600' : 'shrink-0 text-slate-500'}>{tl(s.balance)}</span>
            </div>
          )} />
      </Card>
      {creating && <SupplierForm supplier={null} onClose={() => setCreating(false)} onSaved={(s) => navigate(`/tedarikciler/${s.id}`)} />}
    </>
  )
}
