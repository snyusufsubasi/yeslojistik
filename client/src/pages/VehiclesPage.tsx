import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { get } from '../api/client'
import type { Vehicle, VehicleStatus } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal, PageHeader, Select } from '../components/ui'
import { ImportButton } from '../components/ImportDialog'
import { useAuth } from '../lib/auth'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { FormSelect } from '../components/FormSelect'
import { date, daysUntil } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave } from '../lib/hooks'
import { options, vehicleStatusLabel, vehicleStatusTone } from '../lib/labels'

const schema = z.object({
  plate: req('Plaka zorunlu.').regex(/^(0[1-9]|[1-7]\d|8[01])\s*[a-zA-ZçğıöşüÇĞİÖŞÜ]{1,3}\s*\d{2,5}$/, 'Geçerli bir plaka girin (ör. 34 ABC 123).'),
  type: req('Araç tipi zorunlu.'),
  brand: optStr,
  model: optStr,
  modelYear: z.number().int().min(1970, 'Geçersiz yıl').max(new Date().getFullYear() + 1, 'Geçersiz yıl').nullable().or(z.nan().transform(() => null)),
  km: z.number({ error: 'Km girin.' }).int().min(0, 'Km negatif olamaz.'),
  lastMaintenanceDate: optStr,
  nextMaintenanceDate: optStr,
  inspectionExpiry: optStr,
  insuranceExpiry: optStr,
  status: z.enum(['Available', 'OnRoad', 'Maintenance']),
  defaultDriverId: z.number().nullable().or(z.nan().transform(() => null)),
})
type FormValues = z.infer<typeof schema>
const api = crud<Vehicle, FormValues>('vehicles')

export default function VehiclesPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<VehicleStatus | ''>('')
  const [sort, setSort] = useState({ key: 'plate', desc: false })
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)
  const debounced = useDebounce(search)
  const [page, setPage] = usePage([debounced, status])

  // Bildirimden gelen ?id=… bağlantısı ilgili aracı açar.
  useEffect(() => {
    const id = params.get('id')
    if (!id) return
    get<Vehicle>(`/vehicles/${id}`).then(setEditing).catch(() => undefined)
    params.delete('id')
    setParams(params, { replace: true })
  }, [params, setParams])

  const { data, isFetching } = usePaged<Vehicle>('vehicles', { page, pageSize: 20, search: debounced, status, sort: sort.key, desc: sort.desc })
  const deleteMut = useSave((id: number) => api.remove(id), { invalidate: ['vehicles'], success: 'Araç silindi.', onSuccess: () => setDeleting(null) })

  const columns: Column<Vehicle>[] = [
    { key: 'plate', header: 'Plaka', sortKey: 'plate', render: (v) => <span className="font-semibold">{v.plate}</span> },
    { key: 'type', header: 'Araç Tipi', sortKey: 'type', render: (v) => <>{v.type}<span className="block text-[13px] text-slate-500">{[v.brand, v.model, v.modelYear].filter(Boolean).join(' ')}</span></> },
    { key: 'driver', header: 'Şoför', render: (v) => v.defaultDriverName ?? '—' },
    { key: 'status', header: 'Durum', sortKey: 'status', render: (v) => <Badge tone={vehicleStatusTone[v.status]}>{vehicleStatusLabel[v.status]}</Badge> },
    { key: 'km', header: 'Km', sortKey: 'km', align: 'right', render: (v) => v.km.toLocaleString('tr-TR') },
    { key: 'next', header: 'Sonraki Bakım', sortKey: 'nextMaintenanceDate', render: (v) => <><DueDate value={v.nextMaintenanceDate} warn={15} /><span className="block text-[13px] text-slate-500">Son: {date(v.lastMaintenanceDate)}</span></> },
    { key: 'docs', header: 'Muayene / Sigorta', render: (v) => <><span className="block"><span className="text-[13px] text-slate-500">M: </span><DueDate value={v.inspectionExpiry} warn={30} /></span><span className="block"><span className="text-[13px] text-slate-500">S: </span><DueDate value={v.insuranceExpiry} warn={30} /></span></> },
  ]
  if (can('operations')) columns.push({
    key: 'actions', header: '', align: 'right', render: (v) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton label="Düzenle" onClick={() => setEditing(v)}><Pencil className="size-4" /></IconButton>
        <IconButton label="Sil" onClick={() => setDeleting(v)}><Trash2 className="size-4" /></IconButton>
      </div>
    ),
  })

  return (
    <>
      <PageHeader title="Araçlar" subtitle="Filo, bakım ve belge takibi"
        actions={can('operations') && <>
          <ImportButton entity="vehicles" />
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni Araç</Button>
        </>} />
      <Card title="Araç Listesi" icon={<Truck className="size-4" />} bodyClassName="p-0"
        actions={<>
          <Select aria-label="Durum" className="sm:w-40" value={status} onChange={setStatus} options={options(vehicleStatusLabel)} placeholder="Tüm durumlar" />
          <SearchBox value={search} onChange={setSearch} placeholder="Plaka, marka, tip..." />
        </>}>
        <DataTable columns={columns} rows={data?.items} loading={isFetching} rowKey={(v) => v.id}
          onRowClick={can('operations') ? setEditing : undefined}
          sort={sort.key} desc={sort.desc} onSort={(key, desc) => setSort({ key, desc })}
          page={page} total={data?.total} onPage={setPage} empty={debounced || status ? "Aramanıza uyan kayıt yok." : "Henüz araç yok. “Yeni Araç” ile ekleyin ya da “Excel'den Aktar” ile toplu yükleyin."} />
      </Card>
      {editing && <VehicleForm vehicle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Aracı sil" loading={deleteMut.isPending} confirmText="Sil"
        message={<>{deleting?.plate} plakalı araç silinecek. Emin misiniz?</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} />
    </>
  )
}

export function DueDate({ value, warn }: { value?: string | null; warn: number }) {
  const d = daysUntil(value)
  if (d === null) return <span className="text-slate-500">—</span>
  const cls = d < 0 ? 'font-medium text-red-600' : d <= warn ? 'font-medium text-amber-600' : ''
  return <span className={cls} title={d < 0 ? `${-d} gün geçti` : `${d} gün kaldı`}>{date(value)}</span>
}

function VehicleForm({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const drivers = useLookup('drivers')
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vehicle ? {
      ...vehicle, brand: vehicle.brand ?? '', model: vehicle.model ?? '', modelYear: vehicle.modelYear ?? null,
      lastMaintenanceDate: vehicle.lastMaintenanceDate ?? '', nextMaintenanceDate: vehicle.nextMaintenanceDate ?? '',
      inspectionExpiry: vehicle.inspectionExpiry ?? '', insuranceExpiry: vehicle.insuranceExpiry ?? '',
      defaultDriverId: vehicle.defaultDriverId ?? null,
    } : { status: 'Available', km: 0, brand: '', model: '', lastMaintenanceDate: '', nextMaintenanceDate: '', inspectionExpiry: '', insuranceExpiry: '' },
  })
  const save = useSave((v: FormValues) => vehicle ? api.update(vehicle.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['vehicles'], success: vehicle ? 'Araç güncellendi.' : 'Araç eklendi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))

  return (
    <Modal open onClose={onClose} title={vehicle ? `Araç: ${vehicle.plate}` : 'Yeni Araç'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Plaka" required error={errors.plate?.message}><input className="input uppercase" placeholder="34 ABC 123" {...register('plate')} /></Field>
        <Field label="Araç Tipi" required error={errors.type?.message}>
          <input className="input" list="vehicle-types" placeholder="Kamyon" {...register('type')} />
          <datalist id="vehicle-types">{['Tır', 'Kamyon', 'Kamyonet', 'Panelvan', 'Lowbed', 'Frigorifik'].map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Marka" error={errors.brand?.message}><input className="input" placeholder="Ford" {...register('brand')} /></Field>
        <Field label="Model" error={errors.model?.message}><input className="input" placeholder="Cargo" {...register('model')} /></Field>
        <Field label="Model Yılı" error={errors.modelYear?.message}><input className="input" type="number" {...register('modelYear', { valueAsNumber: true })} /></Field>
        <Field label="Km" required error={errors.km?.message}><input className="input" type="number" min="0" {...register('km', { valueAsNumber: true })} /></Field>
        <Field label="Durum" error={errors.status?.message} hint="“Yolda” durumu seferlerden otomatik belirlenir.">
          <select className="input" {...register('status')}>
            {Object.entries(vehicleStatusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Varsayılan Şoför" error={errors.defaultDriverId?.message}>
          <FormSelect control={control} name="defaultDriverId" placeholder="—" options={(drivers.data ?? []).map((d) => ({ value: d.id, label: d.label }))} />
        </Field>
        <Field label="Son Bakım Tarihi"><input className="input" type="date" {...register('lastMaintenanceDate')} /></Field>
        <Field label="Sonraki Bakım Tarihi"><input className="input" type="date" {...register('nextMaintenanceDate')} /></Field>
        <Field label="Muayene Bitiş"><input className="input" type="date" {...register('inspectionExpiry')} /></Field>
        <Field label="Trafik Sigortası Bitiş"><input className="input" type="date" {...register('insuranceExpiry')} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
