import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Bell, Building2, CheckCircle2, Circle, DatabaseZap, Download, HardDrive, History, KeyRound, Pencil, Plus, Trash2, Upload, Users } from 'lucide-react'
import { errorMessage, get, post, put } from '../api/client'
import type { CompanySettings, Dashboard, DataStats, User, UserRole } from '../api/types'
import { DataTable, type Column } from '../components/DataTable'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Modal, PageHeader, Spinner, Tabs } from '../components/ui'
import { useAuth } from '../lib/auth'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { FormSelect } from '../components/FormSelect'
import { CityOptions } from '../components/CityOptions'
import { AuditLogTable } from '../components/AuditLog'
import { date, dateTime, fileSize, tl2 } from '../lib/format'
import { crud, useLookup, useSave } from '../lib/hooks'
import { roleLabel, withholdingOptions } from '../lib/labels'

type Tab = 'company' | 'users' | 'audit' | 'data' | 'password'

export default function SettingsPage() {
  const { can } = useAuth()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? (can('admin') ? 'company' : 'password'))
  const tabs = [
    ...(can('admin') ? [{ value: 'company' as const, label: 'Firma Bilgileri' }, { value: 'users' as const, label: 'Kullanıcılar' },
      { value: 'audit' as const, label: 'İşlem Geçmişi' }, { value: 'data' as const, label: 'Veriler' }] : []),
    { value: 'password' as const, label: 'Şifre Değiştir' },
  ]
  return (
    <>
      <PageHeader title="Ayarlar" />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={tabs} /></div>
      {tab === 'company' && can('admin') && <CompanyForm />}
      {tab === 'users' && can('admin') && <UsersTab />}
      {tab === 'audit' && can('admin') && (
        <Card title="İşlem Geçmişi" icon={<History className="size-4" />} bodyClassName="p-0">
          <p className="px-4 pt-3 text-sm text-slate-600">Kim, ne zaman, hangi kaydı oluşturdu, değiştirdi ya da sildi. Kayıtlar 2 yıl saklanır.</p>
          <AuditLogTable />
        </Card>
      )}
      {tab === 'data' && can('admin') && (
        <div className="flex flex-col gap-4">
          <GoLiveCard />
          <BackupCard />
          <ResetDataCard />
        </div>
      )}
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
  dailyDigestEnabled: z.boolean(),
  city: optStr,
  district: optStr,
  mersisNo: z.string().trim().regex(/^(\d{16})?$/, 'MERSİS no 16 hane olmalı.'),
  tradeRegistryNo: optStr,
  website: optStr,
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
          <Field label="İl" error={errors.city?.message}><select className="input" {...register('city')}><CityOptions /></select></Field>
          <Field label="İlçe" error={errors.district?.message}><input className="input" {...register('district')} /></Field>
          <Field className="sm:col-span-2" label="Adres"><input className="input" {...register('address')} /></Field>
          <Field label="MERSİS No" error={errors.mersisNo?.message} hint="e-Fatura için"><input className="input" inputMode="numeric" maxLength={16} {...register('mersisNo')} /></Field>
          <Field label="Ticaret Sicil No" error={errors.tradeRegistryNo?.message}><input className="input" {...register('tradeRegistryNo')} /></Field>
          <Field className="sm:col-span-2" label="Web Sitesi" error={errors.website?.message}><input className="input" placeholder="www.yeslojistik.com" {...register('website')} /></Field>
          <Field className="sm:col-span-2" label="IBAN" hint="Fatura PDF'inde gösterilir."><input className="input" {...register('iban')} /></Field>
          <div className="sm:col-span-2">
            <span className="label">Logo (fatura PDF'i için)</span>
            <div className="flex items-center gap-3">
              {logo ? <img src={logo} alt="Logo" className="h-12 max-w-40 rounded border border-slate-200 object-contain p-1" /> : <span className="text-sm text-slate-500">Logo yok</span>}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <Upload className="size-3.5" /> {logo ? 'Logoyu Değiştir' : 'Logo Seç'}
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
              </label>
              {logo && <Button type="button" size="sm" variant="ghost" onClick={() => setValue('logoDataUrl', null)}>Kaldır</Button>}
            </div>
            {errors.logoDataUrl && <span className="text-[13px] text-red-600">{errors.logoDataUrl.message}</span>}
          </div>
        </div>
      </Card>
      <div className="flex flex-col gap-4">
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
        </Card>
        <Card title="Bildirimler" icon={<Bell className="size-4" />} className="h-fit">
          {!settings.emailEnabled && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Sunucuda e-posta (SMTP) ayarı yapılmamış; e-posta bildirimleri gönderilmez. Kurulum kılavuzundaki SMTP adımına bakın.
            </p>
          )}
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 size-4 accent-brand-600" {...register('dailyDigestEnabled')} />
            <span>
              <span className="block text-[15px] font-medium text-slate-800">Sabah uyarı özeti</span>
              <span className="block text-sm text-slate-600">Her sabah 08:00'de yöneticilere yaklaşan bakım, muayene, sigorta, şoför belgeleri ve vadesi geçen alacakların listesi e-postayla gelir. Uyarı yoksa e-posta gönderilmez.</span>
            </span>
          </label>
          <p className="mt-3 text-sm text-slate-600">Müşterilere sefer durumu e-postası, her müşterinin kartından ayrı ayrı açılır.</p>
          <div className="mt-4 flex justify-end"><Button type="submit" loading={save.isPending}>Kaydet</Button></div>
        </Card>
      </div>
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
    { key: 'r', header: 'Rol', render: (u) => <><Badge tone={u.role === 'Admin' ? 'purple' : u.role === 'Driver' ? 'teal' : 'blue'}>{roleLabel[u.role]}</Badge>{u.driverName && <span className="ml-1 text-[13px] text-slate-500">{u.driverName}</span>}</> },
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
      <div className="border-t border-slate-100 p-3 text-[13px] text-slate-500">
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
            <FormSelect control={control} name="driverId" options={(drivers.data ?? []).map((d) => ({ value: d.id, label: d.label }))} />
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

function ResetDataCard() {
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const ok = ['SİL', 'SIL'].includes(confirm.trim().toLocaleUpperCase('tr-TR'))

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      await post('/settings/reset-data', { confirm })
      try { localStorage.removeItem('yl.setupHidden') } catch { /* tarayıcı depolaması kapalı olabilir */ }
      await qc.invalidateQueries()
      toast.success('Demo veriler silindi. Artık gerçek verilerinizi girebilirsiniz.')
      navigate('/')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Demo verilerini temizle (canlıya geçiş)" icon={<DatabaseZap className="size-4" />} className="max-w-2xl">
      <div className="space-y-4 text-[15px] text-slate-700">
        <p>Programı denemek için girilen bütün kayıtları siler ve sistemi gerçek kullanıma hazırlar. Bu işlem geri alınamaz.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="mb-1 font-semibold text-red-800">Silinecekler</div>
            <ul className="list-inside list-disc space-y-0.5 text-red-900">
              <li>Müşteriler, araçlar, şoförler</li>
              <li>Seferler ve sefer dosyaları</li>
              <li>Faturalar, tahsilatlar, giderler</li>
              <li>Konum geçmişi ve şoför hesapları</li>
            </ul>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-1 font-semibold text-emerald-800">Kalacaklar</div>
            <ul className="list-inside list-disc space-y-0.5 text-emerald-900">
              <li>Firma bilgileri ve logo</li>
              <li>Yönetici, operasyon ve muhasebe hesapları</li>
              <li>KDV / tevkifat ayarları</li>
            </ul>
            <p className="mt-2 text-sm text-emerald-900">Fatura ve müşteri numaraları 1'den başlar.</p>
          </div>
        </div>
        <label className="block max-w-xs">
          <span className="label">Onaylamak için kutuya <b>SİL</b> yazın</span>
          <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </label>
        {error && <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Button variant="danger" disabled={!ok} loading={busy} onClick={run}>Tüm demo verilerini sil</Button>
      </div>
    </Card>
  )
}

/** Ücretsiz Render veritabanı 1 GB; %80'de uyarılır. */
const DB_LIMIT_BYTES = 1024 * 1024 * 1024

function BackupCard() {
  const { data } = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => get<DataStats>('/admin/stats') })
  const used = data ? Math.min(100, Math.round((data.databaseBytes / DB_LIMIT_BYTES) * 100)) : 0
  return (
    <Card title="Yedekler ve depolama" icon={<HardDrive className="size-4" />} className="max-w-2xl">
      <div className="space-y-4 text-[15px] text-slate-700">
        <p>Yedek dosyası tüm kayıtları ve yüklenen dosyaları (fotoğraf, irsaliye) içerir. Haftada bir indirip telefonunuza
          veya bilgisayarınıza kaydetmeniz önerilir. Her gece ayrıca otomatik yedek alınır.</p>
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-[15px] font-medium transition shadow-sm bg-brand-600 text-white hover:bg-brand-700" href="/api/admin/backup?files=true" download><Download className="size-4" />Tam yedeği indir</a>
          <a className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-[15px] font-medium transition shadow-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" href="/api/admin/backup?files=false" download><Download className="size-4" />Dosyasız yedeği indir</a>
        </div>
        <div className="text-sm text-slate-600">Son yedek: {data?.lastBackupAt ? dateTime(data.lastBackupAt) : 'henüz alınmadı'}</div>
        {data && (
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Veritabanı: {fileSize(data.databaseBytes)} / 1 GB</span>
              <span>{data.fileCount} dosya · {fileSize(data.fileBytes)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100}
              aria-label="Veritabanı doluluğu">
              <div className={used >= 80 ? 'h-full bg-red-500' : 'h-full bg-brand-600'} style={{ width: `${Math.max(used, 1)}%` }} />
            </div>
            {used >= 80 && <p role="alert" className="mt-2 text-sm text-red-700">Ücretsiz veritabanı alanı dolmak üzere. Yedek indirin ve sunucuya geçişi planlayın.</p>}
          </div>
        )}
      </div>
    </Card>
  )
}

/** Demo verilerden gerçek kullanıma geçiş adımları; çoğu kendiliğinden işaretlenir. */
function GoLiveCard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard') })
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => get<CompanySettings>('/settings') })
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('yl.golive') ?? '{}') } catch { return {} }
  })
  if (!data || !settings.data) return null
  const s = data.setup
  const toggle = (k: string) => {
    const next = { ...checked, [k]: !checked[k] }
    setChecked(next)
    try { localStorage.setItem('yl.golive', JSON.stringify(next)) } catch { /* depolama kapalı olabilir */ }
  }
  const steps: { key: string; done: boolean; title: string; text: React.ReactNode; manual?: boolean }[] = [
    { key: 'demo', done: s.sampleDataCleared || !s.sampleData, title: 'Demo verilerini temizleyin', text: 'Aşağıdaki “Demo verilerini temizle” kartından.' },
    { key: 'company', done: s.companyInfo && s.companyDetails, title: 'Firma bilgileri, logo, il ve IBAN', text: <Link className="text-brand-600" to="/ayarlar?tab=company">Firma Bilgileri sekmesi</Link> },
    { key: 'users', done: s.userCount > 1, title: 'Kullanıcı hesapları', text: <Link className="text-brand-600" to="/ayarlar?tab=users">Ofis ve şoför hesaplarını açın</Link> },
    { key: 'import', done: s.customerCount > 0 && s.vehicleCount > 0 && s.driverCount > 0,
      title: 'Excel aktarımları', text: `Sırayla: tedarikçiler (${s.supplierCount}) → müşteriler (${s.customerCount}) → şoförler (${s.driverCount}) → araçlar (${s.vehicleCount}) → seferler (${s.tripCount})` },
    { key: 'opening', done: !!checked.opening, manual: true, title: 'Devir bakiyelerini kontrol edin',
      text: <>Müşteri alacakları toplamı <b>{tl2(s.customerOpeningTotal)}</b>, taşeron borçları toplamı <b>{tl2(s.supplierOpeningTotal)}</b>. Eski defterinizle aynı mı?</> },
    { key: 'invoice', done: !!checked.invoice, manual: true, title: 'Fatura numarası devam ediyor mu?',
      text: <>Sıradaki fatura: <b>{settings.data.invoicePrefix}-{String(settings.data.nextInvoiceNumber).padStart(6, '0')}</b>. Eski numaralarınızın devamı değilse Firma Bilgileri'nden düzeltin.</> },
    { key: 'backup', done: !!s.lastBackupAt, title: 'İlk tam yedeği indirin', text: 'Aşağıdaki “Tam yedeği indir” düğmesiyle.' },
  ]
  const done = steps.filter((x) => x.done).length
  return (
    <Card title={`Canlıya geçiş · ${done}/${steps.length}`} icon={<CheckCircle2 className="size-4" />} className="max-w-2xl">
      <ol className="space-y-2">
        {steps.map((x) => (
          <li key={x.key} className={`flex gap-3 rounded-lg border p-3 ${x.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
            {x.manual
              ? <input type="checkbox" className="mt-1 size-5 accent-emerald-600" checked={x.done} onChange={() => toggle(x.key)} aria-label={x.title} />
              : x.done ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <Circle className="size-5 shrink-0 text-slate-400" />}
            <div>
              <div className={`font-semibold ${x.done ? 'text-emerald-800' : 'text-navy-900'}`}>{x.title}</div>
              <div className="text-sm text-slate-600">{x.text}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
