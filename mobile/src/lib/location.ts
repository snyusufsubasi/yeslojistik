import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { api, hasSession } from './api'
import type { LocationPing } from './types'

export const LOCATION_TASK = 'yl-location-task'
const QUEUE_KEY = 'yl.locationQueue'
const MAX_QUEUE = 2000

/** Gönderilemeyen konumları (çekim yok vb.) saklar, sonra toplu gönderir. */
async function enqueue(pings: LocationPing[]) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  const queue: LocationPing[] = raw ? JSON.parse(raw) : []
  queue.push(...pings)
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)))
}

let flushing = false

export async function flushQueue(extra: LocationPing[] = []) {
  if (flushing) {
    if (extra.length) await enqueue(extra)
    return
  }
  flushing = true
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    const queue: LocationPing[] = [...(raw ? JSON.parse(raw) : []), ...extra]
    if (queue.length === 0 || !(await hasSession())) return
    for (let i = 0; i < queue.length; i += 500) {
      await api.post('/driver/location', queue.slice(i, i + 500))
    }
    await AsyncStorage.removeItem(QUEUE_KEY)
  } catch {
    if (extra.length) await enqueue(extra)
  } finally {
    flushing = false
  }
}

export function toPing(l: Location.LocationObject): LocationPing {
  return {
    latitude: l.coords.latitude,
    longitude: l.coords.longitude,
    speedKmh: l.coords.speed != null && l.coords.speed >= 0 ? Math.round(l.coords.speed * 3.6) : null,
    heading: l.coords.heading ?? null,
    accuracy: l.coords.accuracy ?? null,
    recordedAt: new Date(l.timestamp).toISOString(),
  }
}

// Arka plan görevi modülün en üst seviyesinde tanımlanmalı.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return
  await flushQueue(data.locations.map(toPing))
})

export type TrackingState = 'off' | 'on' | 'denied' | 'foreground-only'

/**
 * Aktif sefer varken konum paylaşımını başlatır. Arka plan izni yoksa uygulama açıkken paylaşır.
 * Android'de bildirim çubuğunda "Konum paylaşılıyor" bildirimi görünür (zorunlu).
 */
export async function startTracking(): Promise<TrackingState> {
  const fg = await Location.requestForegroundPermissionsAsync()
  if (fg.status !== 'granted') return 'denied'
  let bg = await Location.getBackgroundPermissionsAsync()
  if (bg.status !== 'granted') bg = await Location.requestBackgroundPermissionsAsync()

  if (bg.status === 'granted') {
    if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60_000,
        distanceInterval: 200,
        deferredUpdatesInterval: 60_000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'YES Lojistik',
          notificationBody: 'Sefer sırasında konum paylaşılıyor.',
          notificationColor: '#0b2a55',
        },
      })
    }
    return 'on'
  }
  return 'foreground-only'
}

export async function stopTracking() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK)
  } catch {
    // görev zaten durmuş
  }
}

/** Uygulama açıkken anlık konumu gönderir (arka plan izni verilmediyse tek yol budur). */
export async function sendCurrentLocation() {
  const fg = await Location.getForegroundPermissionsAsync()
  if (fg.status !== 'granted') return
  const l = await Location.getLastKnownPositionAsync({ maxAge: 60_000 }) ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
  await flushQueue([toPing(l)])
}
