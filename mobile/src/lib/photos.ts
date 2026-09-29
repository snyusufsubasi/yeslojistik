import * as ImagePicker from 'expo-image-picker'
import { compressPhoto } from './image'
import { notify } from './dialog'

export interface PickedPhoto { uri: string; mimeType: string; name: string }

/** Kameradan ya da galeriden fotoğraf alır ve küçültür (en uzun kenar 1600 px). İptal edilirse null. */
export async function pickPhoto(camera: boolean): Promise<PickedPhoto | null> {
  const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) {
    notify('İzin gerekli', camera ? 'Kamera izni verilmedi.' : 'Galeri izni verilmedi.')
    return null
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, exif: false }
  const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts)
  const asset = res.canceled ? null : res.assets[0]
  if (!asset) return null
  const photo = await compressPhoto(asset.uri, asset.width, asset.height)
  const name = (asset.fileName ?? `foto-${Date.now()}`).replace(/\.\w+$/, '') + '.jpg'
  return { uri: photo.uri, mimeType: photo.mimeType, name }
}
