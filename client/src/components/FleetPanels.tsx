import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { api as apiClient, del, download, errorMessage, get, openPdf, post, put } from '../api/client'
import type { DocumentOwnerType, DocumentType, DriverLedger, FleetDocument, MaintenanceRecord } from '../api/types'
import { useToast } from './Toast'
import { Badge, Button, ConfirmDialog, Empty, Field, IconButton, Modal, Spinner } from './ui'
import { FormSelect } from './FormSelect'
import { ControlledChoice, ControlledToggle } from './Choice'
import { AmountInput, DateQuick, SuggestChips } from './Inputs'
import { choices } from '../lib/choices'
import { maintenanceTypeIcon, paymentMethodIcon, settlementDirectionIcon } from '../lib/icons'
import { useAuth } from '../lib/auth'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { compressImage } from '../lib/image'
import { date, tl2, todayIso } from '../lib/format'
import { useLookup, useSave } from '../lib/hooks'
import {
  companyDocumentTypes, documentTypeLabel, driverDocumentTypes, maintenanceTypeLabel, paymentMethodLabel, settlementDirectionLabel, vehicleDocumentTypes,
} from '../lib/labels'

const optNum = z.number().nullable().or(z.nan().transform(() => null))

// ---------------- Belgeler ----------------

const docSchema = z.object({
  type: z.string().min(1),
  no: optStr,
  issueDate: optStr,
  expiryDate: optStr,
  note: optStr,
}).refine((v) => !v.issueDate || !v.expiryDate || v.expiryDate >= v.issueDate, { path: ['expiryDate'], message: 'Bitiş tarihi veriliş tarihinden önce olamaz.' })
type DocValues = z.infer<typeof docSchema>

function DaysLeft({ days }: { days?: number | null }) {
  if (days == null) return null
  if (days < 0) return <Badge tone="red">{-days} gün geçti</Badge>
  if (days <= 30) return <Badge tone="yellow">{days} gün kaldı</Badge>
  return null
}

/** Araç, şoför ya da firma belgeleri: numara, bitiş tarihi ve taranmış dosya. Bitişe 30 gün kala uyarı verilir. */
export function DocumentsPanel({ ownerType, ownerId }: { ownerType: DocumentOwnerType; ownerId?: number }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<FleetDocument | 'new' | null>(null)
  const [deleting, setDeleting] = useState<FleetDocument | null>(null)
  const docs = useQuery({ queryKey: ['documents', ownerType, ownerId], queryFn: () => get<FleetDocument[]>('/documents', { ownerType, ownerId }) })
  const remove = useSave((id: number) => del(`/documents/${id}`), { invalidate: ['documents'], success: 'Belge silindi.', onSuccess: () => setDeleting(null) })
  const edit = can('operations')

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Ruhsat, kasko, K belgesi, takograf gibi belgeler. Bitişe 30 gün kala uyarı çıkar.</p>
        {edit && <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Belge Ekle</Button>}
      </div>
      {docs.isLoading ? <Spinner /> : !docs.data?.length ? <Empty>Henüz belge yok.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Belge</th><th className="th">No</th><th className="th">Bitiş</th><th className="th">Dosya</th><th className="th" /></tr></thead>
            <tbody>
              {docs.data.map((d) => (
                <tr key={d.id}>
                  <td className="td font-medium">{documentTypeLabel[d.type]}{d.note && <span className="block text-sm font-normal text-slate-500">{d.note}</span>}</td>
                  <td className="td">{d.no ?? '—'}</td>
                  <td className="td">{date(d.expiryDate)} <DaysLeft days={d.daysLeft} /></td>
                  <td className="td">{d.hasFile
                    ? <button className="font-medium text-brand-700 underline" onClick={() => openPdf(`/documents/${d.id}/file`, `belge-${d.id}`).catch(() => undefined)}>Aç</button>
                    : <span className="text-slate-500">—</span>}</td>
                  <td className="td text-right">{edit && <div className="flex justify-end gap-1">
                    <IconButton label="Düzenle" onClick={() => setEditing(d)}><Pencil className="size-4" /></IconButton>
                    <IconButton label="Sil" onClick={() => setDeleting(d)}><Trash2 className="size-4" /></IconButton>
                  </div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <DocumentForm doc={editing === 'new' ? null : editing} ownerType={ownerType} ownerId={ownerId} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Belgeyi sil" confirmText="Sil" loading={remove.isPending}
        message={<>{deleting && documentTypeLabel[deleting.type]} belgesi silinecek. Emin misiniz?</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} />
    </div>
  )
}

function DocumentForm({ doc, ownerType, ownerId, onClose }: { doc: FleetDocument | null; ownerType: DocumentOwnerType; ownerId?: number; onClose: () => void }) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const types = ownerType === 'Vehicle' ? vehicleDocumentTypes : ownerType === 'Driver' ? driverDocumentTypes : companyDocumentTypes
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<DocValues>({
    resolver: zodResolver(docSchema),
    defaultValues: doc
      ? { type: doc.type, no: doc.no ?? '', issueDate: doc.issueDate ?? '', expiryDate: doc.expiryDate ?? '', note: doc.note ?? '' }
      : { type: types[0], no: '', issueDate: '', expiryDate: '', note: '' },
  })
  const save = useSave(async (v: DocValues) => {
    const body = { ...nullify(v), ownerType, ownerId: ownerId ?? null }
    const saved = doc ? await put<FleetDocument>(`/documents/${doc.id}`, body) : await post<FleetDocument>('/documents', body)
    if (file) {
      const form = new FormData()
      form.append('file', await compressImage(file))
      try { await apiClient.post(`/documents/${saved.id}/file`, form) } catch (e) { toast.error(`Belge kaydedildi ama dosya yüklenemedi: ${errorMessage(e)}`) }
    }
    return saved
  }, { invalidate: ['documents', 'vehicles', 'drivers'], success: doc ? 'Belge güncellendi.' : 'Belge eklendi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const issueDate = useWatch({ control, name: 'issueDate' })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={doc ? 'Belge Düzenle' : 'Belge Ekle'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field group label="Hangi belge?" required>
          <ControlledChoice control={control} name="type" label="Belge türü" variant="chips"
            options={(Object.keys(documentTypeLabel) as DocumentType[]).filter((t) => types.includes(t) || t === doc?.type)
              .map((t) => ({ value: t, label: documentTypeLabel[t] }))} />
        </Field>
        <Field label="Belge / poliçe no" error={errors.no?.message}><input className="input" {...register('no')} /></Field>
        <Field label="Veriliş tarihi" error={errors.issueDate?.message}><DateQuick control={control} name="issueDate" /></Field>
        <Field label="Bitiş tarihi" error={errors.expiryDate?.message} hint="Veriliş tarihinden itibaren (boşsa bugünden).">
          <DateQuick control={control} name="expiryDate" quick="expiry" from={issueDate || undefined} years={[1, 2, 5, 10]} />
        </Field>
        <Field label="Not" error={errors.note?.message}><input className="input" {...register('note')} /></Field>
        <Field label="Taranmış belge" hint={doc?.hasFile ? 'Dosya var; yeni dosya seçerseniz yerine geçer.' : 'Fotoğraf veya PDF (en fazla 10 MB).'}>
          <input className="input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

// ---------------- Bakım ----------------

const maintSchema = z.object({
  date: req('Tarih zorunlu.'),
  km: z.number().int('Tam sayı girin.').min(0).nullable().or(z.nan().transform(() => null)),
  type: z.enum(['Periodic', 'Oil', 'Tire', 'Brake', 'Breakdown', 'Other']),
  description: optStr,
  cost: z.number({ error: 'Tutar girin (yoksa 0).' }).min(0, 'Tutar negatif olamaz.'),
  supplierId: optNum,
  nextDueKm: z.number().int('Tam sayı girin.').min(0).nullable().or(z.nan().transform(() => null)),
  nextDueDate: optStr,
  isOnCredit: z.boolean(),
}).refine((v) => v.nextDueKm == null || v.km == null || v.nextDueKm > v.km, { path: ['nextDueKm'], message: 'Bakım kilometresinden büyük olmalı.' })
  .refine((v) => !v.isOnCredit || v.supplierId != null, { path: ['supplierId'], message: 'Vadeli bakım için servisi seçin.' })
type MaintValues = z.infer<typeof maintSchema>

/** Aracın bakım geçmişi. Kayıt tutarı "Bakım" gideri olarak da yazılır; araç kartındaki bakım bilgileri güncellenir. */
export function MaintenancePanel({ vehicleId, currentKm }: { vehicleId: number; currentKm: number }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<MaintenanceRecord | 'new' | null>(null)
  const [deleting, setDeleting] = useState<MaintenanceRecord | null>(null)
  const list = useQuery({ queryKey: ['maintenance', vehicleId], queryFn: () => get<MaintenanceRecord[]>(`/vehicles/${vehicleId}/maintenance`) })
  const remove = useSave((id: number) => del(`/vehicles/${vehicleId}/maintenance/${id}`),
    { invalidate: ['maintenance', 'expenses', 'vehicles', 'suppliers'], success: 'Bakım kaydı silindi.', onSuccess: () => setDeleting(null) })
  const edit = can('operations')
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Tutar girilirse “Bakım” gideri olarak da yazılır (çift sayılmaz).</p>
        {edit && <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Bakım Ekle</Button>}
      </div>
      {list.isLoading ? <Spinner /> : !list.data?.length ? <Empty>Henüz bakım kaydı yok.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Tarih</th><th className="th">Tür</th><th className="th text-right">Km</th><th className="th text-right">Tutar</th><th className="th">Sonraki</th><th className="th" /></tr></thead>
            <tbody>
              {list.data.map((m) => (
                <tr key={m.id}>
                  <td className="td">{date(m.date)}</td>
                  <td className="td"><span className="font-medium">{maintenanceTypeLabel[m.type]}</span>
                    {(m.description || m.supplierTitle) && <span className="block text-sm text-slate-500">{[m.description, m.supplierTitle].filter(Boolean).join(' · ')}</span>}</td>
                  <td className="td text-right">{m.km?.toLocaleString('tr-TR') ?? '—'}</td>
                  <td className="td text-right">{tl2(m.cost)}</td>
                  <td className="td">{[m.nextDueKm && `${m.nextDueKm.toLocaleString('tr-TR')} km`, m.nextDueDate && date(m.nextDueDate)].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="td text-right">{edit && <div className="flex justify-end gap-1">
                    <IconButton label="Düzenle" onClick={() => setEditing(m)}><Pencil className="size-4" /></IconButton>
                    <IconButton label="Sil" onClick={() => setDeleting(m)}><Trash2 className="size-4" /></IconButton>
                  </div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <MaintenanceForm vehicleId={vehicleId} currentKm={currentKm} record={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Bakım kaydını sil" confirmText="Sil" loading={remove.isPending}
        message="Bakım kaydı ve bağlı gider silinecek. Emin misiniz?" onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} />
    </div>
  )
}

function MaintenanceForm({ vehicleId, currentKm, record, onClose }: { vehicleId: number; currentKm: number; record: MaintenanceRecord | null; onClose: () => void }) {
  const suppliers = useLookup('suppliers')
  const { register, handleSubmit, control, setError, setValue, formState: { errors } } = useForm<MaintValues>({
    resolver: zodResolver(maintSchema),
    defaultValues: record
      ? { date: record.date, km: record.km ?? null, type: record.type, description: record.description ?? '', cost: record.cost, supplierId: record.supplierId ?? null,
        nextDueKm: record.nextDueKm ?? null, nextDueDate: record.nextDueDate ?? '', isOnCredit: false }
      : { date: todayIso(), km: currentKm || null, type: 'Periodic', description: '', cost: 0, supplierId: null, nextDueKm: null, nextDueDate: '', isOnCredit: false },
  })
  const km = useWatch({ control, name: 'km' })
  const maintDate = useWatch({ control, name: 'date' })
  const save = useSave((v: MaintValues) => record ? put(`/vehicles/${vehicleId}/maintenance/${record.id}`, nullify(v)) : post(`/vehicles/${vehicleId}/maintenance`, nullify(v)),
    { invalidate: ['maintenance', 'expenses', 'vehicles', 'suppliers'], success: 'Bakım kaydedildi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={record ? 'Bakım Düzenle' : 'Bakım Ekle'}
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field group className="sm:col-span-2" label="Ne yapıldı?" required>
          <ControlledChoice control={control} name="type" label="Bakım türü" columns={3} options={choices(maintenanceTypeLabel, maintenanceTypeIcon)} />
        </Field>
        <Field className="sm:col-span-2" label="Yapılan işlem" error={errors.description?.message}><input className="input" placeholder="Yağ, filtre, balata..." {...register('description')} /></Field>
        <Field label="Tarih" required error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
        <Field label="Araç kilometresi" error={errors.km?.message}><input className="input tabular-nums" type="number" min="0" inputMode="numeric" {...register('km', { valueAsNumber: true })} /></Field>
        <Field label="Tutar (TL)" error={errors.cost?.message}><AmountInput control={control} name="cost" /></Field>
        <Field label="Servis (tedarikçi)" error={errors.supplierId?.message}>
          <FormSelect control={control} name="supplierId" placeholder="— Seçilmedi —" options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.label }))} />
        </Field>
        <Field group className="sm:col-span-2" label="Ödendi mi?">
          <ControlledToggle control={control} name="isOnCredit" label="Ödeme durumu" labels={['Vadeli (servise borç yaz)', 'Ödendi']} />
        </Field>
        <Field label="Sonraki bakım km" error={errors.nextDueKm?.message} hint="Araç bu kilometreye 1.000 km kala uyarı çıkar.">
          <input className="input tabular-nums" type="number" min="0" inputMode="numeric" {...register('nextDueKm', { valueAsNumber: true })} />
          {km != null && !Number.isNaN(km) && (
            <SuggestChips values={[10000, 15000, 20000].map((d) => `+${d.toLocaleString('tr-TR')} km`)}
              onPick={(v) => setValue('nextDueKm', km + Number(v.replace(/\D/g, '')), { shouldValidate: true })} />
          )}
        </Field>
        <Field label="Sonraki bakım tarihi" error={errors.nextDueDate?.message}>
          <DateQuick control={control} name="nextDueDate" quick="due" from={maintDate} dueDays={[90, 180, 365]} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

// ---------------- Şoför hesabı ----------------

const settleSchema = z.object({
  direction: z.enum(['PaidToDriver', 'ReceivedFromDriver']),
  date: req('Tarih zorunlu.'),
  amount: z.number({ error: 'Tutar girin.' }).positive('Tutar sıfırdan büyük olmalı.'),
  method: z.enum(['Cash', 'BankTransfer', 'Check', 'CreditCard']),
  note: optStr,
})
type SettleValues = z.infer<typeof settleSchema>

/** Şoför hesabı: avanslar ve ödemeler ile şoförün cebinden yaptığı onaylı masraflar ve geri verdiği para; yürüyen bakiye. */
export function DriverLedgerPanel({ driverId }: { driverId: number }) {
  const { can } = useAuth()
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const ledger = useQuery({ queryKey: ['driver-ledger', driverId], queryFn: () => get<DriverLedger>(`/drivers/${driverId}/ledger`) })
  const remove = useSave((id: number) => del(`/driver-settlements/${id}`), { invalidate: ['driver-ledger'], success: 'Kayıt silindi.', onSuccess: () => setDeleting(null) })
  const l = ledger.data
  return (
    <div>
      {ledger.isLoading || !l ? <Spinner /> : <>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Verilen avans + ödeme" value={tl2(l.advances + l.paidToDriver)} />
          <Stat label="Onaylı masraf + iade" value={tl2(l.driverExpenses + l.receivedFromDriver)} />
          <Stat label={l.balance >= 0 ? 'Şoförde kalan (firmanın)' : 'Şoföre borcumuz'} value={tl2(Math.abs(l.balance))} strong tone={l.balance >= 0 ? 'text-navy-900' : 'text-red-600'} />
          <Stat label="Onay bekleyen masraf" value={tl2(l.pendingExpenses)} tone={l.pendingExpenses > 0 ? 'text-amber-600' : undefined} />
        </div>
        <div className="mb-2 flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={() => download(`/drivers/${driverId}/ledger/export`, undefined, 'sofor-hesabi.xlsx')}>Excel</Button>
          {can('accounting') && <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Ödeme / İade Gir</Button>}
        </div>
        {l.rows.length === 0 ? <Empty>Henüz hareket yok. Avanslar Giderler sayfasından “Şoför Avansı” olarak girilir.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Tarih</th><th className="th">İşlem</th><th className="th text-right">Verilen</th><th className="th text-right">Harcanan / İade</th><th className="th text-right">Bakiye</th><th className="th" /></tr></thead>
              <tbody>
                {l.rows.map((r, i) => (
                  <tr key={i} className={r.approvalStatus && r.approvalStatus !== 'Approved' ? 'text-slate-500' : ''}>
                    <td className="td">{date(r.date)}</td>
                    <td className="td">{r.kind}
                      {r.approvalStatus === 'Pending' && <span className="ml-1"><Badge tone="yellow">Onay bekliyor</Badge></span>}
                      {r.approvalStatus === 'Rejected' && <span className="ml-1"><Badge tone="red">Reddedildi</Badge></span>}
                      {r.description && <span className="block text-sm text-slate-500">{r.description}</span>}</td>
                    <td className="td text-right">{r.debit ? tl2(r.debit) : ''}</td>
                    <td className="td text-right">{r.credit ? tl2(r.credit) : ''}</td>
                    <td className="td text-right font-medium">{tl2(r.balance)}</td>
                    <td className="td text-right">{r.settlementId && can('accounting') &&
                      <IconButton label="Sil" onClick={() => setDeleting(r.settlementId!)}><Trash2 className="size-4" /></IconButton>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>}
      {adding && <SettlementForm driverId={driverId} onClose={() => setAdding(false)} />}
      <ConfirmDialog open={deleting != null} title="Kaydı sil" confirmText="Sil" loading={remove.isPending} message="Bu ödeme/iade kaydı silinecek. Emin misiniz?"
        onClose={() => setDeleting(null)} onConfirm={() => deleting != null && remove.mutate(deleting)} />
    </div>
  )
}

function Stat({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`${strong ? 'text-lg font-semibold' : 'font-medium'} ${tone ?? 'text-slate-800'}`}>{value}</div>
    </div>
  )
}

function SettlementForm({ driverId, onClose }: { driverId: number; onClose: () => void }) {
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<SettleValues>({
    resolver: zodResolver(settleSchema),
    defaultValues: { direction: 'ReceivedFromDriver', date: todayIso(), method: 'Cash', note: '' },
  })
  const save = useSave((v: SettleValues) => post('/driver-settlements', { ...nullify(v), driverId }),
    { invalidate: ['driver-ledger'], success: 'Kaydedildi.', onSuccess: onClose, onError: (e) => applyServerErrors(e, setError) })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title="Şoför Hesabı: Ödeme / İade" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="grid gap-4">
        <Field group label="Ne oldu?" hint="Avans için Giderler → “Şoför Avansı” kullanın; burası mahsuplaşma içindir.">
          <ControlledChoice control={control} name="direction" label="İşlem" columns={2} options={choices(settlementDirectionLabel, settlementDirectionIcon)} />
        </Field>
        <Field label="Tutar (TL)" required error={errors.amount?.message}><AmountInput control={control} name="amount" /></Field>
        <Field group label="Nasıl?">
          <ControlledChoice control={control} name="method" label="Ödeme yöntemi" variant="chips"
            options={choices(paymentMethodLabel, paymentMethodIcon).filter((o) => o.value !== 'PromissoryNote')} />
        </Field>
        <Field label="Tarih" required error={errors.date?.message}><DateQuick control={control} name="date" /></Field>
        <Field label="Not" error={errors.note?.message}><input className="input" {...register('note')} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

