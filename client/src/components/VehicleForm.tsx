import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Vehicle, VehicleCard } from '../api/types'
import { Button, Field, Modal, Tabs } from './ui'
import { DocumentsPanel, MaintenancePanel } from './FleetPanels'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { FormSelect } from './FormSelect'
import { ControlledSmartField, SmartField } from './SmartField'
import { crud, useLookup, useSave } from '../lib/hooks'
import { vehicleOwnershipLabel, vehicleStatusLabel } from '../lib/labels'
import { SupplierForm } from './SupplierForm'
import { ControlledChoice } from './Choice'
import { DateQuick, MoreFields } from './Inputs'
import { choices } from '../lib/choices'
import { vehicleOwnershipIcon } from '../lib/icons'
import { DateInput } from './DateInput'

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

/** Araç ekleme / düzenleme penceresi. Sefer formundan da açılır (yazılan plaka hazır gelir). */
export function VehicleForm({ vehicle, onClose, onSaved, initialPlate }: { vehicle: Vehicle | null; onClose: () => void; onSaved?: (v: Vehicle) => void; initialPlate?: string }) {
  const drivers = useLookup('drivers')
  const suppliers = useLookup('suppliers')
  const [newSupplier, setNewSupplier] = useState<string | null>(null)
  const { register, handleSubmit, control, setError, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vehicle ? {
      ...vehicle, brand: vehicle.brand ?? '', model: vehicle.model ?? '', modelYear: vehicle.modelYear ?? null,
      lastMaintenanceDate: vehicle.lastMaintenanceDate ?? '', nextMaintenanceDate: vehicle.nextMaintenanceDate ?? '',
      inspectionExpiry: vehicle.inspectionExpiry ?? '', insuranceExpiry: vehicle.insuranceExpiry ?? '',
      defaultDriverId: vehicle.defaultDriverId ?? null, ownership: vehicle.ownership ?? 'Own', supplierId: vehicle.supplierId ?? null,
      trailerPlate: vehicle.trailerPlate ?? '', nextMaintenanceKm: vehicle.nextMaintenanceKm ?? null,
    } : { plate: initialPlate ?? '', nextMaintenanceKm: null, modelYear: null, status: 'Available', km: 0, brand: '', model: '', lastMaintenanceDate: '', nextMaintenanceDate: '', inspectionExpiry: '', insuranceExpiry: '',
      ownership: 'Own', supplierId: null, trailerPlate: '', defaultDriverId: null },
  })
  // Eski paneldeki araç kartı (kapasite, yakıt, kasko, egzoz…) ayrı tutulur ve kayıtta "card" olarak gönderilir.
  const [card, setCard] = useState<VehicleCard>({ ...vehicle?.card })
  const setC = (k: keyof VehicleCard) => (e: { target: { value: string } }) => setCard((c) => ({ ...c, [k]: e.target.value }))
  const body = (v: FormValues) => ({ ...nullify(v), card: Object.fromEntries(Object.entries(card).map(([k, x]) => [k, x === '' ? null : x])) }) as unknown as FormValues
  const save = useSave((v: FormValues) => vehicle ? api.update(vehicle.id, body(v)) : api.create(body(v)), {
    invalidate: ['vehicles'], success: vehicle ? 'Araç güncellendi.' : 'Araç eklendi.', onSuccess: (v) => { onSaved?.(v); onClose() },
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  const ownership = useWatch({ control, name: 'ownership' })
  const km = useWatch({ control, name: 'km' })
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
      <form onSubmit={submit} className={tab === 'info' ? 'space-y-5' : 'hidden'}>
        <Field group label="Araç kimin?" error={errors.ownership?.message}>
          <ControlledChoice control={control} name="ownership" label="Sahiplik" columns={2}
            options={choices(vehicleOwnershipLabel, vehicleOwnershipIcon, { Own: 'Şirketin kendi aracı', Rented: 'Maliyeti araç sahibine borç yazılır' })} />
        </Field>
        {ownership === 'Rented' && (
          <Field label="Araç Sahibi (tedarikçi)" required error={errors.supplierId?.message}>
            <FormSelect control={control} name="supplierId" placeholder="Araç sahibinin adını yazın veya seçin" options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.label }))}
              onCreate={(t) => setNewSupplier(t)} createLabel="Yeni araç sahibi olarak ekle" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plaka" required error={errors.plate?.message}><input className="input text-lg font-medium uppercase" placeholder="34 ABC 123" {...register('plate')} /></Field>
          <Field label="Km" required error={errors.km?.message}><input className="input" type="number" min="0" inputMode="numeric" {...register('km', { valueAsNumber: true })} /></Field>
        </div>
        <Field label="Araç Tipi" required error={errors.type?.message}>
          <ControlledSmartField control={control} name="type" field="vehicleType" label="Araç Tipi" placeholder="Seçin veya yazın (ör. Tır)" maxLength={100} />
        </Field>
        <Field label="Varsayılan Şoför" error={errors.defaultDriverId?.message}>
          <FormSelect control={control} name="defaultDriverId" placeholder="—" options={(drivers.data ?? []).map((d) => ({ value: d.id, label: d.label }))} />
        </Field>
        <Field group label="Durum" error={errors.status?.message} hint="“Yolda” durumu sevkiyatlardan kendiliğinden belirlenir.">
          <ControlledChoice control={control} name="status" label="Durum" variant="chips" options={choices(vehicleStatusLabel)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Muayene Bitiş"><DateQuick control={control} name="inspectionExpiry" quick="expiry" /></Field>
          <Field label="Trafik Sigortası Bitiş"><DateQuick control={control} name="insuranceExpiry" quick="expiry" /></Field>
        </div>
        <MoreFields title="Marka, dorse ve bakım (isteğe bağlı)" defaultOpen={!!vehicle}
          hasError={!!(errors.brand || errors.model || errors.modelYear || errors.trailerPlate || errors.nextMaintenanceKm)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marka" error={errors.brand?.message}><input className="input" placeholder="Ford" {...register('brand')} /></Field>
            <Field label="Model" error={errors.model?.message}><input className="input" placeholder="Cargo" {...register('model')} /></Field>
            <Field label="Model Yılı" error={errors.modelYear?.message}><input className="input" type="number" inputMode="numeric" {...register('modelYear', { valueAsNumber: true })} /></Field>
            <Field label="Dorse Plakası" error={errors.trailerPlate?.message}><input className="input uppercase" placeholder="34 DRS 01" {...register('trailerPlate')} /></Field>
            <Field label="Son Bakım Tarihi"><DateQuick control={control} name="lastMaintenanceDate" quick="none" /></Field>
            <Field label="Sonraki Bakım Tarihi"><DateQuick control={control} name="nextMaintenanceDate" quick="due" dueDays={[90, 180, 365]} /></Field>
            <Field className="sm:col-span-2" label="Sonraki Bakım Km" error={errors.nextMaintenanceKm?.message} hint="1.000 km kala uyarı çıkar. Bakım kaydı girince kendiliğinden güncellenir.">
              <input className="input" type="number" min="0" inputMode="numeric" {...register('nextMaintenanceKm', { valueAsNumber: true })} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[10000, 15000, 20000].map((k) => (
                  <button key={k} type="button" onClick={() => setValue('nextMaintenanceKm', (Number.isFinite(km) ? km : 0) + k, { shouldValidate: true })}
                    className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">+{k.toLocaleString('tr-TR')} km</button>
                ))}
              </div>
            </Field>
          </div>
        </MoreFields>
        <MoreFields title="Kapasite, yakıt, sigorta, kasko, muayene ve egzoz bilgileri (isteğe bağlı)" defaultOpen={!!vehicle?.card?.capacity || !!vehicle?.card?.cascoExpiry}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Taşıma Kapasitesi"><SmartField field="vehicleCapacity" label="Taşıma Kapasitesi" placeholder="3,5 ton" chips={5} maxLength={50} value={card.capacity} onChange={(v) => setCard((c) => ({ ...c, capacity: v }))} /></Field>
            <Field label="Yakıt Türü"><SmartField field="fuelType" label="Yakıt Türü" placeholder="Dizel" chips={5} maxLength={30} value={card.fuelType} onChange={(v) => setCard((c) => ({ ...c, fuelType: v }))} /></Field>
            <Field label="Sigorta Bilgisi" hint="Şirket, poliçe no"><input className="input" value={card.insuranceInfo ?? ''} onChange={setC('insuranceInfo')} /></Field>
            <Field label="Kasko Bilgisi"><input className="input" value={card.cascoInfo ?? ''} onChange={setC('cascoInfo')} /></Field>
            <Field label="Kasko Bitiş"><DateInput value={card.cascoExpiry ?? ''} onChange={(v) => setC('cascoExpiry')({ target: { value: v } })} /></Field>
            <Field label="Muayene Bilgisi"><input className="input" value={card.inspectionInfo ?? ''} onChange={setC('inspectionInfo')} /></Field>
            <Field label="Egzoz Muayenesi Bilgisi"><input className="input" value={card.emissionInfo ?? ''} onChange={setC('emissionInfo')} /></Field>
            <Field label="Egzoz Muayenesi Bitiş"><DateInput value={card.emissionExpiry ?? ''} onChange={(v) => setC('emissionExpiry')({ target: { value: v } })} /></Field>
            <Field label="Bakım Bilgisi" hint="Servis / usta"><input className="input" value={card.maintenanceInfo ?? ''} onChange={setC('maintenanceInfo')} /></Field>
            <Field label="Ruhsat Sahibi"><input className="input" value={card.registrationOwner ?? ''} onChange={setC('registrationOwner')} /></Field>
          </div>
        </MoreFields>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
    {newSupplier !== null && <SupplierForm supplier={null} initialTitle={newSupplier} onClose={() => setNewSupplier(null)}
      onSaved={(s) => { suppliers.refetch(); setValue('supplierId', s.id, { shouldValidate: true }) }} />}
    </>
  )
}
