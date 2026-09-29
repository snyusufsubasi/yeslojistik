import { useState } from 'react'
import { Image, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Card } from '../../../components/ui'
import { SignaturePad } from '../../../components/SignaturePad'
import { api } from '../../../lib/api'
import { notify } from '../../../lib/dialog'
import { sendCurrentLocation } from '../../../lib/location'
import { enqueue } from '../../../lib/outbox'
import { pickPhoto, type PickedPhoto } from '../../../lib/photos'
import { colors } from '../../../lib/theme'
import type { DriverProfile, DriverTrip } from '../../../lib/types'

/**
 * Teslim: teslim alanın adı, imzası, fotoğraf(lar) ve not. "Teslimi Tamamla" denince hepsi çevrimdışı kuyruğa girer
 * (önce fotoğraflar ve imza, en son "Teslim Edildi"); çekim yoksa internet gelince gönderilir.
 */
export default function DeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tripId = Number(id)
  const [receivedBy, setReceivedBy] = useState('')
  const [note, setNote] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [scroll, setScroll] = useState(true)
  const [saving, setSaving] = useState(false)
  const trip = useQuery({ queryKey: ['trip', id], queryFn: () => api.get<DriverTrip>(`/driver/trips/${id}`) })
  const profile = useQuery({ queryKey: ['me'], queryFn: () => api.get<DriverProfile>('/driver/me') })
  const needPhoto = !!profile.data?.requireDeliveryPhoto
  const needSignature = !!profile.data?.requireDeliverySignature && Platform.OS !== 'web'

  const add = async (camera: boolean) => {
    const p = await pickPhoto(camera)
    if (p) setPhotos((list) => [...list, p])
  }

  const finish = async () => {
    if (!receivedBy.trim()) return notify('Eksik bilgi', 'Teslim alan kişinin adını soyadını yazın.')
    if (needPhoto && photos.length === 0) return notify('Fotoğraf gerekli', 'Firmanız teslimde en az bir fotoğraf istiyor.')
    if (needSignature && !signature) return notify('İmza gerekli', 'Teslim alan kişinin imzasını alın.')
    setSaving(true)
    try {
      const who = receivedBy.trim()
      for (const [i, p] of photos.entries()) {
        await enqueue({ type: 'photo', tripId, label: `Teslim fotoğrafı ${i + 1}`, fileUri: p.uri, fileMime: p.mimeType,
          payload: { kind: 'Photo', note: `Teslim - ${who}`, name: p.name, mimeType: p.mimeType } })
      }
      if (signature) {
        await enqueue({ type: 'signature', tripId, label: `İmza (${who})`, fileUri: signature, fileExt: 'png', fileMime: 'image/png',
          payload: { kind: 'Signature', note: `Teslim alan: ${who}`, name: `imza-${tripId}.png`, mimeType: 'image/png' } })
      }
      await enqueue({ type: 'status', tripId, label: 'Teslim Ettim',
        payload: { status: 'Delivered', occurredAt: new Date().toISOString(), receivedBy: who, note: note.trim() || null } })
      sendCurrentLocation().catch(() => undefined)
      router.back()
    } catch (e) {
      notify('Kaydedilemedi', e instanceof Error ? e.message : 'Tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }} scrollEnabled={scroll} keyboardShouldPersistTaps="handled">
      {trip.data && <Text style={s.title}>{trip.data.customerTitle} · {trip.data.deliveryAddress}</Text>}
      <Card style={{ gap: 8 }}>
        <Text style={s.label}>Teslim alan (ad soyad) *</Text>
        <TextInput style={s.input} value={receivedBy} onChangeText={setReceivedBy} placeholder="Ör. Ayşe Yılmaz" accessibilityLabel="Teslim alan" autoCapitalize="words" />
        <Text style={s.label}>İmza{needSignature ? ' *' : ''}</Text>
        <SignaturePad onChange={setSignature} onDrawing={(d) => setScroll(!d)} />
        {signature && <Text style={s.ok}>✓ İmza alındı</Text>}
      </Card>
      <Card style={{ gap: 8 }}>
        <Text style={s.label}>Teslim fotoğrafı{needPhoto ? ' *' : ' (isteğe bağlı)'}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Fotoğraf Çek" onPress={() => add(true)} style={{ flex: 1 }} />
          <Button title="Galeriden" variant="outline" onPress={() => add(false)} style={{ flex: 1 }} />
        </View>
        {photos.length > 0 && (
          <View style={s.thumbs}>
            {photos.map((p, i) => (
              <Image key={p.uri + i} source={{ uri: p.uri }} style={s.thumb} accessibilityLabel={`Teslim fotoğrafı ${i + 1}`} />
            ))}
          </View>
        )}
        <Text style={s.label}>Not</Text>
        <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Ör. 2 koli hasarlı teslim edildi" accessibilityLabel="Teslim notu" />
      </Card>
      <Button title="Teslimi Tamamla" color={colors.green} onPress={finish} loading={saving} />
      <Text style={s.hint}>İnternet yoksa teslim telefona kaydedilir ve çekim gelince ofise gönderilir.</Text>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#fff' },
  ok: { color: colors.green, fontWeight: '600' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.border },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center' },
})
