import Constants from 'expo-constants'
import { storage } from './storage'
import type { Role, TokenResponse } from './types'

const KEY_SERVER = 'yl.server'
const KEY_ACCESS = 'yl.access'
const KEY_REFRESH = 'yl.refresh'
const KEY_ROLE = 'yl.role'

export const defaultServer = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? ''
const legacyServers = (Constants.expoConfig?.extra?.legacyApiUrls as string[] | undefined) ?? []

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

/** Kayıtlı sunucu; eski (taşınmış) bir adresse yeni adrese geçirilir. */
export async function getServer() {
  const saved = await storage.get(KEY_SERVER)
  if (saved && legacyServers.includes(saved) && defaultServer) {
    await storage.set(KEY_SERVER, defaultServer)
    return defaultServer
  }
  return saved ?? defaultServer
}

export async function saveSession(server: string, t: TokenResponse) {
  await storage.set(KEY_SERVER, server)
  await storage.set(KEY_ACCESS, t.accessToken)
  await storage.set(KEY_REFRESH, t.refreshToken)
  await storage.set(KEY_ROLE, t.user.role)
}

export async function clearSession() {
  await storage.remove(KEY_ACCESS)
  await storage.remove(KEY_REFRESH)
  await storage.remove(KEY_ROLE)
}

export async function getRole(): Promise<Role | null> {
  return (await storage.get(KEY_ROLE)) as Role | null
}

export async function hasSession() {
  return !!(await storage.get(KEY_REFRESH))
}

export function normalizeServer(input: string) {
  let s = input.trim().replace(/\/+$/, '')
  if (s && !/^https?:\/\//i.test(s)) s = 'https://' + s
  return s
}

async function readError(res: Response) {
  try {
    const body = await res.json()
    const first = body?.errors ? Object.values(body.errors as Record<string, string[]>)[0]?.[0] : undefined
    return first ?? body?.title ?? `Hata (${res.status})`
  } catch {
    return `Hata (${res.status})`
  }
}

/** Kullanıcı adı/şifre ile giriş yapar ve oturumu kaydeder. */
export async function login(server: string, email: string, password: string) {
  const base = normalizeServer(server)
  let res: Response
  try {
    res = await fetch(`${base}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new ApiError('Sunucuya ulaşılamıyor. Sunucu adresini ve internet bağlantınızı kontrol edin.', 0)
  }
  if (!res.ok) throw new ApiError(await readError(res), res.status)
  const data = (await res.json()) as TokenResponse
  await saveSession(base, data)
  return data
}

let refreshing: Promise<boolean> | null = null

async function refresh(): Promise<boolean> {
  const token = await storage.get(KEY_REFRESH)
  if (!token) return false
  const server = await getServer()
  try {
    const res = await fetch(`${server}/api/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    })
    if (res.status === 401) {
      await clearSession()
      return false
    }
    if (!res.ok) return false
    await saveSession(server, (await res.json()) as TokenResponse)
    return true
  } catch {
    return false
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

/** Oturumlu istek. 401 alırsa token'ı bir kez yeniler ve tekrar dener. */
export async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const server = await getServer()
  const token = await storage.get(KEY_ACCESS)
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`${server}/api${path}`, { ...init, headers })
  } catch {
    throw new ApiError('İnternet bağlantısı yok. Tekrar deneyin.', 0)
  }
  if (res.status === 401 && !retried) {
    refreshing ??= refresh().finally(() => { refreshing = null })
    if (await refreshing) return request<T>(path, init, true)
    onUnauthorized?.()
    throw new ApiError('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.', 401)
  }
  if (!res.ok) throw new ApiError(await readError(res), res.status)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}), headers }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export async function logout() {
  const token = await storage.get(KEY_REFRESH)
  const server = await getServer()
  if (token) {
    fetch(`${server}/api/auth/token/revoke`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: token }),
    }).catch(() => undefined)
  }
  await clearSession()
}
