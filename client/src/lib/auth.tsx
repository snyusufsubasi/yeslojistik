import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { get, post, SESSION_EXPIRED_EVENT } from '../api/client'
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
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  can: (p: Permission) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    get<CurrentUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
    const onExpired = () => { setUser(null); qc.clear() }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [qc])

  const login = useCallback(async (email: string, password: string) => {
    setUser(await post<CurrentUser>('/auth/login', { email, password }))
  }, [])

  const logout = useCallback(async () => {
    try { await post('/auth/logout') } finally { setUser(null); qc.clear() }
  }, [qc])

  const can = useCallback((p: Permission) => !!user && permissionRoles[p].includes(user.role), [user])

  const value = useMemo(() => ({ user, loading, login, logout, can }), [user, loading, login, logout, can])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
