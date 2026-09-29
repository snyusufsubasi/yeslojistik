import { Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { authHeaders, getServer } from './api'

/**
 * PDF'i (ekstre, sevk belgesi) yetkili istekle indirir ve paylaşım menüsünü açar (WhatsApp, e-posta, yazdır...).
 * Web önizlemesinde yeni sekmede açılır.
 */
export async function sharePdf(path: string, fileName: string) {
  return shareFile(path, fileName, 'application/pdf')
}

/** Yetkili istekle dosya indirir ve paylaşım menüsünü açar (web'de yeni sekme). */
export async function shareFile(path: string, fileName: string, mimeType: string) {
  const url = `${await getServer()}/api${path}`
  const headers = await authHeaders()
  if (Platform.OS === 'web') {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Dosya alınamadı (${res.status}).`)
    globalThis.open?.(URL.createObjectURL(await res.blob()), '_blank')
    return
  }
  const target = new File(Paths.cache, fileName)
  const file = await File.downloadFileAsync(url, target, { headers, idempotent: true })
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName })
}
