import { useState } from 'react'
import { Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Row } from '../../components/ui'
import { api } from '../../lib/api'
import { confirm, notify } from '../../lib/dialog'
import { sendCurrentLocation } from '../../lib/location'
import { colors, formatDate, statusAction, statusColor, statusLabel } from '../../lib/theme'
import type { Attachment, DriverTrip, TripStatus } from '../../lib/types'

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const trip = useQuery({ queryKey: ['trip', id], queryFn: () => api.get<DriverTrip>(`/driver/trips/${id}`) })
  const files = useQuery({ queryKey: ['trip', id, 'files'], queryFn: () => api.get<Attachment[]>(`/driver/trips/${id}/attachments`) })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['trip', id] })
    qc.invalidateQueries({ queryKey: ['trips'] })
  }

  const status = useMutation({
    mutationFn: (s: TripStatus) => api.post<DriverTrip>(`/driver/trips/${id}/status`, { status: s }),
    onSuccess: (t) => {
      qc.setQueryData(['trip', id], t)
      refresh()
      sendCurrentLocation().catch(() => undefined)
    },
    onError: (e) => notify('Hata', e instanceof Error ? e.message : 'İşlem yapılamadı.'),
  })

  const upload = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      const form = new FormData()
      const name = asset.fileName ?? `teslim-${Date.now()}.jpg`
      if (Platform.OS === 'web') {
        form.append('file', await (await fetch(asset.uri)).blob(), name)
      } else {
        // React Native FormData dosya nesnesi
        form.append('file', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob)
      }
      form.append('kind', 'Photo')
      if (note.trim()) form.append('note', note.trim())
      return api.post<Attachment>(`/driver/trips/${id}/attachments`, form)
    },
    onSuccess: () => {
      setNote('')
      refresh()
      notify('Yüklendi', 'Fotoğraf ofise gönderildi.')
    },
    onError: (e) => notify('Yüklenemedi', e instanceof Error ? e.message : 'Fotoğraf yüklenemedi.'),
  })

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return notify('İzin gerekli', camera ? 'Kamera izni verilmedi.' : 'Galeri izni verilmedi.')
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, exif: false }
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts)
    if (!res.canceled && res.assets[0]) upload.mutate(res.assets[0])
  }

  const confirmStatus = (s: TripStatus) =>
    confirm(statusAction[s], `Sefer durumu "${statusLabel[s]}" olarak güncellenecek. Onaylıyor musunuz?`, () => status.mutate(s))

  const t = trip.data
  if (!t) return <View style={s.center}><Text style={s.muted}>{trip.isError ? (trip.error as Error).message : 'Yükleniyor...'}</Text></View>

  const mapsUrl = (address: string) => Platform.OS === 'ios'
    ? `http://maps.apple.com/?daddr=${encodeURIComponent(address)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={s.customer}>{t.customerTitle}</Text>
          <Badge label={statusLabel[t.status]} color={statusColor[t.status]} />
        </View>
        <Row label="Yükleme" value={<Text style={s.link} onPress={() => Linking.openURL(mapsUrl(t.loadingAddress))}>{t.loadingAddress} ↗</Text>} />
        <Row label="Teslimat" value={<Text style={s.link} onPress={() => Linking.openURL(mapsUrl(t.deliveryAddress))}>{t.deliveryAddress} ↗</Text>} />
        <Row label="Tarih" value={formatDate(t.loadingDate) + (t.deliveryDate ? ` → ${formatDate(t.deliveryDate)}` : '')} />
        <Row label="Araç" value={t.vehiclePlate} />
        {t.description ? <Row label="Açıklama" value={t.description} /> : null}
        {t.customerPhone ? <Button title={`Müşteriyi Ara (${t.customerPhone})`} variant="outline" style={{ marginTop: 10 }}
          onPress={() => Linking.openURL(`tel:${t.customerPhone!.replace(/\s/g, '')}`)} /> : null}
      </Card>

      {t.nextStatuses.length > 0 && (
        <Card style={{ gap: 10 }}>
          <Text style={s.section}>Durum Güncelle</Text>
          {t.nextStatuses.map((ns) => (
            <Button key={ns} title={statusAction[ns]} color={statusColor[ns]} loading={status.isPending && status.variables === ns}
              onPress={() => confirmStatus(ns)} />
          ))}
        </Card>
      )}

      <Card style={{ gap: 10 }}>
        <Text style={s.section}>Teslim Fotoğrafı / Belge</Text>
        <TextInput style={s.input} placeholder="Not (isteğe bağlı), ör. İmzalı irsaliye" value={note} onChangeText={setNote} accessibilityLabel="Not" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Fotoğraf Çek" onPress={() => pick(true)} loading={upload.isPending} style={{ flex: 1 }} />
          <Button title="Galeriden" variant="outline" onPress={() => pick(false)} disabled={upload.isPending} style={{ flex: 1 }} />
        </View>
        {files.data && files.data.length > 0 && (
          <View style={{ marginTop: 4 }}>
            {files.data.map((f) => (
              <Text key={f.id} style={s.file}>• {f.fileName}{f.note ? ` — ${f.note}` : ''}</Text>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted },
  customer: { fontSize: 20, fontWeight: '800', color: colors.navy, flex: 1, marginRight: 8 },
  section: { fontSize: 17, fontWeight: '700', color: colors.navy },
  link: { color: colors.brand, fontSize: 15, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  file: { color: colors.text, fontSize: 14, paddingVertical: 2 },
})
