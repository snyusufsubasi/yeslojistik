import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Copy, Mail, MapPin, Pencil, Phone, Trash2, Truck } from 'lucide-react'
import { get } from '../api/client'
import type { Driver, Supplier, Trip, Vehicle } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { SupplierForm } from '../components/SupplierForm'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, ConfirmDialog, PageHeader, Spinner, Tabs } from '../components/ui'
import { date, tl, tl2 } from '../lib/format'
import { crud, usePaged, usePage, useSave } from '../lib/hooks'
import { supplierKindLabel, tripStatusLabel, tripStatusTone, vehicleStatusLabel, vehicleStatusTone } from '../lib/labels'

type Tab = 'trips' | 'vehicles' | 'drivers'

export default function SupplierDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('trips')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const q = useQuery({ queryKey: ['suppliers', 'detail', id], queryFn: () => get<Supplier>(`/suppliers/${id}`) })
  const deleteMut = useSave(() => crud('suppliers').remove(id), { invalidate: ['suppliers'], success: 'Tedarikçi silindi.', onSuccess: () => navigate('/tedarikciler') })

  if (q.isLoading) return <Spinner />
  if (!q.data) return <p className="text-sm text-slate-500">Tedarikçi bulunamadı. <Link className="text-brand-600" to="/tedarikciler">Listeye dön</Link></p>
  const s = q.data

  const copyIban = async () => {
    try { await navigator.clipboard.writeText(s.iban!.replace(/\s/g, '')); toast.success('IBAN kopyalandı.') }
    catch { toast.error('Kopyalanamadı; IBAN\'ı elle seçip kopyalayın.') }
  }

  return (
    <>
      <PageHeader title={s.title} subtitle={<>Tedarikçi No: {s.supplierNo} · {supplierKindLabel[s.kind]}{!s.isActive && ' · Pasif'}</>}
        actions={<>
          <Button variant="secondary" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/tedarikciler')}>Geri</Button>
          <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>Düzenle</Button>
          <Button variant="secondary" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>Sil</Button>
        </>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Tedarikçi Bilgileri" icon={<Truck className="size-4" />}>
          <dl className="space-y-2 text-sm">
            <Info label="Yetkili" value={s.contactName} />
            <Info label="Telefon" value={s.phone && <a className="text-brand-600" href={`tel:${s.phone.replace(/\s/g, '')}`}><Phone className="mr-1 inline size-3" />{s.phone}</a>} />
            <Info label="E-posta" value={s.email && <a className="text-brand-600" href={`mailto:${s.email}`}><Mail className="mr-1 inline size-3" />{s.email}</a>} />
            <Info label="VKN / TCKN" value={s.taxNumber && `${s.taxNumber}${s.taxOffice ? ` · ${s.taxOffice}` : ''}`} />
            <Info label="IBAN" value={s.iban && <button className="text-left font-mono text-brand-600" onClick={copyIban} title="Kopyala">{s.iban} <Copy className="ml-1 inline size-3" /></button>} />
            <Info label="Adres" value={[s.address, s.district, s.city].filter(Boolean).join(', ') && <><MapPin className="mr-1 inline size-3" />{[s.address, s.district, s.city].filter(Boolean).join(', ')}</>} />
            <Info label="Vade" value={`${s.paymentTermDays} gün`} />
            {s.notes && <Info label="Not" value={s.notes} />}
            {s.openingBalance > 0 && <Info label="Devir Borcu" value={<>{tl2(s.openingBalance)} ({date(s.openingBalanceDate)})</>} />}
          </dl>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <div className="card p-4">
            <div className="text-[13px] font-medium text-slate-500">Borcumuz (toplam)</div>
            <div className={`text-3xl font-bold ${s.balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{tl2(s.balance)}</div>
            <div className="text-[13px] text-slate-500">Devir + yüklenmiş / yoldaki / teslim edilmiş seferlerin araç maliyeti</div>
          </div>
        </div>
      </div>

      <Card className="mt-4" bodyClassName="p-0">
        <div className="px-4 pt-2">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'trips', label: 'Seferler' },
            { value: 'vehicles', label: 'Araçlar' },
            { value: 'drivers', label: 'Şoförler' },
          ]} />
        </div>
        {tab === 'trips' && <SupplierTrips id={id} />}
        {tab === 'vehicles' && <SupplierVehicles id={id} />}
        {tab === 'drivers' && <SupplierDrivers id={id} />}
      </Card>

      {editing && <SupplierForm supplier={s} onClose={() => setEditing(false)} />}
      <ConfirmDialog open={deleting} title="Tedarikçiyi sil" message={<>{s.title} silinecek. Seferi, aracı veya şoförü olan tedarikçi silinemez; bunun yerine pasife alın.</>}
        confirmText="Sil" loading={deleteMut.isPending} onClose={() => setDeleting(false)} onConfirm={() => deleteMut.mutate(undefined)} />
    </>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800">{value || '—'}</dd>
    </div>
  )
}

function SupplierTrips({ id }: { id: number }) {
  const navigate = useNavigate()
  const [page, setPage] = usePage([id])
  const { data, isFetching } = usePaged<Trip>('trips', { carrierSupplierId: id, page, pageSize: 20, sort: 'loadingDate', desc: true })
  const cols: Column<Trip>[] = [
    { key: 'date', header: 'Yükleme', render: (t) => date(t.loadingDate) },
    { key: 'customer', header: 'Müşteri', render: (t) => t.customerTitle },
    { key: 'route', header: 'Güzergâh', className: 'whitespace-normal! min-w-40', render: (t) => `${t.loadingCity ?? t.loadingAddress} → ${t.deliveryCity ?? t.deliveryAddress}` },
    { key: 'plate', header: 'Araç', render: (t) => t.vehiclePlate },
    { key: 'status', header: 'Durum', render: (t) => <Badge tone={tripStatusTone[t.status]}>{tripStatusLabel[t.status]}</Badge> },
    { key: 'inv', header: 'Taşeron Faturası', render: (t) => t.carrierInvoiceNo ?? (t.status === 'Delivered' ? <span className="text-amber-700">Gelmedi</span> : '—') },
    { key: 'cost', header: 'Araç Maliyeti', align: 'right', render: (t) => tl(t.vehicleCost) },
  ]
  return <DataTable columns={cols} rows={data?.items} loading={isFetching} rowKey={(t) => t.id} page={page} total={data?.total} onPage={setPage}
    onRowClick={(t) => navigate(`/seferler?id=${t.id}`)} empty="Bu tedarikçinin aracıyla yapılmış sefer yok." />
}

function SupplierVehicles({ id }: { id: number }) {
  const { data, isFetching } = usePaged<Vehicle>('vehicles', { supplierId: id, pageSize: 100 })
  const cols: Column<Vehicle>[] = [
    { key: 'plate', header: 'Plaka', render: (v) => <span className="font-medium">{v.plate}</span> },
    { key: 'type', header: 'Tip', render: (v) => [v.type, v.brand, v.model].filter(Boolean).join(' ') },
    { key: 'trailer', header: 'Dorse', render: (v) => v.trailerPlate ?? '—' },
    { key: 'status', header: 'Durum', render: (v) => <Badge tone={vehicleStatusTone[v.status]}>{vehicleStatusLabel[v.status]}</Badge> },
  ]
  return <DataTable columns={cols} rows={data?.items} loading={isFetching} rowKey={(v) => v.id} empty="Bu tedarikçiye bağlı araç yok. Araçlar sayfasında aracı “Kiralık” yapıp sahibini seçin." />
}

function SupplierDrivers({ id }: { id: number }) {
  const { data, isFetching } = usePaged<Driver>('drivers', { supplierId: id, pageSize: 100 })
  const cols: Column<Driver>[] = [
    { key: 'name', header: 'Ad Soyad', render: (d) => <span className="font-medium">{d.fullName}</span> },
    { key: 'phone', header: 'Telefon', render: (d) => d.phone ? <a className="text-brand-600" href={`tel:${d.phone.replace(/\s/g, '')}`}>{d.phone}</a> : '—' },
    { key: 'class', header: 'Ehliyet', render: (d) => d.licenseClass ?? '—' },
  ]
  return <DataTable columns={cols} rows={data?.items} loading={isFetching} rowKey={(d) => d.id} empty="Bu tedarikçiye bağlı şoför yok." />
}
