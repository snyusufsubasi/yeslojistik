import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage, post } from '../api/client'
import { Button } from '../components/ui'
import { Logo } from '../components/Logo'
import { usePageTitle } from '../lib/usePageTitle'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl sm:p-8">
        <Logo dark className="mb-4 justify-center" />
        {children}
        <p className="mt-6 text-center text-sm"><Link className="text-brand-600 hover:underline" to="/giris">Girişe dön</Link></p>
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
      <h1 className="mb-2 text-lg font-bold text-navy-900">Şifremi unuttum</h1>
      {state === 'sent' ? (
        <p className="text-base text-slate-700">Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi. E-postanızı (gereksiz klasörü dahil) kontrol edin; bağlantı 30 dakika geçerlidir.</p>
      ) : state === 'no-email' ? (
        <p className="text-base text-slate-700">Sunucuda e-posta gönderimi ayarlı değil. Şifrenizi yöneticinizden sıfırlamasını isteyin (Ayarlar → Kullanıcılar).</p>
      ) : (
        <form onSubmit={submit}>
          <p className="mb-4 text-sm text-slate-600">Hesabınızın e-posta adresini yazın; şifrenizi yenilemeniz için bir bağlantı gönderelim.</p>
          <label className="mb-4 block">
            <span className="label">E-posta</span>
            <input className="input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
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
      <h1 className="mb-2 text-lg font-bold text-navy-900">Yeni şifre belirleyin</h1>
      {!token ? <p className="text-base text-slate-700">Bağlantı eksik. E-postadaki bağlantıyı açın ya da yeniden "Şifremi unuttum" deyin.</p>
        : done ? <p className="text-base text-slate-700">Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz; diğer cihazlardaki oturumlar kapatıldı.</p>
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
            {error && <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <Button type="submit" className="w-full" loading={loading}>Şifreyi Değiştir</Button>
          </form>
        )}
    </Shell>
  )
}
