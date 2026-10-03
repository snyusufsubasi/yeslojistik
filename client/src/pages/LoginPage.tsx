import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { errorMessage } from '../api/client'
import { Button } from '../components/ui'
import { usePageTitle } from '../lib/usePageTitle'
import { Logo } from '../components/Logo'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  usePageTitle('Giriş')

  if (user) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-side p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[4px] border-t-[3px] border-hl bg-white p-6 shadow-lg sm:p-8">
        <Logo dark size="lg" className="mb-1.5 justify-center" />
        <p className="mb-7 text-center text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">Nakliye Takip Sistemi</p>
        <label className="mb-3 block">
          <span className="label">E-posta</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input className="input pl-8" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </label>
        <label className="mb-4 block">
          <span className="label">Şifre</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input className="input pl-8 pr-10" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'} title={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:text-slate-800">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
        {error && <div role="alert" className="mb-4 rounded-[3px] bg-bad-soft px-3 py-2.5 text-[0.875rem] font-semibold text-bad">{error}</div>}
        <Button type="submit" className="min-h-11 w-full text-[0.9375rem]" loading={loading}>Giriş Yap</Button>
        <p className="mt-5 text-center text-[0.875rem]"><Link className="font-semibold text-accent hover:underline" to="/sifremi-unuttum">Şifremi unuttum</Link></p>
        <p className="mt-2 text-center text-[0.8125rem] text-muted"><Link className="hover:underline" to="/gizlilik">Gizlilik ve KVKK</Link></p>
      </form>
    </div>
  )
}
