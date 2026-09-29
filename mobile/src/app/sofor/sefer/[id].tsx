import { useState } from 'react'
import { Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Row } from '../../../components/ui'
import { ExpenseCard } from '../../../components/ExpenseCard'
import { OutboxBanner } from '../../../components/OutboxBanner'
import { api } from '../../../lib/api'
import { confirm } from '../../../lib/dialog'
import { sendCurrentLocation } from '../../../lib/location'
import { enqueue, useOutbox, type FilePayload, type StatusPayload } from '../../../lib/outbox'
import { pickPhoto } from '../../../lib/photos'
import { colors, formatDate, statusAction, statusColor, statusLabel } from '../../../lib/theme'
import type { Attachment, DriverProfile, DriverTrip, TripStatus } from '../../../lib/types'

/** Şoförün ilerletebileceği bir sonraki durum (sunucudaki kuralla aynı). */
const forward: Partial<Record<TripStatus, TripStatus>> = { Planned: 'Loaded', Loaded: 'OnRoad', OnRoad: 'Delivered' }

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tripId = Number(id)
  const [note, setNote] = useState('')
  const outbox = useOutbox().filter((i) => i.tripId === tripId)
  const trip = useQuery({ queryKey: ['trip', id], queryFn: () => api.get<DriverTrip>(`/driver/trips/${id}`) })
  const files = useQuery({ queryKey: ['trip', id, 'files'], queryFn: () => api.get<Attachment[]>(`/driver/trips/${id}/attachments`) })
  const profile = useQuery({ queryKey: ['me'], queryFn: () => api.get<DriverProfile>('/driver/me') })

  const t = trip.data
  if (!t) return <View style={s.center}><Text style={s.muted}>{trip.isError ? (trip.error as Error).message : 'Yükleniyor...'}</Text></View>

  // Gönderilmeyi bekleyen durum değişikliği varsa ekranda hemen onu göster.
  const pendingStatus = [...outbox].reverse().find((i) => i.type === 'status')
  const shownStatus = pendingStatus ? (pendingStatus.payload as StatusPayload).status : t.status
  const next = forward[shownStatus]

  const advance = (ns: TripStatus) => {
    if (ns === 'Delivered') return router.push({ pathname: '/sofor/teslim/[id]', params: { id } })
    confirm(statusAction[ns], `Sefer durumu "${statusLabel[ns]}" olarak güncellenecek. Onaylıyor musunuz?`, async () => {
      await enqueue({ type: 'status', tripId, label: statusAction[ns], payload: { status: ns, occurredAt: new Date().toISOString() } })
      sendCurrentLocation().catch(() => undefined)
    })
  }

  const addPhoto = async (camera: boolean) => {
    const photo = await pickPhoto(camera)
    if (!photo) return
    const payload: FilePayload = { kind: 'Photo', note: note.trim() || null, name: photo.name, mimeType: photo.mimeType }
    await enqueue({ type: 'photo', tripId, label: `Fotoğraf${payload.note ? ` (${payload.note})` : ''}`, payload, fileUri: photo.uri, fileMime: photo.mimeType })
    setNote('')
  }

  const mapsUrl = (address: string) => Platform.OS === 'ios'
    ? `http://maps.apple.com/?daddr=${encodeURIComponent(address)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
  const pendingFiles = outbox.filter((i) => i.type === 'photo' || i.type === 'signature')

  return (
    <View style={{ flex: 1 }}>
      <OutboxBanner count={outbox.length} failed={outbox.filter((i) => i.failed).length} />
      <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={s.customer}>{t.customerTitle}</Text>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge label={statusLabel[shownStatus]} color={statusColor[shownStatus]} />
              {pendingStatus && <Badge label="Gönderiliyor" color={colors.amber} />}
            </View>
          </View>
          <Row label="Yükleme" value={<Text style={s.link} onPress={() => Linking.openURL(mapsUrl(place(t.loadingCity, t.loadingAddress)))}>{place(t.loadingCity, t.loadingAddress)} ↗</Text>} />
          {t.loadingContact ? <Row label="Yüklemede" value={<Contact text={t.loadingContact} />} /> : null}
          <Row label="Teslimat" value={<Text style={s.link} onPress={() => Linking.openURL(mapsUrl(place(t.deliveryCity, t.deliveryAddress)))}>{place(t.deliveryCity, t.deliveryAddress)} ↗</Text>} />
          {t.deliveryContact ? <Row label="Teslimde" value={<Contact text={t.deliveryContact} />} /> : null}
          <Row label="Tarih" value={formatDate(t.loadingDate) + (t.deliveryDate ? ` → ${formatDate(t.deliveryDate)}` : '')} />
          <Row label="Araç" value={t.vehiclePlate + (t.trailerPlate ? ` · Dorse ${t.trailerPlate}` : '')} />
          {t.cargo ? <Row label="Yük" value={t.cargo} /> : null}
          {t.customerReference ? <Row label="Ref. No" value={t.customerReference} /> : null}
          {t.description ? <Row label="Açıklama" value={t.description} /> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            {t.customerPhone ? <Button title="Müşteriyi Ara" variant="outline" style={{ flex: 1 }}
              onPress={() => Linking.openURL(`tel:${t.customerPhone!.replace(/\s/g, '')}`)} /> : null}
            {profile.data?.companyPhone ? <Button title="Ofisi Ara" variant="outline" style={{ flex: 1 }}
              onPress={() => Linking.openURL(`tel:${profile.data!.companyPhone!.replace(/\s/g, '')}`)} /> : null}
          </View>
        </Card>

        {next && t.status !== 'Cancelled' && (
          <Card style={{ gap: 10 }}>
            <Text style={s.section}>Durum Güncelle</Text>
            <Button title={statusAction[next]} color={statusColor[next]} onPress={() => advance(next)} />
            {next === 'Delivered' && <Text style={s.hint}>Teslim ekranında teslim alanın adını, imzasını ve fotoğrafı alacaksınız.</Text>}
          </Card>
        )}

        {t.status !== 'Cancelled' && <ExpenseCard tripId={tripId} />}

        <Card style={{ gap: 10 }}>
          <Text style={s.section}>Fotoğraf / Belge</Text>
          <TextInput style={s.input} placeholder="Not (isteğe bağlı), ör. İmzalı irsaliye" value={note} onChangeText={setNote} accessibilityLabel="Not" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Fotoğraf Çek" onPress={() => addPhoto(true)} style={{ flex: 1 }} />
            <Button title="Galeriden" variant="outline" onPress={() => addPhoto(false)} style={{ flex: 1 }} />
          </View>
          {(files.data?.length ?? 0) + pendingFiles.length > 0 && (
            <View style={{ marginTop: 4 }}>
              {files.data?.map((f) => (
                <Text key={f.id} style={s.file}>• {f.kind === 'Signature' ? 'İmza' : f.fileName}{f.note ? ` — ${f.note}` : ''}</Text>
              ))}
              {pendingFiles.map((f) => <Text key={f.id} style={[s.file, { color: colors.amber }]}>• {f.label} (gönderiliyor)</Text>)}
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted },
  customer: { fontSize: 20, fontWeight: '800', color: colors.navy, flex: 1, marginRight: 8 },
  section: { fontSize: 17, fontWeight: '700', color: colors.navy },
  hint: { color: colors.muted, fontSize: 13 },
  link: { color: colors.brand, fontSize: 15, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  file: { color: colors.text, fontSize: 14, paddingVertical: 2 },
})

/** "Tuzla OSB" + il → "İstanbul / Tuzla OSB" (adres ili zaten içeriyorsa tekrar yazılmaz). */
function place(city: string | null | undefined, address: string) {
  return city && !address.toLocaleLowerCase('tr').includes(city.toLocaleLowerCase('tr')) ? `${city} / ${address}` : address
}

/** Serbest metindeki telefon numarasına dokununca arar ("Ali Bey 0532 111 22 33"). */
function Contact({ text }: { text: string }) {
  const phone = text.match(/(\+?90)?\s*0?\s*5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/)?.[0]
  if (!phone) return <Text>{text}</Text>
  return <Text style={s.link} onPress={() => Linking.openURL(`tel:${phone.replace(/[\s-]/g, '')}`)}>{text} ☎</Text>
}
