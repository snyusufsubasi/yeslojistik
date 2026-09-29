import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import { flushQueue, stopTracking } from './location'
import { unregisterPush } from './notifications'
import type { Role } from './types'

interface AuthState {
  ready: boolean
  signedIn: boolean
  /** Hesabın rolü: şoför ekranları ya da ofis (yönetici) ekranları buna göre açılır. */
  role: Role | null
  signIn: (server: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    Promise.all([api.hasSession(), api.getRole()])
      .then(([has, r]) => { setSignedIn(has); setRole(r ?? (has ? 'Driver' : null)) })
      .finally(() => setReady(true))
    api.setUnauthorizedHandler(() => { setSignedIn(false); qc.clear() })
    return () => api.setUnauthorizedHandler(null)
  }, [qc])

  const signIn = useCallback(async (server: string, email: string, password: string) => {
    const data = await api.login(server, email, password)
    setRole(data.user.role)
    setSignedIn(true)
  }, [])

  const signOut = useCallback(async () => {
    await stopTracking()
    await flushQueue().catch(() => undefined) // bekleyen konumları çıkıştan önce gönder
    await unregisterPush()
    await api.logout()
    qc.clear()
    setSignedIn(false)
    setRole(null)
  }, [qc])

  const value = useMemo(() => ({ ready, signedIn, role, signIn, signOut }), [ready, signedIn, role, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
