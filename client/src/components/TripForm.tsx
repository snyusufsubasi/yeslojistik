import { useState, type ReactNode } from 'react'
import { AlertTriangle, Copy, FileText, History, MapPin, Sparkles, Trash2 } from 'lucide-react'
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
import type { CustomerRisk, Driver, Trip, TripAddressHint, TripEvent, TripHints, TripStatus, Vehicle } from '../api/types'
import { applyServerErrors, idField, money, nullify, optStr, req } from '../lib/forms'
import { date, dateTime, tl, todayIso } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { tripEventSourceLabel, tripStatusAction, tripStatusLabel, tripStatusTone } from '../lib/labels'
import { CitySelect } from './CitySelect'
import { Badge, Button, Field, Modal, Tabs } from './ui'
import { useToast } from './Toast'
import { FormSelect } from './FormSelect'
import { CustomerForm } from './CustomerForm'
import { SupplierForm } from './SupplierForm'
import { VehicleForm } from './VehicleForm'
import { TripAttachments, TripTracking } from './TripExtras'
import { AuditLogTable } from './AuditLog'
import { useAuth } from '../lib/auth'
import { AmountInput, DateQuick } from './Inputs'

const cargoUnits = ['palet', 'koli', 'adet', 'ton', 'kg', 'm³']
const defaultCargoTypes = ['Genel kargo', 'Mobilya', 'Tekstil', 'Gıda', 'İnşaat malzemesi', 'Otomotiv parçası']

/** Öneri düğmesi (adres, yük cinsi, birim): tek tıkla alanı doldurur. */
function Chip({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border px-3 text-sm transition ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
      <span className="truncate">{children}</span>
    </button>
  )
}

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
  jobRequestId: z.number().nullable().optional(),
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
  const [quickDriver, setQuickDriver] = useState<string | null>(null)
  const [newCustomer, setNewCustomer] = useState<string | null>(null)
  const [newSupplier, setNewSupplier] = useState<string | null>(null)
  const [newVehicle, setNewVehicle] = useState<string | null>(null)

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
      jobRequestId: trip.jobRequestId ?? null,
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
      jobRequestId: null,
    } : { loadingDate: todayIso(), deliveryDate: '', description: '', loadingCity: '', deliveryCity: '', carrierSupplierId: null, jobRequestId: null, ...defaults },
  })

  const save = useSave((v: FormValues) => {
    const body = nullify(v)
    return trip ? api.update(trip.id, body) : api.create(body)
  }, {
    invalidate: ['trips', 'vehicles', 'customers', 'suppliers', 'job-requests'], success: trip ? 'Sefer güncellendi.' : 'Sefer oluşturuldu.', onSuccess: onClose,
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

  // Öneriler: müşterinin son seferi ve adresleri, sık yük cinsleri, güzergâhın fiyat ortalaması.
  const loadingCity = useWatch({ control, name: 'loadingCity' })
  const deliveryCity = useWatch({ control, name: 'deliveryCity' })
  const loadingAddress = useWatch({ control, name: 'loadingAddress' })
  const deliveryAddress = useWatch({ control, name: 'deliveryAddress' })
  const cargoType = useWatch({ control, name: 'cargoType' })
  const cargoUnit = useWatch({ control, name: 'cargoUnit' })
  const validCustomer = !!customerId && !Number.isNaN(customerId)
  const hints = useQuery({
    queryKey: ['trips', 'hints', validCustomer ? customerId : null, loadingCity || null, deliveryCity || null],
    queryFn: () => get<TripHints>('/trips/hints', { customerId: validCustomer ? customerId : undefined, loadingCity: loadingCity || undefined, deliveryCity: deliveryCity || undefined }),
    enabled: !invoiced && (validCustomer || (!!loadingCity && !!deliveryCity)),
    staleTime: 60_000,
  })
  const lastTrip = hints.data?.lastTrip
  const last = !trip && !copyOf && validCustomer && lastTrip && lastTrip.customerId === customerId ? lastTrip : null
  const opts = { shouldDirty: true, shouldValidate: true }
  const fillFromLast = (t: Trip) => {
    setValue('loadingCity', t.loadingCity ?? '', opts)
    setValue('loadingAddress', t.loadingAddress, opts)
    setValue('loadingContact', t.loadingContact ?? '', opts)
    setValue('deliveryCity', t.deliveryCity ?? '', opts)
    setValue('deliveryAddress', t.deliveryAddress, opts)
    setValue('deliveryContact', t.deliveryContact ?? '', opts)
    setValue('cargoType', t.cargoType ?? '', opts)
    setValue('cargoUnit', t.cargoUnit ?? '', opts)
    setValue('cargoQuantity', t.cargoQuantity ?? null, opts)
    setValue('cargoWeightKg', t.cargoWeightKg ?? null, opts)
    setValue('carrierSupplierId', null)
    setValue('trailerPlate', '')
    setValue('vehicleId', t.vehicleId, opts)
    setValue('driverId', t.driverId, opts)
    setValue('vehicleCost', t.vehicleCost, opts)
    setValue('salePrice', t.salePrice, opts)
    toast.success('Son seferin bilgileri dolduruldu. Tarihi ve fiyatı kontrol edin.')
  }
  const pickAddress = (kind: 'loading' | 'delivery', a: TripAddressHint) => {
    setValue(`${kind}Address`, a.address, opts)
    if (a.city) setValue(`${kind}City`, a.city, opts)
    if (a.contact && !getValues(`${kind}Contact`)) setValue(`${kind}Contact`, a.contact, opts)
  }
  const route = hints.data?.route && loadingCity && deliveryCity ? hints.data.route : null
  const busy = vehicle.data && vehicle.data.status !== 'Available' && vehicle.data.id !== trip?.vehicleId ? vehicle.data.status : null

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
        {can('admin') && <div className="mt-4"><div className="mb-2 text-sm font-medium text-navy-900">Değişiklik kaydı</div><AuditLogTable entityType="Trip" entityId={trip.id} /></div>}
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
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="space-y-3">
          <Field label="Müşteri" required error={errors.customerId?.message}>
            <FormSelect control={control} name="customerId" disabled={invoiced} placeholder="Müşteri adı yazın veya seçin"
              options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.label }))}
              onCreate={(t) => setNewCustomer(t)} createLabel="Yeni müşteri olarak ekle" />
            <MissingHint show={customers.data?.length === 0} to="/musteriler?new=1" text="Henüz müşteri yok — önce müşteri ekleyin →" />
            {overLimit && risk.data && (
              <p role="alert" className="mt-1 rounded-md bg-red-50 px-2 py-1.5 text-sm text-red-700">
                Risk limiti aşılıyor: açık bakiye {tl(risk.data.openBalance)} + faturalanmamış {tl(risk.data.uninvoicedDelivered)} + bu sefer {tl(Number(price) || 0)} &gt; limit {tl(risk.data.creditLimit!)}. Kayıt yine de yapılabilir.
              </p>
            )}
          </Field>
          {last && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
              <History className="size-5 shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Son sefer · {date(last.loadingDate)}</div>
                <div className="truncate">{[last.loadingCity || last.loadingAddress, last.deliveryCity || last.deliveryAddress].join(' → ')}{last.cargoType && ` · ${last.cargoType}`} · {tl(last.salePrice)}</div>
              </div>
              <Button type="button" size="sm" icon={<Sparkles className="size-4" />} onClick={() => fillFromLast(last)}>Aynısını doldur</Button>
            </div>
          )}
          <Field label="Müşteri Referans No" error={errors.customerReference?.message} hint="Müşterinin sipariş / yük numarası (faturaya yazılır).">
            <input className="input" placeholder="4500123" {...register('customerReference')} />
          </Field>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
            <Field label="Yükleme İli" error={errors.loadingCity?.message}><CitySelect control={control} name="loadingCity" placeholder="İl" /></Field>
            <Field label="Yükleme Adresi" required error={errors.loadingAddress?.message}>
              <input className="input" placeholder="Tuzla OSB" {...register('loadingAddress')} />
            </Field>
          </div>
          <AddressChips items={hints.data?.loadingAddresses} current={loadingAddress} onPick={(a) => pickAddress('loading', a)} />
          <Field label="Yüklemede Yetkili" error={errors.loadingContact?.message}><input className="input" placeholder="Ad Soyad, telefon" {...register('loadingContact')} /></Field>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
            <Field label="Teslim İli" error={errors.deliveryCity?.message}><CitySelect control={control} name="deliveryCity" placeholder="İl" /></Field>
            <Field label="Teslimat Adresi" required error={errors.deliveryAddress?.message}>
              <input className="input" placeholder="Balçova" {...register('deliveryAddress')} />
            </Field>
          </div>
          <AddressChips items={hints.data?.deliveryAddresses} current={deliveryAddress} onPick={(a) => pickAddress('delivery', a)} />
          <Field label="Teslimde Yetkili" error={errors.deliveryContact?.message}><input className="input" placeholder="Ad Soyad, telefon" {...register('deliveryContact')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yükleme Tarihi" required error={errors.loadingDate?.message}>
              <DateQuick control={control} name="loadingDate" />
            </Field>
            <Field label="Teslim Tarihi" error={errors.deliveryDate?.message}>
              <input className="input" type="date" {...register('deliveryDate')} />
            </Field>
          </div>
          {trip?.receivedBy && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Teslim alan: <b>{trip.receivedBy}</b>{trip.deliveredAt && ` · ${dateTime(trip.deliveredAt)}`}
            </p>
          )}
          <Field label="Açıklama" error={errors.description?.message}>
            <textarea className="input min-h-16" placeholder="Özel notlar" {...register('description')} />
          </Field>
        </div>
        <div className="space-y-3">
          <Field label="Araç" required error={errors.vehicleId?.message}>
            <FormSelect control={control} name="vehicleId" onValueChange={onVehicleChange} placeholder="Plaka yazın veya seçin"
              options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.label }))}
              onCreate={(t) => setNewVehicle(t)} createLabel="Yeni araç olarak ekle" />
            <MissingHint show={vehicles.data?.length === 0} to="/araclar" text="Henüz araç yok — önce araç ekleyin →" />
            {busy && (
              <p role="alert" className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {busy === 'OnRoad' ? 'Bu araç şu an başka bir seferde (yolda). Yine de planlayabilirsiniz; önceki sefer bitince yola çıkar.' : 'Bu araç şu an bakımda görünüyor.'}
              </p>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Şoför" required error={errors.driverId?.message}>
              <FormSelect control={control} name="driverId" placeholder="Şoför ara" onCreate={(t) => setQuickDriver(t)} createLabel="Yeni şoför olarak ekle" options={[
                ...(drivers.data ?? []).map((d) => ({ value: d.id, label: d.label })),
                ...(trip && drivers.data && !drivers.data.some((d) => d.id === trip.driverId) ? [{ value: trip.driverId, label: `${trip.driverName} (pasif)` }] : []),
              ]} />
            </Field>
            <Field label="Dorse Plakası" error={errors.trailerPlate?.message}>
              <input className="input uppercase" placeholder={vehicle.data?.trailerPlate ?? '34 DRS 01'} {...register('trailerPlate')} />
            </Field>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 text-sm font-medium text-navy-900">Yük Bilgisi</div>
            <div className="grid grid-cols-2 gap-3">
              <Field className="col-span-2" label="Yük Cinsi" error={errors.cargoType?.message}>
                <input className="input" placeholder="Mobilya" {...register('cargoType')} />
              </Field>
              <div className="col-span-2 -mt-1 flex flex-wrap gap-1.5">
                {[...new Set([...(hints.data?.cargoTypes ?? []), ...defaultCargoTypes])].slice(0, 6).map((t) => (
                  <Chip key={t} active={cargoType === t} onClick={() => setValue('cargoType', t, opts)}>{t}</Chip>
                ))}
              </div>
              <Field label="Miktar" error={errors.cargoQuantity?.message}>
                <div className="flex gap-2">
                  <input className="input min-w-0" type="number" min="0" {...register('cargoQuantity', { valueAsNumber: true })} />
                  <input className="input w-24" placeholder="palet" {...register('cargoUnit')} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cargoUnits.map((u) => <Chip key={u} active={cargoUnit === u} onClick={() => setValue('cargoUnit', u, opts)}>{u}</Chip>)}
                </div>
              </Field>
              <Field label="Ağırlık (kg)" error={errors.cargoWeightKg?.message}>
                <input className="input" type="number" min="0" step="1" {...register('cargoWeightKg', { valueAsNumber: true })} />
              </Field>
            </div>
          </div>
          {(rented || trip?.carrierSupplierId) && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
              <div className="mb-2 text-sm font-medium text-navy-900">Taşeron (kiralık araç)</div>
              <Field label="Taşeron / Araç sahibi" hint="Araç maliyeti bu tedarikçiye borç olarak yazılır. Boşsa aracın sahibi.">
                <FormSelect control={control} name="carrierSupplierId" placeholder={vehicle.data?.supplierTitle ? `Araç sahibi: ${vehicle.data.supplierTitle}` : 'Aracın sahibi'}
                  options={(suppliers.data ?? []).map((x) => ({ value: x.id, label: x.label }))}
                  onCreate={(t) => setNewSupplier(t)} createLabel="Yeni taşeron olarak ekle" />
              </Field>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Taşeron Fatura No" error={errors.carrierInvoiceNo?.message}><input className="input" {...register('carrierInvoiceNo')} /></Field>
                <Field label="Fatura Tarihi" error={errors.carrierInvoiceDate?.message}><input className="input" type="date" {...register('carrierInvoiceDate')} /></Field>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 text-sm font-medium text-navy-900">Nakliye Fiyatları</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={rented ? 'Taşerona Ödenecek (TL)' : 'Araç Maliyeti (TL)'} error={errors.vehicleCost?.message}>
                <AmountInput control={control} name="vehicleCost" />
              </Field>
              <Field label="Müşteri Satış Fiyatı (TL)" error={errors.salePrice?.message}>
                <AmountInput control={control} name="salePrice" disabled={invoiced} />
              </Field>
            </div>
            {route && !invoiced && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <MapPin className="size-4 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1">
                  <b className="font-medium text-slate-900">{loadingCity} → {deliveryCity}</b>: son 1 yılda {route.count} sefer.
                  Ortalama satış <b className="font-medium">{tl(route.avgSalePrice)}</b>, araç maliyeti <b className="font-medium">{tl(route.avgVehicleCost)}</b>.
                  <span className="block text-slate-500">Son sefer ({date(route.lastDate)}): {tl(route.lastSalePrice)} / {tl(route.lastVehicleCost)}</span>
                </span>
                <Button type="button" size="sm" variant="secondary" onClick={() => { setValue('salePrice', route.lastSalePrice, opts); setValue('vehicleCost', route.lastVehicleCost, opts) }}>Son fiyatları kullan</Button>
              </div>
            )}
            {trip && trip.expenseTotal > 0 && (
              <div className="mt-2 flex justify-between text-sm text-slate-600">
                <span>Sefere bağlı giderler</span>
                <Link className="text-brand-600 hover:underline" to={`/giderler?tripId=${trip.id}`}>{tl(trip.expenseTotal)}</Link>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-medium">
              <span>Tahmini Kâr</span>
              <span className={profit < 0 ? 'text-red-600' : 'text-emerald-700'}>{tl(profit)}</span>
            </div>
          </div>
        </div>
        <button type="submit" className="hidden" />
      </form>
      </div>
      {quickDriver !== null && <QuickDriverDialog initialName={quickDriver} supplierId={rented ? vehicle.data?.supplierId ?? null : null} onClose={() => setQuickDriver(null)}
        onSaved={(d) => { drivers.refetch(); setValue('driverId', d.id, { shouldValidate: true }) }} />}
      {newCustomer !== null && <CustomerForm customer={null} initialTitle={newCustomer} onClose={() => setNewCustomer(null)}
        onSaved={(c) => { customers.refetch(); setValue('customerId', c.customer.id, { shouldValidate: true }) }} />}
      {newSupplier !== null && <SupplierForm supplier={null} initialTitle={newSupplier} onClose={() => setNewSupplier(null)}
        onSaved={(s) => { suppliers.refetch(); setValue('carrierSupplierId', s.id, { shouldValidate: true }) }} />}
      {newVehicle !== null && <VehicleForm vehicle={null} initialPlate={newVehicle} onClose={() => setNewVehicle(null)}
        onSaved={(v) => {
          // Araç değişince eski taşeron ve dorse bilgisi taşınmasın (onVehicleChange ile aynı temizlik).
          vehicles.refetch()
          setValue('carrierSupplierId', null)
          setValue('trailerPlate', '')
          setValue('vehicleId', v.id, { shouldValidate: true })
          const current = getValues('driverId')
          if (v.defaultDriverId && (current == null || Number.isNaN(current))) setValue('driverId', v.defaultDriverId)
        }} />}
    </Modal>
  )
}

/** Sefer formundan çıkmadan şoför ekleme (kiralık araçta taşeronun şoförü olarak). */
function QuickDriverDialog({ supplierId, onClose, onSaved, initialName = '' }: { supplierId: number | null; onClose: () => void; onSaved: (d: Driver) => void; initialName?: string }) {
  const [fullName, setFullName] = useState(initialName)
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

/** Müşterinin daha önce kullandığı adresler: tıklayınca adres, il ve yetkili dolar. */
function AddressChips({ items, current, onPick }: { items?: TripAddressHint[]; current?: string; onPick: (a: TripAddressHint) => void }) {
  if (!items?.length) return null
  const cur = (current ?? '').trim().toLocaleLowerCase('tr')
  return (
    <div className="-mt-1 flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-slate-500">Kayıtlı:</span>
      {items.slice(0, 4).map((a) => (
        <Chip key={`${a.address}|${a.city}`} active={a.address.trim().toLocaleLowerCase('tr') === cur} onClick={() => onPick(a)}
          title={`${a.count} seferde kullanıldı${a.contact ? ` · ${a.contact}` : ''}`}>
          {a.address}{a.city ? ` (${a.city})` : ''}
        </Chip>
      ))}
    </div>
  )
}
