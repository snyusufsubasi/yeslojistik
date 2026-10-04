import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { get, isTransientError, post, SESSION_EXPIRED_EVENT } from '../api/client'
import type { CurrentUser, UserRole } from '../api/types'

export type Permission = 'operations' | 'accounting' | 'admin'

const permissionRoles: Record<Permission, UserRole[]> = {
  operations: ['Admin', 'Operations'],
  accounting: ['Admin', 'Accounting'],
  admin: ['Admin'],
}

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  /** Sunucuya uzun süre ulaşılamadıysa son hata; oturum kapatılmaz, "Tekrar dene" ile `retry` çağrılır. */
  unreachable: unknown
  retry: () => void
  /** İki adımlı doğrulaması açık hesapta oturum açılmaz; ikinci adım için `challengeToken` döner. */
  login: (email: string, password: string) => Promise<{ challengeToken?: string }>
  completeTwoFactor: (challengeToken: string, code: string) => Promise<void>
  logout: () => Promise<void>
  can: (p: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreachable, setUnreachable] = useState<unknown>(null)
  const [attemptKey, setAttemptKey] = useState(0)
  const qc = useQueryClient()

  useEffect(() => {
    let cancelled = false
    // Sunucu uyanırken /auth/me geçici hata verir: kullanıcıyı girişe atmak yerine ~1 dakika boyunca tekrar dene.
    const load = async () => {
      for (let attempt = 0; !cancelled; attempt++) {
        try {
          const me = await get<CurrentUser>('/auth/me')
          if (!cancelled) setUser(me)
          break
        } catch (e) {
          if (!isTransientError(e)) { if (!cancelled) setUser(null); break }
          // Sunucu hâlâ yanıt vermiyor: girişe atmak yerine "Tekrar dene" ekranı gösterilir.
          if (attempt >= 8) { if (!cancelled) setUnreachable(e); break }
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 10_000)))
        }
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    const onExpired = () => { setUser(null); qc.clear() }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => { cancelled = true; window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired) }
  }, [qc, attemptKey])

  const retry = useCallback(() => { setUnreachable(null); setLoading(true); setAttemptKey((k) => k + 1) }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await post<CurrentUser | { twoFactorRequired: true; challengeToken: string }>('/auth/login', { email, password })
    if ('twoFactorRequired' in res) return { challengeToken: res.challengeToken }
    setUser(res)
    return {}
  }, [])

  const completeTwoFactor = useCallback(async (challengeToken: string, code: string) => {
    setUser(await post<CurrentUser>('/auth/2fa/verify', { challengeToken, code }))
  }, [])

  const logout = useCallback(async () => {
    try { await post('/auth/logout') } finally { setUser(null); qc.clear() }
  }, [qc])

  const can = useCallback((p: Permission) => !!user && permissionRoles[p].includes(user.role), [user])

  const value = useMemo(() => ({ user, loading, unreachable, retry, login, completeTwoFactor, logout, can }), [user, loading, unreachable, retry, login, completeTwoFactor, logout, can])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
