import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage, post } from '../api/client'
import { Button } from '../components/ui'
import { Logo } from '../components/Logo'
import { usePageTitle } from '../lib/usePageTitle'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-side p-4">
      <div className="w-full max-w-sm rounded-[4px] border-t-[3px] border-hl bg-white p-6 shadow-lg sm:p-8">
        <Logo dark size="lg" className="mb-5 justify-center" />
        {children}
        <p className="mt-6 text-center text-[0.875rem]"><Link className="font-semibold text-accent hover:underline" to="/giris">Girişe dön</Link></p>
      </div>
    </div>
  )
}

/** "Şifremi unuttum": e-posta adresine sıfırlama bağlantısı gönderilir (hesap olsun olmasın aynı mesaj gösterilir). */
export function ForgotPasswordPage() {
  usePageTitle('Şifremi unuttum')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'no-email'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setState('loading')
    try {
      const res = await post<{ emailEnabled: boolean }>('/auth/forgot-password', { email })
      setState(res.emailEnabled ? 'sent' : 'no-email')
    } catch (err) {
      setError(errorMessage(err))
      setState('idle')
    }
  }

  return (
    <Shell>
      <h1 className="mb-2 text-lg font-bold text-fg">Şifremi unuttum</h1>
      {state === 'sent' ? (
        <p className="text-[0.9375rem] text-slate-700">Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi. E-postanızı (gereksiz klasörü dahil) kontrol edin; bağlantı 30 dakika geçerlidir.</p>
      ) : state === 'no-email' ? (
        <p className="text-[0.9375rem] text-slate-700">Sunucuda e-posta gönderimi ayarlı değil. Şifrenizi yöneticinizden sıfırlamasını isteyin (Ayarlar → Kullanıcılar).</p>
      ) : (
        <form onSubmit={submit}>
          <p className="mb-4 text-sm text-slate-600">Hesabınızın e-posta adresini yazın; şifrenizi yenilemeniz için bir bağlantı gönderelim.</p>
          <label className="mb-4 block">
            <span className="label">E-posta</span>
            <input className="input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <div role="alert" className="mb-3 rounded-[3px] bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{error}</div>}
          <Button type="submit" className="w-full" loading={state === 'loading'}>Bağlantı Gönder</Button>
        </form>
      )}
    </Shell>
  )
}

/** E-postadaki bağlantıdan açılır: yeni şifre belirlenir, diğer cihazlardaki oturumlar kapanır. */
export function ResetPasswordPage() {
  usePageTitle('Yeni şifre')
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return setError('Şifreler aynı değil.')
    setError('')
    setLoading(true)
    try {
      await post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      <h1 className="mb-2 text-lg font-bold text-fg">Yeni şifre belirleyin</h1>
      {!token ? <p className="text-[0.9375rem] text-slate-700">Bağlantı eksik. E-postadaki bağlantıyı açın ya da yeniden "Şifremi unuttum" deyin.</p>
        : done ? <p className="text-[0.9375rem] text-slate-700">Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz; diğer cihazlardaki oturumlar kapatıldı.</p>
        : (
          <form onSubmit={submit}>
            <label className="mb-3 block">
              <span className="label">Yeni şifre</span>
              <input className="input" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="mb-4 block">
              <span className="label">Yeni şifre (tekrar)</span>
              <input className="input" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <p className="mb-3 text-sm text-slate-500">En az 8 karakter; harf ve rakam içermeli.</p>
            {error && <div role="alert" className="mb-3 rounded-[3px] bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{error}</div>}
            <Button type="submit" className="w-full" loading={loading}>Şifreyi Değiştir</Button>
          </form>
        )}
    </Shell>
  )
}
