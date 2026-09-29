import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Customer, CustomerSummary } from '../api/types'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { crud, useSave } from '../lib/hooks'
import { CityOptions } from './CityOptions'
import { Button, Field, Modal } from './ui'
import { ControlledToggle } from './Choice'
import { AmountInput, DateQuick, DaysInput, MoreFields, Section } from './Inputs'
import { eInvoiceIcons } from '../lib/icons'

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
})
type FormValues = z.infer<typeof schema>
const api = crud<CustomerSummary, FormValues>('customers')

export function CustomerForm({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved?: (c: CustomerSummary) => void }) {
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: customer?.title ?? '', taxNumber: customer?.taxNumber ?? '', taxOffice: customer?.taxOffice ?? '',
      phone: customer?.phone ?? '', email: customer?.email ?? '', address: customer?.address ?? '', notes: customer?.notes ?? '',
      openingBalance: customer?.openingBalance ?? 0, openingBalanceDate: customer?.openingBalanceDate ?? '',
      notifyStatusByEmail: customer?.notifyStatusByEmail ?? false,
      city: customer?.city ?? '', district: customer?.district ?? '', contactName: customer?.contactName ?? '',
      isEInvoiceUser: customer?.isEInvoiceUser ?? false, eInvoiceAlias: customer?.eInvoiceAlias ?? '',
      paymentTermDays: customer?.paymentTermDays ?? null, isActive: customer?.isActive ?? true, creditLimit: customer?.creditLimit ?? null,
    },
  })
  const save = useSave((v: FormValues) => customer ? api.update(customer.id, nullify(v)) : api.create(nullify(v)), {
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
            <Field label="İl" error={errors.city?.message}><select className="input" {...register('city')}><CityOptions /></select></Field>
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
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
