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
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-10">
        <Logo dark className="mb-2 justify-center" />
        <p className="mb-8 text-center text-lg text-slate-600">Nakliye Takip Sistemi</p>
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
        {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[0.9375rem] font-medium text-red-700">{error}</div>}
        <Button type="submit" className="min-h-13 w-full text-lg" loading={loading}>Giriş Yap</Button>
        <p className="mt-6 text-center text-[0.9375rem]"><Link className="font-medium text-brand-700 hover:underline" to="/sifremi-unuttum">Şifremi unuttum</Link></p>
        <p className="mt-3 text-center text-sm text-slate-500"><Link className="hover:underline" to="/gizlilik">Gizlilik ve KVKK</Link></p>
      </form>
    </div>
  )
}
