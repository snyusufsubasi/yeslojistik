import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import clsx from 'clsx'
import { Check, CheckCircle2, FlaskConical, Rocket, Upload } from 'lucide-react'
import { errorMessage, get, post, put } from '../api/client'
import type { CompanySettings, Dashboard, LookupItem, User, UserRole } from '../api/types'
import { CitySelect } from '../components/CitySelect'
import { ImportWizard } from '../components/ImportWizard'
import { wizardEntities, type WizardEntity } from '../lib/importMeta'
import { useToast } from '../components/Toast'
import { Button, Card, Chip, Field, Loading, PageHeader } from '../components/ui'
import { useAuth } from '../lib/auth'
import { applyServerErrors, nullify, optStr, req } from '../lib/forms'
import { crud, useLookup, useSave } from '../lib/hooks'
import { withholdingOptions } from '../lib/labels'
import { readOnboarding, writeOnboarding, type OnboardingState } from '../lib/onboarding'

type StepId = 'firma' | 'fatura' | 'veri' | 'kullanici' | 'basla'
const STEPS: { id: StepId; title: string; short: string }[] = [
  { id: 'firma', title: 'Firma bilgileri', short: 'Firma' },
  { id: 'fatura', title: 'Fatura ve KDV varsayılanları', short: 'Fatura ve KDV' },
  { id: 'veri', title: 'Verileri getir', short: 'Veriler' },
  { id: 'kullanici', title: 'İlk kullanıcılar', short: 'Kullanıcılar' },
  { id: 'basla', title: 'Başlayın', short: 'Başla' },
]

/** İlk kurulum sihirbazı (yalnız yönetici): her adım atlanabilir; kaldığınız yerden devam edilir, tamamlanma veriden anlaşılır. */
export default function OnboardingPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [local, setLocal] = useState<OnboardingState>(readOnboarding)
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => get<CompanySettings>('/settings') })
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard') })
  const setup = dashboard.data?.setup
  if (!can('admin')) return null
  if (!settings.data || !setup) return <Loading error={settings.error ?? dashboard.error} onRetry={() => { settings.refetch(); dashboard.refetch() }} />

  const update = (patch: Partial<OnboardingState>) => setLocal(writeOnboarding(patch))
  const done: Record<StepId, boolean> = {
    firma: setup.companyInfo,
    fatura: local.invoiceSaved,
    veri: setup.customerCount + setup.supplierCount + setup.vehicleCount + setup.driverCount > 0,
    kullanici: setup.userCount > 1,
    basla: local.finished || setup.sampleData,
  }
  const doneCount = STEPS.filter((s) => done[s.id]).length
  const firstOpen = STEPS.find((s) => !done[s.id] && !local.skipped.includes(s.id))?.id ?? 'basla'
  const askedStep = params.get('adim') as StepId | null
  const current: StepId = STEPS.some((s) => s.id === askedStep) ? askedStep! : firstOpen
  const index = STEPS.findIndex((s) => s.id === current)
  const go = (id: StepId) => setParams({ adim: id }, { replace: true })
  const next = () => index < STEPS.length - 1 && go(STEPS[index + 1].id)
  const skip = () => {
    update({ skipped: [...new Set([...local.skipped, current])] })
    next()
  }

  return (
    <>
      <PageHeader title="Kurulum Sihirbazı" subtitle="Birkaç adımda çalışmaya hazır olun. İstediğiniz adımı atlayabilir, sonra kaldığınız yerden devam edebilirsiniz."
        actions={<Link to="/" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[0.875rem] font-semibold text-fg hover:bg-surface-2">Ana sayfaya dön</Link>} />

      <nav aria-label="Kurulum adımları" className="mb-4">
        <div className="mb-2 flex items-center gap-3 text-[0.8125rem] text-muted">
          <div role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={doneCount} aria-label="Kurulum ilerlemesi"
            className="h-1.5 flex-1 overflow-hidden rounded-md bg-line">
            <div className="h-full bg-accent transition-all" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
          </div>
          <span className="font-mono font-semibold text-fg">{doneCount}/{STEPS.length}</span> tamam
        </div>
        <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.id} className="bg-white">
              <button type="button" onClick={() => go(s.id)} aria-current={s.id === current ? 'step' : undefined}
                className={clsx('flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left text-[0.875rem] transition hover:bg-surface-2', s.id === current && 'bg-accent-soft')}>
                <span className={clsx('flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.75rem] font-bold',
                  done[s.id] ? 'border-good bg-good text-white' : s.id === current ? 'border-accent text-accent' : 'border-slate-300 text-muted')}>
                  {done[s.id] ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={clsx('block truncate', s.id === current ? 'font-bold text-fg' : 'font-semibold text-fg')}>{s.short}</span>
                  {!done[s.id] && local.skipped.includes(s.id) && <span className="block text-[0.6875rem] text-muted">atlandı</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <Card title={`${index + 1}. ${STEPS[index].title}`}>
        {current === 'firma' && <CompanyStep settings={settings.data} onSaved={next} onSkip={skip} />}
        {current === 'fatura' && <InvoiceStep settings={settings.data} onSaved={() => { update({ invoiceSaved: true }); next() }} onSkip={skip} />}
        {current === 'veri' && <DataStep onSkip={skip} onNext={next} />}
        {current === 'kullanici' && <UsersStep onSkip={skip} onNext={next} />}
        {current === 'basla' && <StartStep setup={setup} onFinish={() => update({ finished: true })} />}
      </Card>
    </>
  )
}

function StepButtons({ onSkip, children }: { onSkip?: () => void; children?: ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
      {children}
      {onSkip && <Button type="button" variant="ghost" onClick={onSkip}>Bu adımı atla</Button>}
    </div>
  )
}

/* ---------- 1. Firma ---------- */

const companySchema = z.object({
  companyName: req('Firma ünvanı zorunlu.'),
  taxNumber: z.string().trim().regex(/^(\d{10}|\d{11})?$/, 'VKN 10, TCKN 11 haneli olmalı.'),
  taxOffice: optStr,
  address: optStr,
  city: optStr,
  phone: optStr,
  email: z.string().trim().email('Geçerli bir e-posta girin.').or(z.literal('')),
  logoDataUrl: z.string().nullable().optional(),
})
type CompanyValues = z.infer<typeof companySchema>

function CompanyStep({ settings, onSaved, onSkip }: { settings: CompanySettings; onSaved: () => void; onSkip: () => void }) {
  const toast = useToast()
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: settings.companyName, taxNumber: settings.taxNumber ?? '', taxOffice: settings.taxOffice ?? '', address: settings.address ?? '',
      city: settings.city ?? '', phone: settings.phone ?? '', email: settings.email ?? '', logoDataUrl: settings.logoDataUrl ?? null,
    },
  })
  const logo = useWatch({ control, name: 'logoDataUrl' })
  // Ayarların geri kalanı (fatura, e-Fatura, bildirim...) olduğu gibi korunur; yalnız bu adımın alanları değişir.
  const save = useSave((v: CompanyValues) => put<CompanySettings>('/settings', { ...settings, ...nullify(v) }), {
    invalidate: ['settings', 'public'], success: 'Firma bilgileri kaydedildi.', onSuccess: onSaved, onError: (e) => applyServerErrors(e, setError),
  })
  const onLogo = (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 500_000) {
      toast.error("Logo 500 KB'dan küçük PNG veya JPEG olmalı.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setValue('logoDataUrl', String(reader.result), { shouldDirty: true })
    reader.readAsDataURL(file)
  }
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <p className="mb-4 text-[0.875rem] text-muted">Bu bilgiler faturalarda, sevk belgelerinde, e-postalarda ve müşteri takip sayfasında görünür. Firma adınız ve logonuz panelde de kullanılır.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Firma ünvanı" required error={errors.companyName?.message}><input className="input" autoComplete="organization" {...register('companyName')} /></Field>
        <Field label="Vergi no (VKN/TCKN)" error={errors.taxNumber?.message} hint="10 haneli VKN ya da 11 haneli TCKN"><input className="input" inputMode="numeric" {...register('taxNumber')} /></Field>
        <Field label="Vergi dairesi"><input className="input" {...register('taxOffice')} /></Field>
        <Field className="sm:col-span-2" label="Adres"><input className="input" autoComplete="street-address" {...register('address')} /></Field>
        <Field label="İl" error={errors.city?.message}><CitySelect control={control} name="city" /></Field>
        <Field label="Telefon" error={errors.phone?.message}><input className="input" inputMode="tel" {...register('phone')} /></Field>
        <Field className="sm:col-span-2" label="E-posta" error={errors.email?.message}><input className="input" type="email" {...register('email')} /></Field>
        <div className="sm:col-span-2">
          <span className="label">Logo (PNG veya JPEG, en çok 500 KB)</span>
          <div className="flex flex-wrap items-center gap-3">
            {logo ? <img src={logo} alt="Logo önizleme" className="h-12 max-w-40 rounded-lg border border-line object-contain p-1" /> : <span className="text-[0.875rem] text-muted">Logo yok</span>}
            <label className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[0.8125rem] font-semibold text-fg hover:bg-surface-2">
              <Upload className="size-3.5" /> {logo ? 'Logoyu değiştir' : 'Logo yükle'}
              <input type="file" accept="image/png,image/jpeg" aria-label="Logo dosyası" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
            </label>
            {logo && <Button type="button" size="sm" variant="ghost" onClick={() => setValue('logoDataUrl', null, { shouldDirty: true })}>Kaldır</Button>}
          </div>
          {errors.logoDataUrl && <span className="text-[0.8125rem] text-bad">{errors.logoDataUrl.message}</span>}
        </div>
      </div>
      <StepButtons onSkip={onSkip}><Button type="submit" loading={save.isPending}>Kaydet ve devam et</Button></StepButtons>
    </form>
  )
}

/* ---------- 2. Fatura ve KDV ---------- */

const invoiceSchema = z.object({
  invoicePrefix: z.string().trim().regex(/^[A-Z]{1,5}$/, '1-5 büyük harf olmalı.'),
  nextInvoiceNumber: z.number({ error: 'Sayı girin.' }).int().positive('Sıfırdan büyük olmalı.'),
  defaultVatRate: z.number({ error: 'Sayı girin.' }).min(0).max(100),
  defaultWithholdingTenths: z.number().int().min(0).max(10),
  defaultPaymentTermDays: z.number({ error: 'Sayı girin.' }).int().min(0).max(365),
})
type InvoiceValues = z.infer<typeof invoiceSchema>

function InvoiceStep({ settings, onSaved, onSkip }: { settings: CompanySettings; onSaved: () => void; onSkip: () => void }) {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoicePrefix: settings.invoicePrefix, nextInvoiceNumber: settings.nextInvoiceNumber, defaultVatRate: settings.defaultVatRate,
      defaultWithholdingTenths: settings.defaultWithholdingTenths, defaultPaymentTermDays: settings.defaultPaymentTermDays,
    },
  })
  const save = useSave((v: InvoiceValues) => put<CompanySettings>('/settings', { ...settings, ...v }), {
    invalidate: ['settings'], success: 'Fatura varsayılanları kaydedildi.', onSuccess: onSaved, onError: (e) => applyServerErrors(e, setError),
  })
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <p className="mb-4 text-[0.875rem] text-muted">Yeni faturalarda bunlar hazır gelir; her faturada değiştirebilirsiniz. Eski programınızda fatura kestiyseniz “Sıradaki fatura no” alanına kaldığınız numaranın bir fazlasını yazın.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fatura numarası ön eki" error={errors.invoicePrefix?.message} hint="Örn. F → F2026000001"><input className="input uppercase" {...register('invoicePrefix', { setValueAs: (v: string) => v.toUpperCase() })} /></Field>
        <Field label="Sıradaki fatura no" error={errors.nextInvoiceNumber?.message}><input className="input" type="number" {...register('nextInvoiceNumber', { valueAsNumber: true })} /></Field>
        <Field label="Varsayılan KDV (%)" error={errors.defaultVatRate?.message} hint="Yurt içi yük taşımacılığında genelde 20"><input className="input" type="number" step="0.01" {...register('defaultVatRate', { valueAsNumber: true })} /></Field>
        <Field label="Varsayılan tevkifat">
          <select className="input" {...register('defaultWithholdingTenths', { valueAsNumber: true })}>
            {withholdingOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Varsayılan vade (gün)" error={errors.defaultPaymentTermDays?.message}><input className="input" type="number" {...register('defaultPaymentTermDays', { valueAsNumber: true })} /></Field>
      </div>
      <StepButtons onSkip={onSkip}><Button type="submit" loading={save.isPending}>Kaydet ve devam et</Button></StepButtons>
    </form>
  )
}

/* ---------- 3. Veriler ---------- */

function DataStep({ onSkip, onNext }: { onSkip: () => void; onNext: () => void }) {
  const { can } = useAuth()
  const options = wizardEntities.filter((e) => e.perm === 'any' || can('operations'))
  const [entity, setEntity] = useState<WizardEntity>(options[0].value)
  return (
    <div>
      <p className="mb-3 text-[0.875rem] text-muted">Eski programınızdan ya da Excel'den müşteri, tedarikçi, şoför ve araç listelerinizi alın. Sırayla: tedarikçiler, müşteriler, şoförler, araçlar. Eski borç/alacak bakiyeleri aynı dosyada “Devir” sütunlarıyla gelir. Elinizde liste yoksa bu adımı atlayıp kayıtları sonra tek tek de ekleyebilirsiniz.</p>
      <div role="tablist" aria-label="Aktarılacak liste" className="mb-4 flex flex-wrap gap-2">
        {[...options].sort((a, b) => ['suppliers', 'customers', 'drivers', 'vehicles'].indexOf(a.value) - ['suppliers', 'customers', 'drivers', 'vehicles'].indexOf(b.value)).map((e) => (
          <Chip key={e.value} role="tab" aria-selected={e.value === entity} active={e.value === entity} onClick={() => setEntity(e.value)}>{e.label}</Chip>
        ))}
      </div>
      <ImportWizard key={entity} entity={entity} />
      <StepButtons onSkip={onSkip}><Button variant="secondary" onClick={onNext}>Devam et</Button></StepButtons>
    </div>
  )
}

/* ---------- 4. Kullanıcılar ---------- */

const strong = (p: string) => p.length >= 8 && /\p{L}/u.test(p) && /\d/.test(p)
const userRoles: { value: Exclude<UserRole, 'Admin'>; label: string; hint: string }[] = [
  { value: 'Operations', label: 'Operasyon', hint: 'Sevkiyat, araç ve şoför işleri' },
  { value: 'Accounting', label: 'Muhasebe', hint: 'Fatura, tahsilat, cari ve raporlar' },
  { value: 'Driver', label: 'Şoför (mobil)', hint: 'Yalnız mobil uygulamadan kendi sevkiyatları' },
]
const usersApi = crud<User, { fullName: string; email: string; role: UserRole; isActive: boolean; password: string; driverId: number | null }>('users')

function UsersStep({ onSkip, onNext }: { onSkip: () => void; onNext: () => void }) {
  const users = useQuery({ queryKey: ['users'], queryFn: () => get<User[]>('/users') })
  const drivers = useLookup('drivers')
  const [role, setRole] = useState<Exclude<UserRole, 'Admin'>>('Operations')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [driverId, setDriverId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const add = useSave(() => usersApi.create({ fullName: fullName.trim(), email: email.trim(), role, isActive: true, password, driverId: role === 'Driver' ? driverId : null }), {
    invalidate: ['users'], success: 'Kullanıcı eklendi.',
    onSuccess: () => { setFullName(''); setEmail(''); setPassword(''); setDriverId(null); setError(null) },
    onError: (e) => setError(errorMessage(e)),
  })
  const submit = () => {
    if (!fullName.trim()) return setError('Ad soyad yazın.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Geçerli bir e-posta yazın.')
    if (!strong(password)) return setError('Şifre en az 8 karakter olmalı ve harf ile rakam içermeli.')
    if (role === 'Driver' && !driverId) return setError('Şoför hesabı için bağlı şoförü seçin (önce 3. adımda şoförleri aktarın ya da Şoförler sayfasından ekleyin).')
    setError(null)
    add.mutate(undefined)
  }
  const driverItems: LookupItem[] = drivers.data ?? []
  return (
    <div>
      <p className="mb-3 text-[0.875rem] text-muted">Çalışanlarınız kendi e-posta ve şifreleriyle girer. Yönetici sizsiniz. Şoförler yalnızca mobil uygulamayı kullanır. Bu adımı sonra Ayarlar → Kullanıcılar'dan da yapabilirsiniz.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Rol" group>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((r) => <Chip key={r.value} active={role === r.value} title={r.hint} onClick={() => setRole(r.value)}>{r.label}</Chip>)}
          </div>
        </Field>
        <Field label="Ad soyad" required><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="E-posta" required><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {role === 'Driver' && (
          <Field label="Bağlı şoför" required hint={driverItems.length === 0 ? 'Henüz şoför kaydı yok.' : undefined}>
            <select className="input" value={driverId ?? ''} onChange={(e) => setDriverId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Seçiniz</option>
              {driverItems.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Şifre" required hint="En az 8 karakter, harf ve rakam"><input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      </div>
      {error && <p role="alert" className="mt-2 text-[0.8125rem] text-bad">{error}</p>}
      <div className="mt-3"><Button type="button" variant="secondary" loading={add.isPending} onClick={submit}>Kullanıcıyı ekle</Button></div>

      <h3 className="mb-1.5 mt-5 border-b border-line pb-1.5 text-[0.875rem] font-semibold text-fg">Mevcut kullanıcılar</h3>
      <ul className="divide-y divide-line text-[0.875rem]">
        {(users.data ?? []).map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-x-3 py-1.5"><span className="font-semibold">{u.fullName}</span><span className="text-muted">{u.email}</span>
            <span className="ml-auto text-[0.8125rem] text-muted">{u.role === 'Admin' ? 'Yönetici' : userRoles.find((r) => r.value === u.role)?.label}</span></li>
        ))}
      </ul>
      <StepButtons onSkip={onSkip}><Button variant="secondary" onClick={onNext}>Devam et</Button></StepButtons>
    </div>
  )
}

/* ---------- 5. Başla ---------- */

function StartStep({ setup, onFinish }: { setup: Dashboard['setup']; onFinish: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const hasRecords = setup.customerCount + setup.supplierCount + setup.vehicleCount + setup.driverCount + setup.tripCount > 0
  const sampleBlocked = setup.sampleData ? 'Örnek veriler zaten yüklü.' : setup.sampleDataCleared ? 'Örnek veriler daha önce temizlendi; tekrar yüklenmez.'
    : hasRecords ? 'Sistemde kayıt var; örnek veri yalnız boş kurulumda yüklenir.' : null
  const load = useMutation({
    mutationFn: () => post('/onboarding/sample-data'),
    onSuccess: () => {
      qc.invalidateQueries()
      onFinish()
      toast.success('Örnek veriler yüklendi. Temizlemek için Ayarlar → Veriler.')
      navigate('/')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const finish = () => {
    onFinish()
    navigate('/')
  }
  return (
    <div>
      <p className="mb-4 text-[0.875rem] text-muted">Son adım: nasıl başlamak istersiniz? Seçiminizi sonra değiştirebilirsiniz.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-line p-4">
          <h3 className="mb-1 flex items-center gap-2 font-bold"><FlaskConical className="size-4 text-accent" /> Örnek veri ile dene</h3>
          <p className="mb-3 text-[0.875rem] text-muted">Örnek müşteri, araç, şoför, sevkiyat ve faturalar yüklenir; programı gerçek veri girmeden gezebilirsiniz. Girdiğiniz firma bilgileri korunur. Hazır olunca Ayarlar → Veriler'den tek tuşla temizlenir.</p>
          <Button variant="secondary" loading={load.isPending} disabled={!!sampleBlocked} onClick={() => load.mutate()}>Örnek verileri yükle</Button>
          {sampleBlocked && <p className="mt-2 text-[0.8125rem] text-muted">{sampleBlocked}</p>}
        </section>
        <section className="rounded-xl border border-line p-4">
          <h3 className="mb-1 flex items-center gap-2 font-bold"><Rocket className="size-4 text-accent" /> Boş başla</h3>
          <p className="mb-3 text-[0.875rem] text-muted">Kendi kayıtlarınızla çalışmaya başlayın. İlk müşterinizi, aracınızı ve şoförünüzü listelerden ekleyebilir ya da istediğiniz zaman “Veri Aktarımı”ndan Excel ile getirebilirsiniz.</p>
          <Button onClick={finish} icon={<CheckCircle2 className="size-4" />}>Kurulumu bitir</Button>
        </section>
      </div>
    </div>
  )
}
