import { useState } from 'react'
import { Copy, FileText, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'

/** Liste boşsa (ilk kurulum) nereden ekleneceğini gösterir. */
function MissingHint({ show, to, text }: { show: boolean; to: string; text: string }) {
  if (!show) return null
  return <Link to={to} className="mt-1 block text-sm font-medium text-brand-700 underline underline-offset-2">{text}</Link>
}
import { useQuery } from '@tanstack/react-query'
import { errorMessage, get, openPdf, post } from '../api/client'
import type { CustomerRisk, Driver, Trip, TripEvent, TripStatus, Vehicle } from '../api/types'
import { applyServerErrors, idField, money, nullify, optStr, req } from '../lib/forms'
import { dateTime, tl, todayIso } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { tripEventSourceLabel, tripStatusAction, tripStatusLabel, tripStatusTone } from '../lib/labels'
import { CityOptions } from './CityOptions'
import { Badge, Button, Field, Modal, Tabs } from './ui'
import { useToast } from './Toast'
import { FormSelect } from './FormSelect'
import { TripAttachments, TripTracking } from './TripExtras'
import { AuditLogTable } from './AuditLog'
import { AmountInput, DateQuick, MoreFields, Section, SuggestChips } from './Inputs'
import { vehicleOwnershipIcon } from '../lib/icons'
import { useAuth } from '../lib/auth'

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
  customerReference: optStr,
  cargoType: optStr,
  cargoWeightKg: z.number().min(0, 'Negatif olamaz.').nullable().or(z.nan().transform(() => null)),
  cargoQuantity: z.number().int('Tam sayı girin.').min(0, 'Negatif olamaz.').nullable().or(z.nan().transform(() => null)),
  cargoUnit: optStr,
  trailerPlate: optStr,
  loadingCity: optStr,
  deliveryCity: optStr,
  loadingContact: optStr,
  deliveryContact: optStr,
  carrierSupplierId: z.number().nullable().or(z.nan().transform(() => null)),
  carrierInvoiceNo: optStr,
  carrierInvoiceDate: optStr,
}).refine((v) => !v.deliveryDate || v.deliveryDate >= v.loadingDate, {
  path: ['deliveryDate'], message: 'Teslim tarihi yükleme tarihinden önce olamaz.',
})

type FormValues = z.infer<typeof schema>
const api = crud<Trip, FormValues>('trips')

export function TripForm({ trip, onClose, defaults, onDelete, onCopy, copyOf }: {
  trip: Trip | null; onClose: () => void; defaults?: Partial<FormValues>; onDelete?: (trip: Trip) => void
  /** Düzenlenen seferin kopyasıyla yeni sefer formu açar. */
  onCopy?: (trip: Trip) => void
  /** Yeni sefer bu seferden kopyalanır (tarih bugüne alınır). */
  copyOf?: Trip | null
}) {
  const toast = useToast()
  const [tab, setTab] = useState<'info' | 'files' | 'tracking' | 'history'>('info')
  const { can } = useAuth()
  const customers = useLookup('customers')
  const vehicles = useLookup('vehicles')
  const drivers = useLookup('drivers')
  const suppliers = useLookup('suppliers')
  const [quickDriver, setQuickDriver] = useState(false)

  const { register, handleSubmit, control, getValues, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: trip ? {
      customerId: trip.customerId, vehicleId: trip.vehicleId, driverId: trip.driverId,
      loadingAddress: trip.loadingAddress, deliveryAddress: trip.deliveryAddress,
      loadingDate: trip.loadingDate, deliveryDate: trip.deliveryDate ?? '', description: trip.description ?? '',
      vehicleCost: trip.vehicleCost, salePrice: trip.salePrice,
      customerReference: trip.customerReference ?? '', cargoType: trip.cargoType ?? '', cargoWeightKg: trip.cargoWeightKg ?? null,
      cargoQuantity: trip.cargoQuantity ?? null, cargoUnit: trip.cargoUnit ?? '', trailerPlate: trip.trailerPlate ?? '',
      loadingCity: trip.loadingCity ?? '', deliveryCity: trip.deliveryCity ?? '', loadingContact: trip.loadingContact ?? '',
      deliveryContact: trip.deliveryContact ?? '', carrierSupplierId: trip.carrierSupplierId ?? null,
      carrierInvoiceNo: trip.carrierInvoiceNo ?? '', carrierInvoiceDate: trip.carrierInvoiceDate ?? '',
    } : copyOf ? {
      customerId: copyOf.customerId, vehicleId: copyOf.vehicleId, driverId: copyOf.driverId,
      loadingAddress: copyOf.loadingAddress, deliveryAddress: copyOf.deliveryAddress,
      loadingDate: todayIso(), deliveryDate: '', description: copyOf.description ?? '',
      vehicleCost: copyOf.vehicleCost, salePrice: copyOf.salePrice,
      customerReference: '', cargoType: copyOf.cargoType ?? '', cargoWeightKg: copyOf.cargoWeightKg ?? null,
      cargoQuantity: copyOf.cargoQuantity ?? null, cargoUnit: copyOf.cargoUnit ?? '', trailerPlate: copyOf.trailerPlate ?? '',
      loadingCity: copyOf.loadingCity ?? '', deliveryCity: copyOf.deliveryCity ?? '', loadingContact: copyOf.loadingContact ?? '',
      deliveryContact: copyOf.deliveryContact ?? '', carrierSupplierId: copyOf.carrierSupplierId ?? null,
      carrierInvoiceNo: '', carrierInvoiceDate: '',
    } : { loadingDate: todayIso(), deliveryDate: '', description: '', loadingCity: '', deliveryCity: '', carrierSupplierId: null, ...defaults },
  })

  const save = useSave((v: FormValues) => {
    const body = nullify(v)
    return trip ? api.update(trip.id, body) : api.create(body)
  }, {
    invalidate: ['trips', 'vehicles', 'customers', 'suppliers'], success: trip ? 'Sefer güncellendi.' : 'Sefer oluşturuldu.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })

  const statusMut = useSave((s: TripStatus) => post<Trip>(`/trips/${trip!.id}/status`, { status: s }),
    { invalidate: ['trips', 'vehicles', 'suppliers'], success: 'Sefer durumu güncellendi.', onSuccess: onClose })

  const cost = useWatch({ control, name: 'vehicleCost' })
  const price = useWatch({ control, name: 'salePrice' })
  const profit = (Number(price) || 0) - (Number(cost) || 0) - (trip?.expenseTotal ?? 0)
  const invoiced = !!trip?.invoiceId
  const customerId = useWatch({ control, name: 'customerId' })
  const risk = useQuery({
    queryKey: ['customers', 'risk', customerId, trip?.id],
    queryFn: () => get<CustomerRisk>(`/customers/${customerId}/risk`, { excludeTripId: trip?.id }),
    enabled: !!customerId && !Number.isNaN(customerId) && !invoiced,
  })
  const overLimit = risk.data?.creditLimit != null && risk.data.used + (Number(price) || 0) > risk.data.creditLimit

  const vehicleId = useWatch({ control, name: 'vehicleId' })
  const vehicle = useQuery({
    queryKey: ['vehicles', 'detail', vehicleId], queryFn: () => get<Vehicle>(`/vehicles/${vehicleId}`),
    enabled: !!vehicleId && !Number.isNaN(vehicleId),
  })
  const rented = vehicle.data?.ownership === 'Rented'
  const loadingDate = useWatch({ control, name: 'loadingDate' })
  const cargoType = useWatch({ control, name: 'cargoType' })
  const cargoUnit = useWatch({ control, name: 'cargoUnit' })

  const onVehicleChange = (id: number) => {
    // Taşeron ve dorse yeni aracın bilgisinden gelsin (sunucu boş alanları araçtan doldurur).
    setValue('carrierSupplierId', null)
    setValue('trailerPlate', '')
    const v = vehicles.data?.find((x) => x.id === id)
    const current = getValues('driverId')
    if (v?.extra && (current == null || Number.isNaN(current))) setValue('driverId', Number(v.extra))
  }

  return (
    <Modal open onClose={onClose} title={trip ? 'Sefer Düzenle' : copyOf ? 'Sefer Oluştur (kopya)' : 'Sefer Oluştur'} size="lg"
      footer={tab === 'info' ? <>
        {trip && (
          <div className="mr-auto flex flex-wrap gap-2">
            {onDelete && !trip.invoiceId && (
              <Button variant="ghost" className="text-red-700 hover:bg-red-50" icon={<Trash2 className="size-4" />} onClick={() => onDelete(trip)}>Seferi Sil</Button>
            )}
            <Button variant="secondary" icon={<FileText className="size-4" />} title="Araçta taşınacak, teslimde imzalatılacak belge (fiyat içermez)"
              onClick={() => openPdf(`/trips/${trip.id}/waybill`, `S-${String(trip.id).padStart(6, '0')}.pdf`).catch((e) => toast.error(errorMessage(e)))}>Sevk Belgesi</Button>
            {onCopy && <Button variant="secondary" icon={<Copy className="size-4" />} title="Aynı müşteri, güzergah ve fiyatla yeni sefer" onClick={() => onCopy(trip)}>Kopyala</Button>}
          </div>
        )}
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button onClick={handleSubmit((v) => save.mutate(v))} loading={save.isPending}>Kaydet</Button>
      </> : <Button variant="secondary" onClick={onClose}>Kapat</Button>}>
      {trip && (
        <div className="mb-4">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'info', label: 'Sefer Bilgileri' },
            { value: 'files', label: 'Dosyalar / Fotoğraflar' },
            { value: 'tracking', label: 'Takip ve Rota' },
            { value: 'history' as const, label: 'Geçmiş' },
          ]} />
        </div>
      )}
      {trip && tab === 'files' && <TripAttachments trip={trip} />}
      {trip && tab === 'tracking' && <TripTracking trip={trip} />}
      {trip && tab === 'history' && <>
        <TripTimeline tripId={trip.id} />
        {can('admin') && <div className="mt-4"><div className="mb-2 text-sm font-semibold text-navy-900">Değişiklik kaydı</div><AuditLogTable entityType="Trip" entityId={trip.id} /></div>}
      </>}
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
      <form className="space-y-6" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <Section n={1} title="Müşteri ve güzergâh">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Müşteri" required error={errors.customerId?.message}>
              <FormSelect control={control} name="customerId" disabled={invoiced}
                options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))} />
              <MissingHint show={customers.data?.length === 0} to="/musteriler?new=1" text="Henüz müşteri yok — önce müşteri ekleyin →" />
            </Field>
            <Field label="Müşteri Referans No" error={errors.customerReference?.message} hint="Müşterinin sipariş / yük numarası (faturaya yazılır).">
              <input className="input" placeholder="4500123" {...register('customerReference')} />
            </Field>
            {overLimit && risk.data && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-800 md:col-span-2">
                Risk limiti aşılıyor: açık bakiye {tl(risk.data.openBalance)} + faturalanmamış {tl(risk.data.uninvoicedDelivered)} + bu sefer {tl(Number(price) || 0)} &gt; limit {tl(risk.data.creditLimit!)}. Kayıt yine de yapılabilir.
              </p>
            )}
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
              <Field label="Yükleme İli" error={errors.loadingCity?.message}><select className="input" {...register('loadingCity')}><CityOptions placeholder="İl" /></select></Field>
              <Field label="Yükleme Adresi" required error={errors.loadingAddress?.message}>
                <input className="input" placeholder="Tuzla OSB" {...register('loadingAddress')} />
              </Field>
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
              <Field label="Teslim İli" error={errors.deliveryCity?.message}><select className="input" {...register('deliveryCity')}><CityOptions placeholder="İl" /></select></Field>
              <Field label="Teslimat Adresi" required error={errors.deliveryAddress?.message}>
                <input className="input" placeholder="Balçova" {...register('deliveryAddress')} />
              </Field>
            </div>
            <Field label="Yükleme Tarihi" required error={errors.loadingDate?.message}>
              <DateQuick control={control} name="loadingDate" />
            </Field>
            <Field label="Teslim Tarihi" error={errors.deliveryDate?.message} hint="Yükleme gününden kaç gün sonra?">
              <DateQuick control={control} name="deliveryDate" quick="due" from={loadingDate} dueDays={[1, 2, 3]} />
            </Field>
            {trip?.receivedBy && (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-base text-emerald-800 md:col-span-2">
                Teslim alan: <b>{trip.receivedBy}</b>{trip.deliveredAt && ` · ${dateTime(trip.deliveredAt)}`}
              </p>
            )}
          </div>
        </Section>

        <Section n={2} title="Araç ve şoför">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Araç" required error={errors.vehicleId?.message}>
              <FormSelect control={control} name="vehicleId" onValueChange={onVehicleChange}
                options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))} />
              <MissingHint show={vehicles.data?.length === 0} to="/araclar?new=1" text="Henüz araç yok — önce araç ekleyin →" />
            </Field>
            <Field label="Şoför" required error={errors.driverId?.message} hint="Araç seçince aracın varsayılan şoförü gelir.">
              <FormSelect control={control} name="driverId" options={[
                ...(drivers.data ?? []).map((d) => ({ value: d.id, label: d.label })),
                ...(trip && drivers.data && !drivers.data.some((d) => d.id === trip.driverId) ? [{ value: trip.driverId, label: `${trip.driverName} (pasif)` }] : []),
              ]} />
              <button type="button" className="mt-2 text-base font-semibold text-brand-700 underline underline-offset-2" onClick={() => setQuickDriver(true)}>+ Hızlı şoför ekle</button>
            </Field>
            <Field label="Dorse Plakası" error={errors.trailerPlate?.message} hint={vehicle.data?.trailerPlate ? 'Boş bırakılırsa aracın dorsesi yazılır.' : undefined}>
              <input className="input uppercase" placeholder={vehicle.data?.trailerPlate ?? '34 DRS 01'} {...register('trailerPlate')} />
            </Field>
          </div>
          {(rented || trip?.carrierSupplierId) && (
            <div className="space-y-4 rounded-xl border-2 border-violet-200 bg-violet-50/40 p-4">
              <div className="flex items-center gap-2 text-base font-bold text-navy-900 [&_svg]:size-5">{vehicleOwnershipIcon.Rented} Taşeron (kiralık araç)</div>
              <Field label="Taşeron / Araç sahibi" hint="Araç maliyeti bu tedarikçiye borç olarak yazılır. Boşsa aracın sahibi.">
                <FormSelect control={control} name="carrierSupplierId" placeholder={vehicle.data?.supplierTitle ? `Araç sahibi: ${vehicle.data.supplierTitle}` : 'Aracın sahibi'}
                  options={(suppliers.data ?? []).map((x) => ({ value: x.id, label: x.label }))} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Taşeron Fatura No" error={errors.carrierInvoiceNo?.message}><input className="input" {...register('carrierInvoiceNo')} /></Field>
                <Field label="Fatura Tarihi" error={errors.carrierInvoiceDate?.message}><DateQuick control={control} name="carrierInvoiceDate" /></Field>
              </div>
            </div>
          )}
        </Section>

        <Section n={3} title="Yük" hint="İsteğe bağlı; sevk belgesine yazılır.">
          <div className="grid gap-4 md:grid-cols-3">
            <Field className="md:col-span-3" label="Yük Cinsi" error={errors.cargoType?.message}>
              <input className="input" placeholder="Mobilya" {...register('cargoType')} />
              <SuggestChips values={['Mobilya', 'Genel kargo', 'İnşaat malzemesi', 'Gıda', 'Tekstil', 'Otomotiv parçası', 'Makine']} value={cargoType}
                onPick={(v) => setValue('cargoType', v, { shouldDirty: true })} />
            </Field>
            <Field label="Miktar" error={errors.cargoQuantity?.message}>
              <input className="input tabular-nums" type="number" min="0" inputMode="numeric" {...register('cargoQuantity', { valueAsNumber: true })} />
            </Field>
            <Field label="Birim" error={errors.cargoUnit?.message}>
              <input className="input" placeholder="palet" {...register('cargoUnit')} />
              <SuggestChips values={['palet', 'koli', 'adet', 'ton', 'm³']} value={cargoUnit} onPick={(v) => setValue('cargoUnit', v, { shouldDirty: true })} />
            </Field>
            <Field label="Ağırlık (kg)" error={errors.cargoWeightKg?.message}>
              <input className="input tabular-nums" type="number" min="0" step="1" inputMode="numeric" {...register('cargoWeightKg', { valueAsNumber: true })} />
            </Field>
          </div>
        </Section>

        <Section n={4} title="Fiyat">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={rented ? 'Taşerona Ödenecek (TL)' : 'Araç Maliyeti (TL)'} error={errors.vehicleCost?.message}>
              <AmountInput control={control} name="vehicleCost" />
            </Field>
            <Field label="Müşteri Satış Fiyatı (TL)" error={errors.salePrice?.message}>
              <AmountInput control={control} name="salePrice" disabled={invoiced} />
            </Field>
          </div>
          <div className="space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-base">
            <div className="flex justify-between gap-2"><span className="text-slate-600">Satış fiyatı</span><span className="tabular-nums">{tl(Number(price) || 0)}</span></div>
            <div className="flex justify-between gap-2"><span className="text-slate-600">− {rented ? 'Taşerona ödenecek' : 'Araç maliyeti'}</span><span className="tabular-nums">{tl(Number(cost) || 0)}</span></div>
            {trip && trip.expenseTotal > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">− Sefere bağlı giderler</span>
                <Link className="tabular-nums text-brand-700 underline underline-offset-2" to={`/giderler?tripId=${trip.id}`}>{tl(trip.expenseTotal)}</Link>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t border-slate-200 pt-1.5 text-lg font-bold">
              <span>Tahmini Kâr</span>
              <span className={profit < 0 ? 'text-red-700' : 'text-emerald-700'}>{tl(profit)}</span>
            </div>
          </div>
        </Section>

        <MoreFields title="Yetkililer ve not (isteğe bağlı)" hasError={!!(errors.loadingContact || errors.deliveryContact || errors.description)}
          defaultOpen={!!trip || !!(copyOf?.loadingContact || copyOf?.deliveryContact || copyOf?.description)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Yüklemede Yetkili" error={errors.loadingContact?.message}><input className="input" placeholder="Ad Soyad, telefon" {...register('loadingContact')} /></Field>
            <Field label="Teslimde Yetkili" error={errors.deliveryContact?.message}><input className="input" placeholder="Ad Soyad, telefon" {...register('deliveryContact')} /></Field>
            <Field className="md:col-span-2" label="Açıklama" error={errors.description?.message}>
              <textarea className="input min-h-16" placeholder="Özel notlar" {...register('description')} />
            </Field>
          </div>
        </MoreFields>
        <button type="submit" className="hidden" />
      </form>
      </div>
      {quickDriver && <QuickDriverDialog supplierId={rented ? vehicle.data?.supplierId ?? null : null} onClose={() => setQuickDriver(false)}
        onSaved={(d) => { drivers.refetch(); setValue('driverId', d.id, { shouldValidate: true }) }} />}
    </Modal>
  )
}

/** Sefer formundan çıkmadan şoför ekleme (kiralık araçta taşeronun şoförü olarak). */
function QuickDriverDialog({ supplierId, onClose, onSaved }: { supplierId: number | null; onClose: () => void; onSaved: (d: Driver) => void }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const save = useSave(() => post<Driver>('/drivers', { fullName, phone: phone || null, isActive: true, supplierId }), {
    invalidate: ['drivers'], success: 'Şoför eklendi.', onSuccess: (d) => { onSaved(d); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Hızlı şoför ekle" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button disabled={fullName.trim().length < 3} loading={save.isPending} onClick={() => save.mutate(undefined)}>Ekle</Button></>}>
      <div className="space-y-3">
        <Field label="Ad Soyad" required><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus /></Field>
        <Field label="Telefon"><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0532 123 45 67" /></Field>
        {supplierId && <p className="text-sm text-slate-600">Şoför, aracın sahibi olan taşerona bağlı olarak eklenir.</p>}
      </div>
    </Modal>
  )
}

/** Seferin durum zaman çizelgesi: ne zaman, kim, nereden (panel / şoför uygulaması / Excel). */
function TripTimeline({ tripId }: { tripId: number }) {
  const { data } = useQuery({ queryKey: ['trips', 'events', tripId], queryFn: () => get<TripEvent[]>(`/trips/${tripId}/events`) })
  if (!data) return null
  if (data.length === 0) return <p className="text-sm text-slate-500">Henüz durum kaydı yok.</p>
  return (
    <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4" aria-label="Durum geçmişi">
      {data.map((e) => (
        <li key={e.id}>
          <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full bg-brand-600" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tripStatusTone[e.status]}>{tripStatusLabel[e.status]}</Badge>
            <span className="text-sm font-medium text-slate-800">{dateTime(e.occurredAt)}</span>
          </div>
          <div className="text-sm text-slate-500">
            {[e.userName, tripEventSourceLabel[e.source]].filter(Boolean).join(' · ')}{e.note && ` · ${e.note}`}
          </div>
        </li>
      ))}
    </ol>
  )
}
