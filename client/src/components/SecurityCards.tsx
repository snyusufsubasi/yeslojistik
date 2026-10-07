import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { ClipboardCopy, Download, FileArchive, ShieldCheck, ShieldOff } from 'lucide-react'
import { del, download, errorMessage, get, post } from '../api/client'
import type { CompanySettings } from '../api/types'
import { dateTime } from '../lib/format'
import { Badge, Button, Card, Field, Loading } from './ui'
import { useToast } from './Toast'

interface TwoFactorStatus { available: boolean; enabled: boolean; recoveryCodesLeft: number; enabledAt?: string | null }
interface TwoFactorSetup { secret: string; otpAuthUri: string }

const spaced = (s: string) => s.replace(/(.{4})/g, '$1 ').trim()

/** Kurtarma kodlarını panoya kopyalar; pano kapalıysa seçili metin olarak bırakır. */
async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

function saveTextFile(name: string, text: string) {
  const href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

/** İki adımlı doğrulama: açma (QR + kod), kurtarma kodları, kapatma. */
export function TwoFactorCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, error, refetch } = useQuery({ queryKey: ['2fa-status'], queryFn: () => get<TwoFactorStatus>('/auth/2fa/status') })
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [disableCode, setDisableCode] = useState('')

  if (!data) return <Loading error={error} onRetry={refetch} />
  if (!data.available) {
    return <Card title="İki Adımlı Doğrulama" icon={<ShieldCheck className="size-4" />} className="max-w-xl">
      <p className="text-[0.9375rem] text-slate-700">Şoför hesaplarında iki adımlı doğrulama kullanılmaz.</p>
    </Card>
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try { await fn() } catch (e) { setMessage(errorMessage(e)) } finally { setBusy(false) }
  }

  const start = () => run(async () => {
    const r = await post<TwoFactorSetup>('/auth/2fa/setup')
    setQr(await QRCode.toDataURL(r.otpAuthUri, { margin: 1, width: 200 }))
    setSetup(r)
    setCode('')
  })
  const enable = (e: FormEvent) => {
    e.preventDefault()
    return run(async () => {
      const r = await post<{ recoveryCodes: string[] }>('/auth/2fa/enable', { code })
      setCodes(r.recoveryCodes)
      setSaved(false)
      setSetup(null)
      await qc.invalidateQueries({ queryKey: ['2fa-status'] })
    })
  }
  const disable = (e: FormEvent) => {
    e.preventDefault()
    return run(async () => {
      await post('/auth/2fa/disable', { password, code: disableCode })
      setPassword('')
      setDisableCode('')
      toast.success('İki adımlı doğrulama kapatıldı.')
      await qc.invalidateQueries({ queryKey: ['2fa-status'] })
    })
  }

  const codesText = codes?.join('\n') ?? ''

  return (
    <Card title="İki Adımlı Doğrulama" icon={<ShieldCheck className="size-4" />} className="max-w-xl"
      actions={<Badge tone={data.enabled ? 'green' : 'gray'}>{data.enabled ? 'Açık' : 'Kapalı'}</Badge>}>
      <div className="space-y-4 text-[0.9375rem] text-slate-700">
        {codes ? (
          <>
            <p className="font-semibold text-slate-900">İki adımlı doğrulama açıldı. Kurtarma kodlarınızı şimdi kaydedin.</p>
            <p>Telefonunuza ulaşamazsanız bu kodlardan biriyle girebilirsiniz. Her kod yalnızca bir kez çalışır. <b>Bu kodlar bir daha gösterilmeyecek.</b></p>
            <ul aria-label="Kurtarma kodları" className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-line bg-surface-2 p-3 font-mono text-[0.9375rem]">
              {codes.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<ClipboardCopy />} onClick={async () => { if (await copyText(codesText)) toast.success('Kodlar kopyalandı.'); else toast.error('Kopyalanamadı. Kodları seçip elle kopyalayın ya da İndir deyin.') }}>Kopyala</Button>
              <Button variant="secondary" icon={<Download />} onClick={() => saveTextFile('kurtarma-kodlari.txt', `Kurtarma kodları\n\n${codesText}\n`)}>İndir</Button>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> Kodları güvenli bir yere kaydettim</label>
            <Button disabled={!saved} onClick={() => setCodes(null)}>Bitti</Button>
          </>
        ) : data.enabled ? (
          <>
            <p>Girişte şifrenizden sonra telefonunuzdaki doğrulama uygulamasının 6 haneli kodu istenir.
              Kalan kurtarma kodu: <b>{data.recoveryCodesLeft}</b>{data.enabledAt && <> · Açılış: {dateTime(data.enabledAt)}</>}</p>
            <form onSubmit={disable} className="space-y-3 border-t border-line pt-4">
              <p className="font-semibold text-slate-900">Kapatmak için</p>
              <Field label="Şifreniz"><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              <Field label="Doğrulama kodu ya da kurtarma kodu"><input className="input" autoComplete="one-time-code" required value={disableCode} onChange={(e) => setDisableCode(e.target.value)} /></Field>
              {message && <div role="alert" className="text-[0.875rem] font-semibold text-bad">{message}</div>}
              <Button type="submit" variant="danger" icon={<ShieldOff />} loading={busy}>İki adımlı doğrulamayı kapat</Button>
            </form>
          </>
        ) : setup ? (
          <form onSubmit={enable} className="space-y-4">
            <ol className="list-inside list-decimal space-y-1">
              <li>Telefonunuza bir doğrulama uygulaması kurun (Google Authenticator, Microsoft Authenticator vb.).</li>
              <li>Uygulamada "hesap ekle" deyip aşağıdaki kareyi okutun.</li>
              <li>Uygulamanın gösterdiği 6 haneli kodu yazın.</li>
            </ol>
            <div className="flex flex-wrap items-center gap-4">
              {qr ? <img src={qr} alt="Doğrulama uygulaması için QR kod" width={200} height={200} className="rounded border border-line" /> : <div className="size-[200px] animate-pulse rounded bg-slate-100" />}
              <div className="text-sm">
                <p>Kare okunmazsa bu anahtarı elle girin:</p>
                <p className="mt-1 select-all break-all font-mono text-[0.9375rem] font-semibold text-slate-900" aria-label="Elle giriş anahtarı">{spaced(setup.secret)}</p>
              </div>
            </div>
            <Field label="Uygulamadaki 6 haneli kod">
              <input className="input max-w-40 font-mono tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required
                value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            {message && <div role="alert" className="text-[0.875rem] font-semibold text-bad">{message}</div>}
            <div className="flex gap-2">
              <Button type="submit" loading={busy}>Doğrula ve aç</Button>
              <Button type="button" variant="secondary" onClick={() => { setSetup(null); setMessage('') }}>Vazgeç</Button>
            </div>
          </form>
        ) : (
          <>
            <p>Şifreniz çalınsa bile hesabınıza girilemesin. Açtığınızda girişte telefonunuzdaki uygulamanın kodu da istenir. Yönetici hesapları için önerilir.</p>
            {message && <div role="alert" className="text-[0.875rem] font-semibold text-bad">{message}</div>}
            <Button icon={<ShieldCheck />} loading={busy} onClick={start}>İki adımlı doğrulamayı aç</Button>
          </>
        )}
      </div>
    </Card>
  )
}

interface CloseStatus { requested: boolean; requestedAt?: string | null; deleteAfter?: string | null }

/** Yönetici: tüm verileri indirme ve hesabı kapatma talebi. */
export function DataOwnershipCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => get<CompanySettings>('/settings') })
  const close = useQuery({ queryKey: ['close-request'], queryFn: () => get<CloseStatus>('/admin/close-request') })

  const exportAll = async () => {
    setBusy(true)
    try {
      await download('/admin/export-all', undefined, 'verilerim.zip')
      toast.success('Verileriniz indirildi.')
    } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }

  const request = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await post('/admin/close-request', { companyName: name })
      setName('')
      await qc.invalidateQueries({ queryKey: ['close-request'] })
    } catch (err) { setMessage(errorMessage(err)) } finally { setBusy(false) }
  }

  const cancel = async () => {
    setBusy(true)
    try {
      await del('/admin/close-request')
      toast.success('Hesabı kapatma talebinden vazgeçildi.')
      await qc.invalidateQueries({ queryKey: ['close-request'] })
    } catch (err) { toast.error(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Verilerimi indir" icon={<FileArchive className="size-4" />} className="max-w-2xl">
        <div className="space-y-3 text-[0.9375rem] text-slate-700">
          <p>Müşteriler, tedarikçiler, şoförler, araçlar, sevkiyatlar, faturalar, ödemeler, giderler, kasa/banka ve personel kayıtlarınızın hepsini
            Excel'de açılan dosyalar olarak (ZIP) indirir. Şifreler pakete konmaz. Dosyalar müşteri bilgisi içerir; güvenli bir yerde saklayın.</p>
          <Button icon={<Download />} loading={busy} onClick={exportAll}>Tüm verilerimi indir</Button>
        </div>
      </Card>
      <Card title="Hesabı kapatma talebi" icon={<ShieldOff className="size-4" />} className="max-w-2xl">
        {!close.data ? <Loading error={close.error} onRetry={close.refetch} /> : close.data.requested ? (
          <div className="space-y-3 text-[0.9375rem] text-slate-700">
            <p role="status" className="rounded-lg bg-warn-soft px-3 py-2.5 font-semibold">
              Talebiniz alındı, 30 gün içinde verileriniz silinir; önce verilerinizi indirmenizi öneririz.
            </p>
            {close.data.requestedAt && <p className="text-sm">Talep tarihi: {dateTime(close.data.requestedAt)}</p>}
            <Button variant="secondary" loading={busy} onClick={cancel}>Talebi geri çek</Button>
          </div>
        ) : (
          <form onSubmit={request} className="space-y-3 text-[0.9375rem] text-slate-700">
            <p>Hesabınızı kapatmak istiyorsanız talep oluşturun. Talep alındığında hiçbir şey hemen silinmez; verileriniz 30 gün içinde silinir
              ve bu sürede talebi geri çekebilirsiniz. Önce verilerinizi indirmenizi öneririz.</p>
            <Field label="Onaylamak için firma adını yazın" hint={settings.data ? `Firma adı: ${settings.data.companyName}` : undefined}>
              <input className="input max-w-sm" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </Field>
            {message && <div role="alert" className="text-[0.875rem] font-semibold text-bad">{message}</div>}
            <Button type="submit" variant="danger" loading={busy} disabled={!name.trim()}>Hesabı kapatma talebi gönder</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
