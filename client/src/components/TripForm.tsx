import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'

/** Liste boşsa (ilk kurulum) nereden ekleneceğini gösterir. */
function MissingHint({ show, to, text }: { show: boolean; to: string; text: string }) {
  if (!show) return null
  return <Link to={to} className="mt-1 block text-[13px] font-medium text-brand-700 underline underline-offset-2">{text}</Link>
}
import { post } from '../api/client'
import type { Trip, TripStatus } from '../api/types'
import { applyServerErrors, idField, money, nullify, optStr, req } from '../lib/forms'
import { moneyHint, tl, todayIso } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { tripStatusAction, tripStatusLabel, tripStatusTone } from '../lib/labels'
import { Badge, Button, Field, Modal, Tabs } from './ui'
import { FormSelect } from './FormSelect'
import { TripAttachments, TripTracking } from './TripExtras'

const schema = z.object({
  customerId: idField('Müşteri seçin.'),
  vehicleId: idField('Araç seçin.'),
  driverId: idField('Şoför seçin.'),
  loadingAddress: req('Yükleme adresi zorunlu.'),
  deliveryAddress: req('Teslimat adresi zorunlu.'),
  loadingDate: req('Yükleme tarihi zorunlu.'),
  deliveryDate: optStr,
  description: optStr,
  vehicleCost: money(),
  salePrice: money(),
}).refine((v) => !v.deliveryDate || v.deliveryDate >= v.loadingDate, {
  path: ['deliveryDate'], message: 'Teslim tarihi yükleme tarihinden önce olamaz.',
})

type FormValues = z.infer<typeof schema>
const api = crud<Trip, FormValues>('trips')

export function TripForm({ trip, onClose, defaults }: { trip: Trip | null; onClose: () => void; defaults?: Partial<FormValues> }) {
  const [tab, setTab] = useState<'info' | 'files' | 'tracking'>('info')
  const customers = useLookup('customers')
  const vehicles = useLookup('vehicles')
  const drivers = useLookup('drivers')

  const { register, handleSubmit, control, getValues, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: trip ? {
      customerId: trip.customerId, vehicleId: trip.vehicleId, driverId: trip.driverId,
      loadingAddress: trip.loadingAddress, deliveryAddress: trip.deliveryAddress,
      loadingDate: trip.loadingDate, deliveryDate: trip.deliveryDate ?? '', description: trip.description ?? '',
      vehicleCost: trip.vehicleCost, salePrice: trip.salePrice,
    } : { loadingDate: todayIso(), deliveryDate: '', description: '', ...defaults },
  })

  const save = useSave((v: FormValues) => {
    const body = nullify(v)
    return trip ? api.update(trip.id, body) : api.create(body)
  }, {
    invalidate: ['trips', 'vehicles', 'customers'], success: trip ? 'Sefer güncellendi.' : 'Sefer oluşturuldu.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })

  const statusMut = useSave((s: TripStatus) => post<Trip>(`/trips/${trip!.id}/status`, { status: s }),
    { invalidate: ['trips', 'vehicles'], success: 'Sefer durumu güncellendi.', onSuccess: onClose })

  const cost = useWatch({ control, name: 'vehicleCost' })
  const price = useWatch({ control, name: 'salePrice' })
  const profit = (Number(price) || 0) - (Number(cost) || 0) - (trip?.expenseTotal ?? 0)
  const invoiced = !!trip?.invoiceId

  const onVehicleChange = (id: number) => {
    const v = vehicles.data?.find((x) => x.id === id)
    const current = getValues('driverId')
    if (v?.extra && (current == null || Number.isNaN(current))) setValue('driverId', Number(v.extra))
  }

  return (
    <Modal open onClose={onClose} title={trip ? 'Sefer Düzenle' : 'Sefer Oluştur'} size="lg"
      footer={tab === 'info' ? <>
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button onClick={handleSubmit((v) => save.mutate(v))} loading={save.isPending}>Kaydet</Button>
      </> : <Button variant="secondary" onClick={onClose}>Kapat</Button>}>
      {trip && (
        <div className="mb-4">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'info', label: 'Sefer Bilgileri' },
            { value: 'files', label: 'Dosyalar / Fotoğraflar' },
            { value: 'tracking', label: 'Takip ve Rota' },
          ]} />
        </div>
      )}
      {trip && tab === 'files' && <TripAttachments trip={trip} />}
      {trip && tab === 'tracking' && <TripTracking trip={trip} />}
      <div className={tab === 'info' ? '' : 'hidden'}>
      {trip && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3">
          <span className="text-sm text-slate-600">Şu anki durum:</span>
          <Badge tone={tripStatusTone[trip.status]}>{tripStatusLabel[trip.status]}</Badge>
          <div className="flex-1" />
          {trip.nextStatuses.length > 0 && <span className="text-sm text-slate-600">Değiştir:</span>}
          {trip.nextStatuses.map((s) => (
            <Button key={s} size="sm" variant={s === 'Cancelled' ? 'danger' : s === 'Delivered' ? 'success' : 'secondary'}
              loading={statusMut.isPending && statusMut.variables === s} onClick={() => statusMut.mutate(s)}>
              {tripStatusAction[s]}
            </Button>
          ))}
        </div>
      )}
      {invoiced && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Bu sefer {trip?.invoiceNo} numaralı faturaya bağlı. Müşteri ve satış fiyatı değiştirilemez.
        </p>
      )}
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="space-y-3">
          <Field label="Müşteri" required error={errors.customerId?.message}>
            <FormSelect control={control} name="customerId" disabled={invoiced}
              options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
            <MissingHint show={customers.data?.length === 0} to="/musteriler?new=1" text="Henüz müşteri yok — önce müşteri ekleyin →" />
          </Field>
          <Field label="Yükleme Adresi" required error={errors.loadingAddress?.message}>
            <input className="input" placeholder="İstanbul / Sultanbeyli" {...register('loadingAddress')} />
          </Field>
          <Field label="Teslimat Adresi" required error={errors.deliveryAddress?.message}>
            <input className="input" placeholder="İzmir / Balçova" {...register('deliveryAddress')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yükleme Tarihi" required error={errors.loadingDate?.message}>
              <input className="input" type="date" {...register('loadingDate')} />
            </Field>
            <Field label="Teslim Tarihi" error={errors.deliveryDate?.message}>
              <input className="input" type="date" {...register('deliveryDate')} />
            </Field>
          </div>
          <Field label="Açıklama" error={errors.description?.message}>
            <textarea className="input min-h-20" placeholder="Mobilya sevkiyatı" {...register('description')} />
          </Field>
        </div>
        <div className="space-y-3">
          <Field label="Araç" required error={errors.vehicleId?.message}>
            <FormSelect control={control} name="vehicleId" onValueChange={onVehicleChange}
              options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
            <MissingHint show={vehicles.data?.length === 0} to="/araclar" text="Henüz araç yok — önce araç ekleyin →" />
          </Field>
          <Field label="Şoför" required error={errors.driverId?.message}>
            <FormSelect control={control} name="driverId" options={[
              ...(drivers.data ?? []).map((d) => ({ value: d.id, label: d.label })),
              ...(trip && drivers.data && !drivers.data.some((d) => d.id === trip.driverId) ? [{ value: trip.driverId, label: `${trip.driverName} (pasif)` }] : []),
            ]} />
            <MissingHint show={drivers.data?.length === 0} to="/soforler" text="Henüz şoför yok — önce şoför ekleyin →" />
          </Field>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 text-sm font-semibold text-navy-900">Nakliye Fiyatları</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Araç Maliyeti (TL)" error={errors.vehicleCost?.message} hint={moneyHint(cost)}>
                <input className="input text-right" type="number" step="0.01" min="0" inputMode="decimal" {...register('vehicleCost', { valueAsNumber: true })} />
              </Field>
              <Field label="Müşteri Satış Fiyatı (TL)" error={errors.salePrice?.message} hint={moneyHint(price)}>
                <input className="input text-right" type="number" step="0.01" min="0" inputMode="decimal" disabled={invoiced} {...register('salePrice', { valueAsNumber: true })} />
              </Field>
            </div>
            {trip && trip.expenseTotal > 0 && (
              <div className="mt-2 flex justify-between text-sm text-slate-600">
                <span>Sefere bağlı giderler</span>
                <Link className="text-brand-600 hover:underline" to={`/giderler?tripId=${trip.id}`}>{tl(trip.expenseTotal)}</Link>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold">
              <span>Tahmini Kâr</span>
              <span className={profit < 0 ? 'text-red-600' : 'text-emerald-700'}>{tl(profit)}</span>
            </div>
          </div>
        </div>
        <button type="submit" className="hidden" />
      </form>
      </div>
    </Modal>
  )
}
