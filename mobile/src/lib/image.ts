import { Platform } from 'react-native'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

const MAX_SIDE = 1600

/**
 * Fotoğrafı yüklemeden önce küçültür: en uzun kenar 1600 px, JPEG %70 (~250–450 KB).
 * Başarısız olursa (ör. web önizlemesi) orijinal dosya kullanılır.
 */
export async function compressPhoto(uri: string, width?: number, height?: number): Promise<{ uri: string; mimeType: string }> {
  if (Platform.OS === 'web') return { uri, mimeType: 'image/jpeg' }
  try {
    const ctx = ImageManipulator.manipulate(uri)
    const longest = Math.max(width ?? 0, height ?? 0)
    if (longest > MAX_SIDE) {
      if ((width ?? 0) >= (height ?? 0)) ctx.resize({ width: MAX_SIDE })
      else ctx.resize({ height: MAX_SIDE })
    }
    const image = await ctx.renderAsync()
    const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG })
    return { uri: result.uri, mimeType: 'image/jpeg' }
  } catch {
    return { uri, mimeType: 'image/jpeg' }
  }
}
