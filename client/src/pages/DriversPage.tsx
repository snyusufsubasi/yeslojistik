import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { IdCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { get } from '../api/client'
import type { Driver } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal, PageHeader, Tabs } from '../components/ui'
import { DocumentsPanel, DriverLedgerPanel } from '../components/FleetPanels'
import { ImportButton } from '../components/ImportDialog'
import { useAuth } from '../lib/auth'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { FormSelect } from '../components/FormSelect'
import { DueDate } from './VehiclesPage'

const schema = z.object({
  fullName: req('Ad soyad zorunlu.'),
  phone: optStr,
  nationalId: z.string().trim().regex(/^(\d{11})?$/, 'TC kimlik no 11 hane olmalı.'),
  licenseClass: optStr,
  licenseExpiry: optStr,
  srcExpiry: optStr,
  psychotechnicExpiry: optStr,
  isActive: z.boolean(),
  supplierId: z.number().nullable().or(z.nan().transform(() => null)),
})
type FormValues = z.infer<typeof schema>
const api = crud<Driver, FormValues>('drivers')

export default function DriversPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [showPassive, setShowPassive] = useState(false)
  const [sort, setSort] = useState({ key: 'fullName', desc: false })
  const [editing, setEditing] = useState<Driver | 'new' | null>(null)
  useOpenNewFromUrl(() => setEditing('new'))
  const [deleting, setDeleting] = useState<Driver | null>(null)
  const debounced = useDebounce(search)
  const [page, setPage] = usePage([debounced, showPassive])
  useEffect(() => {
    const id = params.get('id')
    if (!id) return
    get<Driver>(`/drivers/${id}`).then(setEditing).catch(() => undefined)
    params.delete('id')
    setParams(params, { replace: true })
  }, [params, setParams])

  const { data, isFetching } = usePaged<Driver>('drivers', {
    page, pageSize: 20, search: debounced, active: showPassive ? undefined : true, sort: sort.key, desc: sort.desc,
  })
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['drivers', 'vehicles'], success: 'Şoför silindi.', onSuccess: () => setDeleting(null) })

  const columns: Column<Driver>[] = [
    { key: 'name', header: 'Ad Soyad', sortKey: 'fullName', render: (d) => <span className="font-medium">{d.fullName}{d.supplierTitle && <span className="block text-sm font-normal text-slate-500">Taşeron: {d.supplierTitle}</span>}</span> },
    { key: 'phone', header: 'Telefon', render: (d) => d.phone ? <a className="text-brand-600" href={`tel:${d.phone.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()}>{d.phone}</a> : '—' },
    { key: 'class', header: 'Ehliyet', render: (d) => d.licenseClass ?? '—' },
    { key: 'license', header: 'Ehliyet Bitiş', sortKey: 'licenseExpiry', render: (d) => <DueDate value={d.licenseExpiry} warn={30} /> },
    { key: 'src', header: 'SRC Bitiş', sortKey: 'srcExpiry', render: (d) => <DueDate value={d.srcExpiry} warn={30} /> },
    { key: 'psy', header: 'Psikoteknik', render: (d) => <DueDate value={d.psychotechnicExpiry} warn={30} /> },
    { key: 'app', header: 'Uygulama', render: (d) => !d.hasAppAccount ? <span className="text-slate-500">—</span>
      : d.locationConsentAt ? <Badge tone="green">Konum izni var</Badge> : <Badge tone="yellow">Konum izni yok</Badge> },
    { key: 'active', header: 'Durum', sortKey: 'isActive', render: (d) => <Badge tone={d.isActive ? 'green' : 'gray'}>{d.isActive ? 'Aktif' : 'Pasif'}</Badge> },
  ]
  if (can('operations')) columns.push({
    key: 'actions', header: '', align: 'right', render: (d) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton label="Düzenle" onClick={() => setEditing(d)}><Pencil className="size-4" /></IconButton>
        <IconButton label="Sil" onClick={() => setDeleting(d)}><Trash2 className="size-4" /></IconButton>
      </div>
    ),
  })

  return (
    <>
      <PageHeader title="Şoförler" subtitle="Şoför bilgileri ve belge süreleri"
        actions={can('operations') && <>
          <ImportButton entity="drivers" />
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni Şoför</Button>
        </>} />
      <Card title="Şoför Listesi" icon={<IdCard className="size-4" />} bodyClassName="p-0"
        actions={<>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPassive} onChange={(e) => setShowPassive(e.target.checked)} /> Pasifleri göster
          </label>
          <SearchBox value={search} onChange={setSearch} placeholder="Ad, telefon..." />
        </>}>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(d) => d.id}
          onRowClick={setEditing}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty={debounced ? "Aramanıza uyan kayıt yok." : "Henüz şoför yok. “Yeni Şoför” ile ekleyin ya da “Excel'den Aktar” ile toplu yükleyin."} />
      </Card>
      {editing && <DriverForm driver={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Şoförü sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>{deleting?.fullName} silinecek. Seferlerde görev almış şoförler silinemez; bunun yerine pasife alabilirsiniz.</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}

function DriverForm({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const { can } = useAuth()
  const editable = can('operations')
  const [tab, setTab] = useState<'info' | 'docs' | 'ledger'>(editable || !driver ? 'info' : 'ledger')
  const suppliers = useLookup('suppliers')
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: driver?.fullName ?? '', phone: driver?.phone ?? '', nationalId: driver?.nationalId ?? '',
      licenseClass: driver?.licenseClass ?? '', licenseExpiry: driver?.licenseExpiry ?? '', srcExpiry: driver?.srcExpiry ?? '',
      psychotechnicExpiry: driver?.psychotechnicExpiry ?? '', isActive: driver?.isActive ?? true, supplierId: driver?.supplierId ?? null,
    },
  })
  const save = useSave((v: FormValues) => driver ? api.update(driver.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['drivers', 'vehicles'], success: driver ? 'Şoför güncellendi.' : 'Şoför eklendi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={driver ? driver.fullName : 'Yeni Şoför'} size={tab === 'info' ? 'md' : 'lg'}
      footer={tab === 'info' && editable ? <><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>
        : <Button variant="secondary" onClick={onClose}>Kapat</Button>}>
      {driver && <div className="mb-3"><Tabs value={tab} onChange={setTab}
        tabs={[{ value: 'info', label: 'Bilgiler' }, { value: 'docs', label: 'Belgeler' }, { value: 'ledger', label: 'Hesap' }]} /></div>}
      {driver && tab === 'docs' && <DocumentsPanel ownerType="Driver" ownerId={driver.id} />}
      {driver && tab === 'ledger' && <DriverLedgerPanel driverId={driver.id} />}
      <form onSubmit={submit} className={tab === 'info' ? 'grid gap-3 sm:grid-cols-2' : 'hidden'}>
        <fieldset disabled={!editable} className="contents">
        <Field label="Ad Soyad" required error={errors.fullName?.message}><input className="input" {...register('fullName')} /></Field>
        <Field label="Telefon" error={errors.phone?.message}><input className="input" type="tel" placeholder="0532 123 45 67" {...register('phone')} /></Field>
        <Field label="TC Kimlik No" error={errors.nationalId?.message}><input className="input" inputMode="numeric" maxLength={11} {...register('nationalId')} /></Field>
        <Field label="Ehliyet Sınıfı" error={errors.licenseClass?.message}><input className="input uppercase" placeholder="CE" {...register('licenseClass')} /></Field>
        <Field label="Ehliyet Bitiş"><input className="input" type="date" {...register('licenseExpiry')} /></Field>
        <Field label="SRC Belgesi Bitiş"><input className="input" type="date" {...register('srcExpiry')} /></Field>
        <Field label="Psikoteknik Bitiş"><input className="input" type="date" {...register('psychotechnicExpiry')} /></Field>
        <Field label="Çalıştığı taşeron" hint="Boş: firmanın kendi şoförü. Taşeron şoförleri belge uyarılarına girmez.">
          <FormSelect control={control} name="supplierId" placeholder="Kendi şoförümüz" options={(suppliers.data ?? []).filter((s) => s.extra === 'Carrier').map((s) => ({ value: s.id, label: s.label }))} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" {...register('isActive')} /> Aktif</label>
        </fieldset>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
