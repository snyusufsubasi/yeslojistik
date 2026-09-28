import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

export const api = axios.create({ baseURL: '/api', withCredentials: true })

export const SESSION_EXPIRED_EVENT = 'yl:session-expired'

let refreshing: Promise<void> | null = null

// Erişim token'ı 15 dakikada dolar; 401 alınca bir kez sessizce yenileyip isteği tekrarlarız.
api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
  const url = config?.url ?? ''
  if (error.response?.status !== 401 || !config || config._retried || url.startsWith('/auth/')) {
    return Promise.reject(error)
  }
  config._retried = true
  try {
    refreshing ??= api.post('/auth/refresh').then(() => undefined).finally(() => { refreshing = null })
    await refreshing
  } catch {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    return Promise.reject(error)
  }
  return api.request(config)
})

interface ProblemDetails {
  title?: string
  errors?: Record<string, string[]>
}

/** Sunucu hatasını kullanıcıya gösterilecek Türkçe mesaja çevirir. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ProblemDetails | undefined
    if (data?.errors) {
      const first = Object.values(data.errors)[0]?.[0]
      if (first) return first
    }
    if (data?.title) return data.title
    if (!err.response) return 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.'
    if (err.response.status === 403) return 'Bu işlem için yetkiniz yok.'
  }
  return 'Beklenmeyen bir hata oluştu.'
}

/** Alan bazlı doğrulama hatalarını döner (ör. { title: 'Müşteri ünvanı zorunlu.' }). */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!axios.isAxiosError(err)) return {}
  const data = err.response?.data as ProblemDetails | undefined
  const out: Record<string, string> = {}
  for (const [key, msgs] of Object.entries(data?.errors ?? {})) {
    const k = key.replace(/^\$\./, '')
    out[k.charAt(0).toLowerCase() + k.slice(1)] = msgs[0]
  }
  return out
}

function cleanParams(params?: object) {
  if (!params) return undefined
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

export async function get<T>(url: string, params?: object): Promise<T> {
  return (await api.get<T>(url, { params: cleanParams(params) })).data
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  return (await api.post<T>(url, body)).data
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  return (await api.put<T>(url, body)).data
}

export async function del(url: string): Promise<void> {
  await api.delete(url)
}

/** Excel/PDF gibi dosyaları indirir. */
export async function download(url: string, params?: object, fallbackName = 'dosya') {
  const res = await api.get<Blob>(url, { params: cleanParams(params), responseType: 'blob' })
  const disposition = String(res.headers['content-disposition'] ?? '')
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition)
  const name = match ? decodeURIComponent(match[1] ?? match[2]) : fallbackName
  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

/**
 * PDF'i yeni sekmede açar (açılır pencere engellenirse indirir).
 * Sekme doğrudan API adresine gider; oturum çerezi aynı sitede gönderilir. blob: adresine yönlendirme
 * yeni Chrome sürümlerinde boş sekme bırakabildiği için kullanılmaz.
 */
export async function openPdf(url: string, fallbackName: string) {
  // Tıklamayla aynı anda açılmalı, yoksa tarayıcı açılır pencereyi engeller.
  const win = window.open('', '_blank')
  try {
    // Oturumun süresi dolmuşsa önce yenilensin; PDF isteği aynı çerezi kullanır.
    await api.get('/auth/me')
    if (win) win.location.href = `${api.defaults.baseURL}${url}`
    else await download(url, { download: true }, fallbackName)
  } catch (e) {
    win?.close()
    throw e
  }
}
