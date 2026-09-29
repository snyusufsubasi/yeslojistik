import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Customer, CustomerSummary, InvoiceNote, InvoiceTemplate } from '../api/types'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { crud, useSave } from '../lib/hooks'
import { CitySelect } from './CitySelect'
import { Button, Field, Modal } from './ui'
import { ControlledToggle } from './Choice'
import { AmountInput, DateQuick, DaysInput, MoreFields, Section } from './Inputs'
import { eInvoiceIcons } from '../lib/icons'
import { useQuery } from '@tanstack/react-query'
import { get } from '../api/client'
import { useState } from 'react'

const schema = z.object({
  title: req('Müşteri ünvanı zorunlu.'),
  taxNumber: z.string().trim().regex(/^(\d{10}|\d{11})?$/, 'VKN 10, TCKN 11 haneli olmalı.'),
  taxOffice: optStr,
  phone: optStr,
  email: z.string().trim().email('Geçerli bir e-posta girin.').or(z.literal('')),
  address: optStr,
  notes: optStr,
  openingBalance: z.number({ error: 'Tutar girin.' }).min(0, 'Negatif olamaz.').or(z.nan().transform(() => 0)),
  openingBalanceDate: optStr,
  notifyStatusByEmail: z.boolean(),
  city: optStr,
  district: optStr,
  contactName: optStr,
  isEInvoiceUser: z.boolean(),
  eInvoiceAlias: optStr,
  paymentTermDays: z.number().int().min(0, '0-365 gün').max(365, '0-365 gün').nullable().or(z.nan().transform(() => null)),
  creditLimit: z.number().min(0, 'Negatif olamaz.').nullable().or(z.nan().transform(() => null)),
  isActive: z.boolean(),
  extras: z.object({
    country: optStr, neighborhood: optStr, street: optStr, buildingName: optStr, buildingNo: optStr, doorNo: optStr,
    postalCode: optStr, fax: optStr, website: optStr,
  }),
  invoiceTemplate: z.object({
    lineDate: z.boolean(), lineLoading: z.boolean(), lineDelivery: z.boolean(), linePlate: z.boolean(), lineVehicleType: z.boolean(),
    lineDeliveryDocumentNo: z.boolean(), lineCargo: z.boolean(), lineDescription: z.boolean(), tripFooterNotes: z.boolean(),
    note: optStr, saleNoteId: z.number().nullable().optional(), withholdingNoteId: z.number().nullable().optional(),
    scenario: z.enum(['EArsiv', 'Temel', 'Ticari']).nullable().optional(),
  }),
})

const defaultTemplate: InvoiceTemplate = {
  lineDate: true, lineLoading: true, lineDelivery: true, linePlate: true, lineVehicleType: false, lineDeliveryDocumentNo: false,
  lineCargo: false, lineDescription: false, tripFooterNotes: true, note: '', saleNoteId: null, withholdingNoteId: null, scenario: null,
}

/** Fatura satırında yazılabilecek sefer bilgileri (eski paneldeki e-Fatura şablonu). */
const lineFields: { key: 'lineDate' | 'lineLoading' | 'lineDelivery' | 'linePlate' | 'lineVehicleType' | 'lineDeliveryDocumentNo' | 'lineCargo' | 'lineDescription'; label: string }[] = [
  { key: 'lineDate', label: 'Tarih' }, { key: 'lineLoading', label: 'Yükleme yeri' }, { key: 'lineDelivery', label: 'İndirme yeri' },
  { key: 'linePlate', label: 'Plaka' }, { key: 'lineVehicleType', label: 'Araç cinsi' }, { key: 'lineDeliveryDocumentNo', label: 'Teslim evrak no' },
  { key: 'lineCargo', label: 'Yük cinsi' }, { key: 'lineDescription', label: 'İş açıklaması' },
]
type FormValues = z.infer<typeof schema>
const api = crud<CustomerSummary, FormValues>('customers')

export function CustomerForm({ customer, onClose, onSaved, initialTitle }: { customer: Customer | null; onClose: () => void; onSaved?: (c: CustomerSummary) => void
  /** Seçim kutusunda yazılan ad: yeni müşterinin ünvanı olarak gelir. */
  initialTitle?: string }) {
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: customer?.title ?? initialTitle ?? '', taxNumber: customer?.taxNumber ?? '', taxOffice: customer?.taxOffice ?? '',
      phone: customer?.phone ?? '', email: customer?.email ?? '', address: customer?.address ?? '', notes: customer?.notes ?? '',
      openingBalance: customer?.openingBalance ?? 0, openingBalanceDate: customer?.openingBalanceDate ?? '',
      notifyStatusByEmail: customer?.notifyStatusByEmail ?? false,
      city: customer?.city ?? '', district: customer?.district ?? '', contactName: customer?.contactName ?? '',
      isEInvoiceUser: customer?.isEInvoiceUser ?? false, eInvoiceAlias: customer?.eInvoiceAlias ?? '',
      paymentTermDays: customer?.paymentTermDays ?? null, isActive: customer?.isActive ?? true, creditLimit: customer?.creditLimit ?? null,
      extras: Object.fromEntries(Object.entries(customer?.extras ?? {}).map(([k, v]) => [k, v ?? ''])),
      invoiceTemplate: { ...defaultTemplate, ...customer?.invoiceTemplate, note: customer?.invoiceTemplate?.note ?? '' },
    },
  })
  const [groups, setGroups] = useState<string[]>(customer?.groups ?? [])
  const [newGroup, setNewGroup] = useState('')
  const notes = useQuery({ queryKey: ['invoice-notes'], queryFn: () => get<InvoiceNote[]>('/invoice-notes'), staleTime: 60_000 })
  const addGroup = () => {
    const g = newGroup.trim()
    if (g && !groups.some((x) => x.toLocaleLowerCase('tr') === g.toLocaleLowerCase('tr'))) setGroups([...groups, g])
    setNewGroup('')
  }
  const toApi = (v: FormValues) => ({
    ...nullify(v), groups,
    extras: nullify(v.extras),
    invoiceTemplate: { ...v.invoiceTemplate, note: v.invoiceTemplate.note || null, scenario: v.invoiceTemplate.scenario || null },
  }) as unknown as FormValues
  const save = useSave((v: FormValues) => customer ? api.update(customer.id, toApi(v)) : api.create(toApi(v)), {
    invalidate: ['customers'], success: customer ? 'Müşteri güncellendi.' : 'Müşteri eklendi.',
    onSuccess: (c) => { onSaved?.(c); onClose() },
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  const isEInvoice = useWatch({ control, name: 'isEInvoiceUser' })
  const more = !!(errors.taxOffice || errors.email || errors.city || errors.district || errors.address || errors.contactName
    || errors.creditLimit || errors.openingBalance || errors.openingBalanceDate || errors.notes)
  return (
    <Modal open onClose={onClose} title={customer ? customer.title : 'Yeni Müşteri'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="space-y-6">
        <Section n={1} title="Kim?">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Ünvan" required error={errors.title?.message}><input className="input" placeholder="Yıldız Mobilya" {...register('title')} /></Field>
            <Field label="VKN / TCKN" error={errors.taxNumber?.message} hint="Şirketse 10 haneli VKN, şahıssa 11 haneli TCKN."><input className="input" inputMode="numeric" maxLength={11} {...register('taxNumber')} /></Field>
            <Field label="Telefon" error={errors.phone?.message}><input className="input" type="tel" placeholder="0216 555 44 33" {...register('phone')} /></Field>
          </div>
        </Section>
        <Section n={2} title="Fatura ve ödeme">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field group className="sm:col-span-2" label="Fatura nasıl kesilir?" hint="e-Fatura mükellefi değilse fatura e-Arşiv olarak kesilir.">
              <ControlledToggle control={control} name="isEInvoiceUser" label="Fatura türü" variant="cards" icons={eInvoiceIcons}
                labels={['e-Fatura mükellefi', 'e-Arşiv (mükellef değil)']} />
            </Field>
            {isEInvoice && (
              <Field className="sm:col-span-2" label="PK etiketi" error={errors.eInvoiceAlias?.message} hint="Bilmiyorsanız boş bırakın; muhasebe programınız bulur.">
                <input className="input" placeholder="urn:mail:defaultpk@firma.com" {...register('eInvoiceAlias')} />
              </Field>
            )}
            <Field className="sm:col-span-2" label="Vade" error={errors.paymentTermDays?.message} hint="Fatura kaç gün sonra ödenir? Boşsa firma ayarındaki vade kullanılır.">
              <DaysInput control={control} name="paymentTermDays" emptyLabel="Firma varsayılanı" />
            </Field>
          </div>
        </Section>
        <MoreFields title="Adres, yetkili, risk limiti, devir ve bildirimler (isteğe bağlı)" defaultOpen={!!customer} hasError={more}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vergi Dairesi" error={errors.taxOffice?.message}><input className="input" {...register('taxOffice')} /></Field>
            <Field label="E-posta" error={errors.email?.message}><input className="input" type="email" {...register('email')} /></Field>
            <Field label="İl" error={errors.city?.message}><CitySelect control={control} name="city" /></Field>
            <Field label="İlçe" error={errors.district?.message}><input className="input" placeholder="Sultanbeyli" {...register('district')} /></Field>
            <Field className="sm:col-span-2" label="Adres" error={errors.address?.message}><input className="input" placeholder="Mahalle, cadde, no" {...register('address')} /></Field>
            <Field className="sm:col-span-2" label="Yetkili Kişi" error={errors.contactName?.message}><input className="input" {...register('contactName')} /></Field>
            <Field className="sm:col-span-2" label="Risk limiti (TL)" error={errors.creditLimit?.message} hint="Açık bakiye + faturalanmamış seferler bu tutarı aşınca uyarı verilir. Boş: limit yok.">
              <AmountInput control={control} name="creditLimit" placeholder="Limit yok" />
            </Field>
            <Field label="Devir Bakiyesi (TL)" error={errors.openingBalance?.message} hint="Eski sistemden devreden borç. Cari bakiyeye eklenir.">
              <AmountInput control={control} name="openingBalance" words={false} />
            </Field>
            <Field label="Devir Tarihi" error={errors.openingBalanceDate?.message}><DateQuick control={control} name="openingBalanceDate" quick="none" /></Field>
            <Field className="sm:col-span-2" label="Notlar" error={errors.notes?.message}><textarea className="input min-h-16" {...register('notes')} /></Field>
            <Field group className="sm:col-span-2" label="Sefer durumu e-postası"
              hint="Yüklendi, yola çıktı ve teslim edildi anlarında e-posta adresine takip linkiyle bilgi gider. Fiyat gönderilmez. (Sunucuda e-posta ayarı gerekir.)">
              <ControlledToggle control={control} name="notifyStatusByEmail" label="Sefer durumu e-postası" labels={['Gönder', 'Gönderme']} />
            </Field>
            <Field group className="sm:col-span-2" label="Durum" hint="Pasif müşteriler yeni seferde listelenmez.">
              <ControlledToggle control={control} name="isActive" label="Müşteri durumu" labels={['Aktif', 'Pasif']} />
            </Field>
          </div>
        </MoreFields>
        <div>
          <MoreFields title="Adres ayrıntıları (e-Fatura), faks, web">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ülke"><input className="input" placeholder="Türkiye" {...register('extras.country')} /></Field>
              <Field label="Mahalle"><input className="input" {...register('extras.neighborhood')} /></Field>
              <Field label="Cadde / Sokak"><input className="input" {...register('extras.street')} /></Field>
              <Field label="Bina Adı"><input className="input" {...register('extras.buildingName')} /></Field>
              <Field label="Bina No"><input className="input" {...register('extras.buildingNo')} /></Field>
              <Field label="Kapı No"><input className="input" {...register('extras.doorNo')} /></Field>
              <Field label="Posta Kodu"><input className="input" inputMode="numeric" {...register('extras.postalCode')} /></Field>
              <Field label="Faks"><input className="input" type="tel" {...register('extras.fax')} /></Field>
              <Field className="sm:col-span-2" label="Web Sitesi"><input className="input" placeholder="www.firma.com" {...register('extras.website')} /></Field>
            </div>
          </MoreFields>
        </div>
        <div>
          <MoreFields title={`Firma grupları / şantiyeler${groups.length ? ` (${groups.length})` : ''}`}>
            <p className="text-sm text-slate-600">Seferde seçilir; listede ve ekstrede gruba göre süzülür.</p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <span key={g} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white py-1 pl-3 pr-1 text-sm">
                  {g}
                  <button type="button" aria-label={`${g} grubunu çıkar`} className="rounded-full px-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setGroups(groups.filter((x) => x !== g))}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input" placeholder="Yeni grup adı" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGroup() } }} />
              <Button type="button" variant="secondary" onClick={addGroup}>Ekle</Button>
            </div>
          </MoreFields>
        </div>
        <div>
          <MoreFields title="Fatura şablonu">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-800">Fatura satırında yazılacaklar</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {lineFields.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" {...register(`invoiceTemplate.${f.key}`)} />{f.label}</label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" {...register('invoiceTemplate.tripFooterNotes')} />Seferlerdeki fatura altı notlarını faturaya ekle</label>
            <Field label="Her faturaya eklenecek açıklama"><textarea className="input min-h-14" {...register('invoiceTemplate.note')} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Satış faturası notu">
                <select className="input" {...register('invoiceTemplate.saleNoteId', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}>
                  <option value="">Seç</option>
                  {(notes.data ?? []).filter((n) => n.kind === 'Sale').map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
              </Field>
              <Field label="Tevkifatlı fatura notu">
                <select className="input" {...register('invoiceTemplate.withholdingNoteId', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}>
                  <option value="">Seç</option>
                  {(notes.data ?? []).filter((n) => n.kind === 'Withholding').map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
              </Field>
              <Field label="Fatura senaryosu">
                <select className="input" {...register('invoiceTemplate.scenario', { setValueAs: (v) => (v === '' ? null : v) })}>
                  <option value="">Firma varsayılanı</option>
                  <option value="Temel">Temel fatura</option>
                  <option value="Ticari">Ticari fatura</option>
                </select>
              </Field>
            </div>
            {notes.data?.length === 0 && <p className="text-sm text-slate-500">Hazır fatura notlarını Ayarlar → Fatura Notları’ndan ekleyebilirsiniz.</p>}
          </MoreFields>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
