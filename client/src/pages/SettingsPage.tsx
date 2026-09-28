import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Building2, KeyRound, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { get, post, put } from '../api/client'
import type { CompanySettings, User, UserRole } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal, PageHeader, Spinner, Tabs } from '../components/ui'
import { useAuth } from '../lib/auth'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { date } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { roleLabel, withholdingOptions } from '../lib/labels'

type Tab = 'company' | 'users' | 'password'

export default function SettingsPage() {
  const { can } = useAuth()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? (can('admin') ? 'company' : 'password'))
  const tabs = [
    ...(can('admin') ? [{ value: 'company' as const, label: 'Firma Bilgileri' }, { value: 'users' as const, label: 'Kullanıcılar' }] : []),
    { value: 'password' as const, label: 'Şifre Değiştir' },
  ]
  return (
    <>
      <PageHeader title="Ayarlar" />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={tabs} /></div>
      {tab === 'company' && can('admin') && <CompanyForm />}
      {tab === 'users' && can('admin') && <UsersTab />}
      {tab === 'password' && <PasswordForm />}
    </>
  )
}

const companySchema = z.object({
  companyName: req('Firma adı zorunlu.'),
  slogan: optStr,
  taxNumber: z.string().trim().regex(/^(\d{10}|\d{11})?$/, 'VKN 10, TCKN 11 haneli olmalı.'),
  taxOffice: optStr,
  address: optStr,
  phone: optStr,
  email: z.string().trim().email('Geçerli bir e-posta girin.').or(z.literal('')),
  iban: optStr,
  logoDataUrl: z.string().nullable().optional(),
  invoicePrefix: z.string().trim().regex(/^[A-Z]{1,5}$/, '1-5 büyük harf olmalı.'),
  nextInvoiceNumber: z.number({ error: 'Sayı girin.' }).int().positive(),
  defaultVatRate: z.number({ error: 'Sayı girin.' }).min(0).max(100),
  defaultWithholdingTenths: z.number().int().min(0).max(10),
  defaultPaymentTermDays: z.number({ error: 'Sayı girin.' }).int().min(0).max(365),
})
type CompanyValues = z.infer<typeof companySchema>

function CompanyForm() {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => get<CompanySettings>('/settings') })
  if (!data) return <Spinner />
  return <CompanyFormInner settings={data} />
}

function CompanyFormInner({ settings }: { settings: CompanySettings }) {
  const toast = useToast()
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, v ?? ''])) as CompanyValues,
  })
  const logo = useWatch({ control, name: 'logoDataUrl' })
  const save = useSave((v: CompanyValues) => put<CompanySettings>('/settings', nullify(v)), {
    invalidate: ['settings'], success: 'Firma bilgileri kaydedildi.', onError: (e) => applyServerErrors(e, setError),
  })
  const onLogo = (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 500_000) {
      toast.error('Logo 500 KB\'dan küçük PNG veya JPEG olmalı.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setValue('logoDataUrl', String(reader.result), { shouldDirty: true })
    reader.readAsDataURL(file)
  }
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
      <Card title="Firma" icon={<Building2 className="size-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Firma Adı" required error={errors.companyName?.message}><input className="input" {...register('companyName')} /></Field>
          <Field className="sm:col-span-2" label="Slogan"><input className="input" {...register('slogan')} /></Field>
          <Field label="VKN" error={errors.taxNumber?.message}><input className="input" {...register('taxNumber')} /></Field>
          <Field label="Vergi Dairesi"><input className="input" {...register('taxOffice')} /></Field>
          <Field label="Telefon" error={errors.phone?.message}><input className="input" {...register('phone')} /></Field>
          <Field label="E-posta" error={errors.email?.message}><input className="input" {...register('email')} /></Field>
          <Field className="sm:col-span-2" label="Adres"><input className="input" {...register('address')} /></Field>
          <Field className="sm:col-span-2" label="IBAN" hint="Fatura PDF'inde gösterilir."><input className="input" {...register('iban')} /></Field>
          <div className="sm:col-span-2">
            <span className="label">Logo (fatura PDF'i için)</span>
            <div className="flex items-center gap-3">
              {logo ? <img src={logo} alt="Logo" className="h-12 max-w-40 rounded border border-slate-200 object-contain p-1" /> : <span className="text-sm text-slate-400">Logo yok</span>}
              <input type="file" accept="image/png,image/jpeg" className="text-sm" onChange={(e) => onLogo(e.target.files?.[0])} />
              {logo && <Button type="button" size="sm" variant="ghost" onClick={() => setValue('logoDataUrl', null)}>Kaldır</Button>}
            </div>
            {errors.logoDataUrl && <span className="text-xs text-red-600">{errors.logoDataUrl.message}</span>}
          </div>
        </div>
      </Card>
      <Card title="Fatura Ayarları" className="h-fit">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fatura Ön Eki" error={errors.invoicePrefix?.message}><input className="input uppercase" {...register('invoicePrefix', { setValueAs: (v: string) => v.toUpperCase() })} /></Field>
          <Field label="Sıradaki Fatura No" error={errors.nextInvoiceNumber?.message}><input className="input" type="number" {...register('nextInvoiceNumber', { valueAsNumber: true })} /></Field>
          <Field label="Varsayılan KDV (%)" error={errors.defaultVatRate?.message}><input className="input" type="number" step="0.01" {...register('defaultVatRate', { valueAsNumber: true })} /></Field>
          <Field label="Varsayılan Tevkifat">
            <select className="input" {...register('defaultWithholdingTenths', { valueAsNumber: true })}>
              {withholdingOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Varsayılan Vade (gün)" error={errors.defaultPaymentTermDays?.message}><input className="input" type="number" {...register('defaultPaymentTermDays', { valueAsNumber: true })} /></Field>
        </div>
        <div className="mt-4 flex justify-end"><Button type="submit" loading={save.isPending}>Kaydet</Button></div>
      </Card>
    </form>
  )
}

const userSchema = z.object({
  fullName: req('Ad soyad zorunlu.'),
  email: z.string().trim().email('Geçerli bir e-posta girin.'),
  role: z.enum(['Admin', 'Operations', 'Accounting', 'Driver']),
  driverId: z.number().nullable().or(z.nan().transform(() => null)),
  isActive: z.boolean(),
  password: z.string(),
})
type UserValues = z.infer<typeof userSchema>
const usersApi = crud<User, UserValues>('users')
const strong = (p: string) => p.length >= 8 && /\p{L}/u.test(p) && /\d/.test(p)

function UsersTab() {
  const { user: me } = useAuth()
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => get<User[]>('/users') })
  const del = useSave((id: number) => usersApi.remove(id), { invalidate: ['users'], success: 'Kullanıcı silindi.', onSuccess: () => setDeleting(null) })
  const cols: Column<User>[] = [
    { key: 'n', header: 'Ad Soyad', render: (u) => <span className="font-medium">{u.fullName}</span> },
    { key: 'e', header: 'E-posta', render: (u) => u.email },
    { key: 'r', header: 'Rol', render: (u) => <><Badge tone={u.role === 'Admin' ? 'purple' : u.role === 'Driver' ? 'teal' : 'blue'}>{roleLabel[u.role]}</Badge>{u.driverName && <span className="ml-1 text-xs text-slate-500">{u.driverName}</span>}</> },
    { key: 'a', header: 'Durum', render: (u) => <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Aktif' : 'Pasif'}</Badge> },
    { key: 'c', header: 'Oluşturma', render: (u) => date(u.createdAt) },
    {
      key: 'x', header: '', align: 'right', render: (u) => (
        <div className="flex justify-end gap-1">
          <IconButton label="Düzenle" onClick={() => setEditing(u)}><Pencil className="size-4" /></IconButton>
          <IconButton label="Sil" disabled={u.id === me?.id} onClick={() => setDeleting(u)}><Trash2 className="size-4" /></IconButton>
        </div>
      ),
    },
  ]
  return (
    <Card title="Kullanıcılar" icon={<Users className="size-4" />} bodyClassName="p-0"
      actions={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>Yeni Kullanıcı</Button>}>
      <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(u) => u.id} />
      <div className="border-t border-slate-100 p-3 text-xs text-slate-500">
        <b>Yönetici:</b> her şey · <b>Operasyon:</b> sefer, araç, şoför · <b>Muhasebe:</b> fatura, tahsilat, raporlar. Herkes kayıtları görüntüleyebilir, müşteri ve gider ekleyebilir.
        <b> Şoför (mobil):</b> yalnızca mobil uygulamadan kendi seferlerini görür, durum ve fotoğraf gönderir.
      </div>
      {editing && <UserForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Kullanıcıyı sil" loading={del.isPending} confirmText="Sil"
        message={<>{deleting?.fullName} silinecek ve oturumları kapatılacak.</>}
        onClose={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} />
    </Card>
  )
}

function UserForm({ user, onClose }: { user: User | null; onClose: () => void }) {
  const schema = userSchema.refine((v) => (user && !v.password) || strong(v.password),
    { path: ['password'], message: 'Şifre en az 8 karakter olmalı ve harf ile rakam içermeli.' })
    .refine((v) => v.role !== 'Driver' || !!v.driverId, { path: ['driverId'], message: 'Şoför seçin.' })
  const drivers = useLookup('drivers')
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<UserValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user?.fullName ?? '', email: user?.email ?? '', role: user?.role ?? 'Operations', isActive: user?.isActive ?? true, password: '', driverId: user?.driverId ?? null },
  })
  const role = useWatch({ control, name: 'role' })
  const save = useSave((v: UserValues) => {
    const body = { ...v, driverId: v.role === 'Driver' ? v.driverId : null }
    return user ? usersApi.update(user.id, body) : usersApi.create(body)
  }, {
    invalidate: ['users'], success: user ? 'Kullanıcı güncellendi.' : 'Kullanıcı eklendi.', onSuccess: onClose,
    onError: (e) => applyServerErrors(e, setError),
  })
  const submit = handleSubmit((v) => save.mutate(v))
  return (
    <Modal open onClose={onClose} title={user ? user.fullName : 'Yeni Kullanıcı'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Vazgeç</Button><Button loading={save.isPending} onClick={submit}>Kaydet</Button></>}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Ad Soyad" required error={errors.fullName?.message}><input className="input" {...register('fullName')} /></Field>
        <Field label="E-posta" required error={errors.email?.message}><input className="input" type="email" {...register('email')} /></Field>
        <Field label="Rol" error={errors.role?.message}>
          <select className="input" {...register('role')}>
            {(Object.keys(roleLabel) as UserRole[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </select>
        </Field>
        {role === 'Driver' && (
          <Field label="Bağlı Şoför" required error={errors.driverId?.message} hint="Şoför bu hesapla mobil uygulamaya girer ve yalnızca kendi seferlerini görür.">
            <select className="input" {...register('driverId', { valueAsNumber: true })}>
              <option value="">Seçiniz</option>
              {drivers.data?.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Field>
        )}
        <Field label={user ? 'Yeni Şifre (değiştirmek için)' : 'Şifre'} required={!user} error={errors.password?.message}>
          <input className="input" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('isActive')} /> Aktif</label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

function PasswordForm() {
  const toast = useToast()
  const schema = z.object({
    currentPassword: req('Mevcut şifre zorunlu.'),
    newPassword: z.string().refine(strong, 'Şifre en az 8 karakter olmalı ve harf ile rakam içermeli.'),
    confirm: z.string(),
  }).refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Şifreler eşleşmiyor.' })
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  const submit = handleSubmit(async (v) => {
    try {
      await post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword })
      toast.success('Şifreniz değiştirildi.')
      reset({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (e) {
      if (!applyServerErrors(e, setError)) setError('currentPassword', { message: 'Mevcut şifre hatalı.' })
    }
  })
  return (
    <Card title="Şifre Değiştir" icon={<KeyRound className="size-4" />} className="max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Mevcut Şifre" error={errors.currentPassword?.message}><input className="input" type="password" autoComplete="current-password" {...register('currentPassword')} /></Field>
        <Field label="Yeni Şifre" error={errors.newPassword?.message}><input className="input" type="password" autoComplete="new-password" {...register('newPassword')} /></Field>
        <Field label="Yeni Şifre (tekrar)" error={errors.confirm?.message}><input className="input" type="password" autoComplete="new-password" {...register('confirm')} /></Field>
        <Button type="submit" loading={isSubmitting}>Şifreyi Değiştir</Button>
      </form>
    </Card>
  )
}
