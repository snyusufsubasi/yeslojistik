import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { api, request } from './api'

let registeredToken: string | null = null

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  })
}

/**
 * Bildirim iznini ister ve telefonun push adresini sunucuya kaydeder.
 * EAS proje kimliği yoksa (henüz `eas init` yapılmadıysa) sessizce vazgeçer.
 */
export async function registerForPush() {
  if (Platform.OS === 'web') return
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) return
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trips', {
      name: 'Seferler',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }
  let { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
  if (status !== 'granted') return
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  await api.post('/driver/push-token', { token, platform: Platform.OS })
  registeredToken = token
}

/** Çıkışta bu telefona artık bildirim gitmesin. */
export async function unregisterPush() {
  if (!registeredToken) return
  try {
    await request(`/driver/push-token?token=${encodeURIComponent(registeredToken)}`, { method: 'DELETE' })
  } catch {
    // oturum zaten kapanmış olabilir
  }
  registeredToken = null
}
