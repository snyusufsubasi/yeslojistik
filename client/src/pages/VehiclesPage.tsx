import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { get } from '../api/client'
import type { Vehicle, VehicleStatus } from '../api/types'
import { DataTable, SearchBox, type Column } from '../components/DataTable'
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal, PageHeader, Select, Tabs } from '../components/ui'
import { DocumentsPanel, MaintenancePanel } from '../components/FleetPanels'
import { ImportButton } from '../components/ImportDialog'
import { useAuth } from '../lib/auth'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { FormSelect } from '../components/FormSelect'
import { date, daysUntil } from '../lib/format'
import { crud, useDebounce, useLookup, usePaged, usePage, useSave, useOpenNewFromUrl } from '../lib/hooks'
import { options, vehicleOwnershipLabel, vehicleStatusLabel, vehicleStatusTone } from '../lib/labels'
import { SupplierForm } from '../components/SupplierForm'
import { ControlledChoice } from '../components/Choice'
import { DateQuick, MoreFields, Section, SuggestChips } from '../components/Inputs'
import { choices } from '../lib/choices'
import { vehicleOwnershipIcon, vehicleStatusIcon } from '../lib/icons'

const schema = z.object({
  plate: req('Plaka zorunlu.').regex(/^(0[1-9]|[1-7]\d|8[01])\s*[a-zA-ZçğıöşüÇĞİÖŞÜ]{1,3}\s*\d{2,5}$/, 'Geçerli bir plaka girin (ör. 34 ABC 123).'),
  type: req('Araç tipi zorunlu.'),
  brand: optStr,
  model: optStr,
  modelYear: z.number().int().min(1970, 'Geçersiz yıl').max(new Date().getFullYear() + 1, 'Geçersiz yıl').nullable().or(z.nan().transform(() => null)),
  km: z.number({ error: 'Km girin.' }).int().min(0, 'Km negatif olamaz.'),
  lastMaintenanceDate: optStr,
  nextMaintenanceDate: optStr,
  nextMaintenanceKm: z.number().int('Tam sayı girin.').min(0).nullable().or(z.nan().transform(() => null)),
  inspectionExpiry: optStr,
  insuranceExpiry: optStr,
  status: z.enum(['Available', 'OnRoad', 'Maintenance']),
  defaultDriverId: z.number().nullable().or(z.nan().transform(() => null)),
  ownership: z.enum(['Own', 'Rented']),
  supplierId: z.number().nullable().or(z.nan().transform(() => null)),
  trailerPlate: optStr,
}).refine((v) => v.ownership === 'Own' || v.supplierId != null, { path: ['supplierId'], message: 'Kiralık araç için araç sahibini seçin.' })
type FormValues = z.infer<typeof schema>
const api = crud<Vehicle, FormValues>('vehicles')

export default function VehiclesPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<VehicleStatus | ''>('')
  const [sort, setSort] = useState({ key: 'plate', desc: false })
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  useOpenNewFromUrl(() => setEditing('new'))
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
    {
      key: 'plate', header: 'Plaka', sortKey: 'plate', render: (v) => <span className="font-semibold">{v.plate}
        {v.ownership === 'Rented' && <span className="ml-1"><Badge tone="purple">Kiralık</Badge></span>}
        {(v.supplierTitle || v.trailerPlate) && <span className="block text-sm font-normal text-slate-500">{[v.supplierTitle, v.trailerPlate && `Dorse ${v.trailerPlate}`].filter(Boolean).join(' · ')}</span>}</span>,
    },
    { key: 'type', header: 'Araç Tipi', sortKey: 'type', render: (v) => <>{v.type}<span className="block text-sm text-slate-500">{[v.brand, v.model, v.modelYear].filter(Boolean).join(' ')}</span></> },
    { key: 'driver', header: 'Şoför', render: (v) => v.defaultDriverName ?? '—' },
    { key: 'status', header: 'Durum', sortKey: 'status', render: (v) => <Badge tone={vehicleStatusTone[v.status]}>{vehicleStatusLabel[v.status]}</Badge> },
    { key: 'km', header: 'Km', sortKey: 'km', align: 'right', render: (v) => v.km.toLocaleString('tr-TR') },
    { key: 'next', header: 'Sonraki Bakım', sortKey: 'nextMaintenanceDate', render: (v) => <><DueDate value={v.nextMaintenanceDate} warn={15} />
      {v.nextMaintenanceKm != null && <span className={`block text-sm ${v.nextMaintenanceKm - v.km <= 1000 ? 'font-medium text-amber-600' : 'text-slate-500'}`}>{v.nextMaintenanceKm.toLocaleString('tr-TR')} km</span>}
      <span className="block text-sm text-slate-500">Son: {date(v.lastMaintenanceDate)}</span></> },
    { key: 'docs', header: 'Muayene / Sigorta', render: (v) => <><span className="block"><span className="text-sm text-slate-500">M: </span><DueDate value={v.inspectionExpiry} warn={30} /></span><span className="block"><span className="text-sm text-slate-500">S: </span><DueDate value={v.insuranceExpiry} warn={30} /></span></> },
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
  const suppliers = useLookup('suppliers')
  const [newSupplier, setNewSupplier] = useState(false)
  const { register, handleSubmit, control, setError, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vehicle ? {
      ...vehicle, brand: vehicle.brand ?? '', model: vehicle.model ?? '', modelYear: vehicle.modelYear ?? null,
      lastMaintenanceDate: vehicle.lastMaintenanceDate ?? '', nextMaintenanceDate: vehicle.nextMaintenanceDate ?? '',
      inspectionExpiry: vehicle.inspectionExpiry ?? '', insuranceExpiry: vehicle.insuranceExpiry ?? '',
      defaultDriverId: vehicle.defaultDriverId ?? null, ownership: vehicle.ownership ?? 'Own', supplierId: vehicle.supplierId ?? null,
      trailerPlate: vehicle.trailerPlate ?? '', nextMaintenanceKm: vehicle.nextMaintenanceKm ?? null,
    } : { nextMaintenanceKm: null, status: 'Available', km: 0, brand: '', model: '', lastMaintenanceDate: '', nextMaintenanceDate: '', inspectionExpiry: '', insuranceExpiry: '',
      ownership: 'Own', supplierId: null, trailerPlate: '', defaultDriverId: null },
  })
  const save = useSave((v: FormValues) => vehicle ? api.update(vehicle.id, nullify(v)) : api.create(nullify(v)), {
    invalidate: ['vehicles'], success: vehicle ? 'Araç güncellendi.' : 'Araç eklendi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  const ownership = useWatch({ control, name: 'ownership' })
  const type = useWatch({ control, name: 'type' })
  const lastMaintenance = useWatch({ control, name: 'lastMaintenanceDate' })
  const [tab, setTab] = useState<'info' | 'docs' | 'maint'>('info')

  return (
    <>
    <Modal open onClose={onClose} title={vehicle ? `Araç: ${vehicle.plate}` : 'Yeni Araç'} size={tab === 'info' ? 'md' : 'lg'}
      footer={tab === 'info' ? <><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>
        : <Button variant="secondary" onClick={onClose}>Kapat</Button>}>
      {vehicle && <div className="mb-3"><Tabs value={tab} onChange={setTab}
        tabs={[{ value: 'info', label: 'Bilgiler' }, { value: 'docs', label: 'Belgeler' }, { value: 'maint', label: 'Bakım' }]} /></div>}
      {vehicle && tab === 'docs' && <DocumentsPanel ownerType="Vehicle" ownerId={vehicle.id} />}
      {vehicle && tab === 'maint' && <MaintenancePanel vehicleId={vehicle.id} currentKm={vehicle.km} />}
      <form onSubmit={submit} className={tab === 'info' ? 'space-y-6' : 'hidden'}>
        <Section n={1} title="Araç">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plaka" required error={errors.plate?.message}><input className="input uppercase" placeholder="34 ABC 123" {...register('plate')} /></Field>
            <Field label="Araç Tipi" required error={errors.type?.message}>
              <input className="input" placeholder="Kamyon" {...register('type')} />
              <SuggestChips values={['Tır', 'Kamyon', 'Kamyonet', 'Panelvan', 'Lowbed', 'Frigorifik']} value={type}
                onPick={(v) => setValue('type', v, { shouldValidate: true, shouldDirty: true })} />
            </Field>
            <Field group className="sm:col-span-2" label="Kimin aracı?" hint="Kiralık araçta araç maliyeti, araç sahibine (tedarikçi) borç olarak yazılır.">
              <ControlledChoice control={control} name="ownership" label="Sahiplik" columns={2}
                options={choices(vehicleOwnershipLabel, vehicleOwnershipIcon)} onValueChange={(v) => { if (v === 'Own') setValue('supplierId', null) }} />
            </Field>
            {ownership === 'Rented' && (
              <Field className="sm:col-span-2" label="Araç Sahibi (tedarikçi)" required error={errors.supplierId?.message}>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FormSelect control={control} name="supplierId" placeholder="Tedarikçi seçin" options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.label }))} />
                  </div>
                  <Button type="button" variant="secondary" className="self-end" onClick={() => setNewSupplier(true)}>Yeni</Button>
                </div>
              </Field>
            )}
            <Field label="Varsayılan Şoför" error={errors.defaultDriverId?.message} hint="Yeni seferde araçla birlikte gelir.">
              <FormSelect control={control} name="defaultDriverId" placeholder="—" options={(drivers.data ?? []).map((d) => ({ value: d.id, label: d.label }))} />
            </Field>
            <Field label="Dorse Plakası" error={errors.trailerPlate?.message}><input className="input uppercase" placeholder="34 DRS 01" {...register('trailerPlate')} /></Field>
          </div>
        </Section>
        <Section n={2} title="Durum ve kilometre">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field group className="sm:col-span-2" label="Şu an ne durumda?" error={errors.status?.message} hint="“Yolda” durumu seferlerden kendiliğinden belirlenir.">
              <ControlledChoice control={control} name="status" label="Araç durumu" columns={3} options={choices(vehicleStatusLabel, vehicleStatusIcon)} />
            </Field>
            <Field label="Km" required error={errors.km?.message}><input className="input tabular-nums" type="number" min="0" inputMode="numeric" {...register('km', { valueAsNumber: true })} /></Field>
            <Field label="Sonraki Bakım Km" error={errors.nextMaintenanceKm?.message} hint="1.000 km kala uyarı çıkar. Bakım kaydı girince kendiliğinden güncellenir.">
              <input className="input tabular-nums" type="number" min="0" inputMode="numeric" {...register('nextMaintenanceKm', { valueAsNumber: true })} />
            </Field>
          </div>
        </Section>
        <Section n={3} title="Muayene, sigorta ve bakım" hint="Bitişe 30 gün kala uyarı çıkar.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Muayene Bitiş"><DateQuick control={control} name="inspectionExpiry" quick="expiry" years={[1, 2]} /></Field>
            <Field label="Trafik Sigortası Bitiş"><DateQuick control={control} name="insuranceExpiry" quick="expiry" years={[1]} /></Field>
            <Field label="Son Bakım Tarihi"><DateQuick control={control} name="lastMaintenanceDate" /></Field>
            <Field label="Sonraki Bakım Tarihi"><DateQuick control={control} name="nextMaintenanceDate" quick="due" from={lastMaintenance || undefined} dueDays={[90, 180, 365]} /></Field>
          </div>
        </Section>
        <MoreFields title="Marka, model ve yıl (isteğe bağlı)" defaultOpen={!!vehicle?.brand} hasError={!!(errors.brand || errors.model || errors.modelYear)}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Marka" error={errors.brand?.message}><input className="input" placeholder="Ford" {...register('brand')} /></Field>
            <Field label="Model" error={errors.model?.message}><input className="input" placeholder="Cargo" {...register('model')} /></Field>
            <Field label="Model Yılı" error={errors.modelYear?.message}><input className="input" type="number" inputMode="numeric" {...register('modelYear', { valueAsNumber: true })} /></Field>
          </div>
        </MoreFields>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
    {newSupplier && <SupplierForm supplier={null} onClose={() => setNewSupplier(false)}
      onSaved={(s) => { suppliers.refetch(); setValue('supplierId', s.id, { shouldValidate: true }) }} />}
    </>
  )
}
