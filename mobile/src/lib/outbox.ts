import { useSyncExternalStore } from 'react'
import { AppState, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { Directory, File, Paths } from 'expo-file-system'
import { api, ApiError } from './api'
import type { DriverExpenseCategory, TripStatus } from './types'

/**
 * Çevrimdışı kuyruk: şoförün yaptığı her işlem (durum, masraf, fotoğraf, imza) önce telefona yazılır, sonra sırayla gönderilir.
 * Çekim yoksa işlem kaybolmaz; internet gelince kendiliğinden gider. Her işlemin kimliği sunucuya "Idempotency-Key" olarak
 * gider: aynı işlem iki kez ulaşırsa sunucu tek kayıt tutar.
 */

export type OutboxType = 'status' | 'expense' | 'photo' | 'signature'

export interface StatusPayload { status: TripStatus; occurredAt: string; receivedBy?: string | null; note?: string | null }
export interface ExpensePayload { category: DriverExpenseCategory; amount: number; liters: number | null; odometer: number | null; description: string | null }
export interface FilePayload { kind: 'Photo' | 'Signature' | 'Document'; note?: string | null; name: string; mimeType: string }

export interface OutboxItem {
  id: string
  type: OutboxType
  tripId: number
  /** Listede gösterilecek kısa açıklama ("Yola Çıktım", "Yakıt 4.500 TL"...) */
  label: string
  payload: StatusPayload | ExpensePayload | FilePayload
  /** Telefonda kalıcı dosya yolu (web önizlemesinde data: adresi). */
  file?: string | null
  fileMime?: string | null
  createdAt: string
  attempts: number
  nextAttemptAt?: number
  /** Kalıcı hata (4xx): kullanıcı "Tekrar dene" ya da "Sil" demeden gönderilmez. */
  failed?: boolean
  lastError?: string | null
}

const KEY = 'yl.outbox'
let items: OutboxItem[] = []
let loaded = false
const listeners = new Set<() => void>()
const syncedListeners = new Set<(item: OutboxItem) => void>()

function emit() {
  for (const l of listeners) l()
}

async function load() {
  if (loaded) return
  try {
    const raw = await AsyncStorage.getItem(KEY)
    items = raw ? (JSON.parse(raw) as OutboxItem[]) : []
  } catch {
    items = []
  }
  loaded = true
  emit()
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(items))
  emit()
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function outboxDir() {
  const dir = new Directory(Paths.document, 'outbox')
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true })
  return dir
}

/** Fotoğrafı kalıcı bir yere kopyalar; önbellekteki dosya işlem gönderilmeden silinse de kaybolmasın. */
async function keepFile(id: string, uri: string, ext: string): Promise<string> {
  if (Platform.OS === 'web') {
    if (uri.startsWith('data:')) return uri
    const blob = await (await fetch(uri)).blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }
  const target = new File(outboxDir(), `${id}.${ext}`)
  if (uri.startsWith('data:')) {
    target.create({ overwrite: true })
    target.write(uri.slice(uri.indexOf(',') + 1), { encoding: 'base64' })
  } else {
    await new File(uri).copy(target)
  }
  return target.uri
}

function dropFile(item: OutboxItem) {
  if (!item.file || Platform.OS === 'web') return
  try {
    const f = new File(item.file)
    if (f.exists) f.delete()
  } catch {
    // dosya zaten yok
  }
}

export async function enqueue(input: Omit<OutboxItem, 'id' | 'createdAt' | 'attempts' | 'file'> & { fileUri?: string | null; fileExt?: string }) {
  await load()
  const id = uuid()
  const { fileUri, fileExt, ...rest } = input
  const file = fileUri ? await keepFile(id, fileUri, fileExt ?? 'jpg') : null
  items = [...items, { ...rest, id, file, createdAt: new Date().toISOString(), attempts: 0 }]
  await persist()
  processQueue().catch(() => undefined)
  return id
}

export async function removeItem(id: string) {
  await load()
  const item = items.find((i) => i.id === id)
  if (item) dropFile(item)
  items = items.filter((i) => i.id !== id)
  await persist()
}

export async function retryItem(id: string) {
  await load()
  items = items.map((i) => (i.id === id ? { ...i, failed: false, lastError: null, nextAttemptAt: undefined } : i))
  await persist()
  await processQueue(true)
}

export async function clearOutbox() {
  await load()
  items.forEach(dropFile)
  items = []
  await persist()
}

export function pendingCount() {
  return items.length
}

async function fileForm(item: OutboxItem, fallbackName: string) {
  const form = new FormData()
  if (!item.file) throw new ApiError('Dosya bulunamadı.', 400)
  const mime = item.fileMime ?? 'image/jpeg'
  if (Platform.OS === 'web') {
    form.append('file', await (await fetch(item.file)).blob(), fallbackName)
  } else {
    if (!new File(item.file).exists) throw new ApiError('Dosya telefonda bulunamadı; işlemi silip yeniden ekleyin.', 400)
    form.append('file', { uri: item.file, name: fallbackName, type: mime } as unknown as Blob)
  }
  return form
}

async function send(item: OutboxItem) {
  const key = { 'Idempotency-Key': item.id }
  if (item.type === 'status') {
    await api.post(`/driver/trips/${item.tripId}/status`, item.payload)
  } else if (item.type === 'expense') {
    const exp = await api.post<{ id: number }>(`/driver/trips/${item.tripId}/expenses`, item.payload, key)
    if (item.file) await api.post(`/driver/expenses/${exp.id}/receipt`, await fileForm(item, `fis-${exp.id}.jpg`))
  } else {
    const p = item.payload as FilePayload
    const form = await fileForm(item, p.name)
    form.append('kind', p.kind)
    if (p.note) form.append('note', p.note)
    await api.post(`/driver/trips/${item.tripId}/attachments`, form, key)
  }
}

const transient = (e: unknown) => !(e instanceof ApiError) || e.status === 0 || e.status >= 500 || [401, 408, 429].includes(e.status)

let running: Promise<void> | null = null

/** Kuyruğu sırayla gönderir. Aynı seferin işlemleri sırasını korur (önce fotoğraf/imza, sonra "Teslim Edildi"). */
export function processQueue(force = false): Promise<void> {
  running ??= run(force).finally(() => { running = null })
  return running
}

/** force: internet yeni geldiyse ya da kullanıcı yenilediyse bekleme süresini beklemeden dener. */
async function run(force: boolean) {
  await load()
  const blockedTrips = new Set<number>()
  for (const item of [...items]) {
    if (blockedTrips.has(item.tripId)) continue
    if (item.failed || (!force && item.nextAttemptAt && item.nextAttemptAt > Date.now())) {
      blockedTrips.add(item.tripId)
      continue
    }
    try {
      await send(item)
      dropFile(item)
      items = items.filter((i) => i.id !== item.id)
      await persist()
      for (const l of syncedListeners) l(item)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gönderilemedi.'
      const attempts = item.attempts + 1
      const retry = transient(e)
      items = items.map((i) => i.id === item.id ? {
        ...i, attempts, lastError: message, failed: !retry,
        nextAttemptAt: retry ? Date.now() + Math.min(5_000 * 2 ** Math.min(attempts, 6), 5 * 60_000) : undefined,
      } : i)
      await persist()
      blockedTrips.add(item.tripId)
      // Bağlantı yoksa diğer seferleri de denemeye gerek yok.
      if (e instanceof ApiError && e.status === 0) return
    }
  }
}

/** Bir işlem gönderildiğinde çağrılır (ekranları yenilemek için). */
export function onSynced(fn: (item: OutboxItem) => void) {
  syncedListeners.add(fn)
  return () => { syncedListeners.delete(fn) }
}

let started = false
/** Uygulama açılışında bir kez: internet gelince, uygulama öne gelince ve 30 sn'de bir kuyruğu dener. */
export function startOutbox() {
  if (started) return
  started = true
  load().then(() => processQueue()).catch(() => undefined)
  NetInfo.addEventListener((s) => { if (s.isConnected) processQueue(true).catch(() => undefined) })
  AppState.addEventListener('change', (s) => { if (s === 'active') processQueue(true).catch(() => undefined) })
  setInterval(() => { if (items.length) processQueue().catch(() => undefined) }, 30_000)
}

function subscribe(l: () => void) {
  listeners.add(l)
  load().catch(() => undefined)
  return () => { listeners.delete(l) }
}

/** Bekleyen işlemler (ekranda şerit, rozet ve "Bekleyenler" listesi için). */
export function useOutbox(): OutboxItem[] {
  return useSyncExternalStore(subscribe, () => items, () => items)
}
