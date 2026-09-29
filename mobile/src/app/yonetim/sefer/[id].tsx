import { useState } from 'react'
import { Linking, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Row } from '../../../components/ui'
import { tl, trDate } from '../../../components/office'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { confirm, notify } from '../../../lib/dialog'
import { sharePdf, shareFile } from '../../../lib/files'
import type { Trip } from '../../../lib/officeTypes'
import { can } from '../../../lib/permissions'
import { colors, statusColor, statusLabel } from '../../../lib/theme'
import type { TripStatus } from '../../../lib/types'

interface Attachment { id: number; kind: 'Photo' | 'Document' | 'Signature'; fileName: string; contentType: string; note?: string | null; uploadedBy?: string | null }
interface TripEvent { status: TripStatus; occurredAt: string; userName?: string | null; source: string; note?: string | null }

const actionLabel: Record<TripStatus, string> = { Planned: 'Planlandı yap', Loaded: 'Yüklendi yap', OnRoad: 'Yolda yap', Delivered: 'Teslim edildi yap', Cancelled: 'İptal et' }

/** Ofis için sefer detayı: bilgiler, durum ilerletme, takip linki paylaşımı, sevk belgesi, dosyalar ve durum geçmişi. */
export default function OfficeTrip() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { role } = useAuth()
  const qc = useQueryClient()
  const [receivedBy, setReceivedBy] = useState('')
  const [busy, setBusy] = useState(false)
  const trip = useQuery({ queryKey: ['trip', 'office', id], queryFn: () => api.get<Trip>(`/trips/${id}`) })
  const files = useQuery({ queryKey: ['trip', 'office', id, 'files'], queryFn: () => api.get<Attachment[]>(`/trips/${id}/attachments`) })
  const events = useQuery({ queryKey: ['trip', 'office', id, 'events'], queryFn: () => api.get<TripEvent[]>(`/trips/${id}/events`) })
  const t = trip.data
  if (!t) return <View style={s.center}><Text style={s.muted}>{trip.isError ? (trip.error as Error).message : 'Yükleniyor...'}</Text></View>
  const ops = can(role, 'operations')
  const money = can(role, 'accounting')

  const setStatus = (st: TripStatus) => confirm(actionLabel[st], `Sefer "${statusLabel[st]}" olarak güncellenecek.`, async () => {
    setBusy(true)
    try {
      await api.post(`/trips/${id}/status`, { status: st, receivedBy: st === 'Delivered' ? receivedBy.trim() || null : null })
      await qc.invalidateQueries({ queryKey: ['trip', 'office', id] })
      await qc.invalidateQueries({ queryKey: ['trips'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      notify('Güncellenemedi', e instanceof Error ? e.message : 'Tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  })

  const shareLink = async (whatsapp: boolean) => {
    try {
      const link = await api.post<{ url: string }>(`/trips/${id}/tracking-link`)
      const message = `${t.customerTitle} – sevkiyatınızı buradan takip edebilirsiniz: ${link.url}`
      if (whatsapp) await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`)
      else await Share.share({ message })
    } catch (e) {
      notify('Link oluşturulamadı', e instanceof Error ? e.message : 'Tekrar deneyin.')
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: `Sefer #${t.id}` }} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={s.customer}>{t.customerTitle}</Text>
          <Badge label={statusLabel[t.status]} color={statusColor[t.status]} />
        </View>
        <Row label="Yükleme" value={`${t.loadingCity ? t.loadingCity + ' / ' : ''}${t.loadingAddress}`} />
        <Row label="Teslimat" value={`${t.deliveryCity ? t.deliveryCity + ' / ' : ''}${t.deliveryAddress}`} />
        <Row label="Tarih" value={trDate(t.loadingDate) + (t.deliveryDate ? ` → ${trDate(t.deliveryDate)}` : '')} />
        <Row label="Araç" value={`${t.vehiclePlate}${t.trailerPlate ? ` · Dorse ${t.trailerPlate}` : ''}${t.vehicleOwnership === 'Rented' ? ' (kiralık)' : ''}`} />
        <Row label="Şoför" value={t.driverName} />
        {t.carrierSupplierTitle ? <Row label="Taşeron" value={t.carrierSupplierTitle} /> : null}
        {t.cargoType ? <Row label="Yük" value={t.cargoType} /> : null}
        {t.customerReference ? <Row label="Ref. No" value={t.customerReference} /> : null}
        {t.loadingContact ? <Row label="Yüklemede" value={t.loadingContact} /> : null}
        {t.deliveryContact ? <Row label="Teslimde" value={t.deliveryContact} /> : null}
        {t.receivedBy ? <Row label="Teslim alan" value={t.receivedBy} /> : null}
        {money ? <Row label="Satış / Maliyet" value={`${tl(t.salePrice)} / ${tl(t.vehicleCost)}`} /> : null}
        {money ? <Row label="Kâr" value={<Text style={{ fontWeight: '700', color: t.profit < 0 ? colors.red : colors.green }}>{tl(t.profit)}</Text>} /> : null}
        {t.invoiceNo ? <Row label="Fatura" value={t.invoiceNo} /> : null}
        {t.description ? <Row label="Açıklama" value={t.description} /> : null}
      </Card>

      {ops && t.nextStatuses.length > 0 && (
        <Card style={{ gap: 10 }}>
          <Text style={s.section}>Durum</Text>
          {t.nextStatuses.includes('Delivered') && (
            <TextInput style={s.input} value={receivedBy} onChangeText={setReceivedBy} placeholder="Teslim alan (isteğe bağlı)" accessibilityLabel="Teslim alan" />
          )}
          {t.nextStatuses.map((st) => (
            <Button key={st} title={actionLabel[st]} color={st === 'Cancelled' ? colors.red : statusColor[st]} variant={st === 'Cancelled' ? 'outline' : 'solid'}
              onPress={() => setStatus(st)} loading={busy} />
          ))}
        </Card>
      )}

      <Card style={{ gap: 10 }}>
        <Text style={s.section}>Paylaş</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Takip linki (WhatsApp)" color={colors.green} style={{ flex: 1 }} onPress={() => shareLink(true)} />
          <Button title="Diğer" variant="outline" onPress={() => shareLink(false)} />
        </View>
        <Button title="Sevk Belgesi (PDF)" variant="outline" onPress={() => sharePdf(`/trips/${id}/waybill`, `sevk-${id}.pdf`)
          .catch((e) => notify('Açılamadı', e instanceof Error ? e.message : 'Tekrar deneyin.'))} />
        {ops && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Düzenle" variant="outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/yonetim/sefer/yeni', params: { id } })} />
            <Button title="Kopyala" variant="outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/yonetim/sefer/yeni', params: { copy: id } })} />
          </View>
        )}
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={s.section}>Dosyalar / Fotoğraflar</Text>
        {files.data?.length === 0 && <Text style={s.muted}>Henüz dosya yok.</Text>}
        {files.data?.map((f) => (
          <Text key={f.id} style={s.link} onPress={() => shareFile(`/attachments/${f.id}`, f.fileName, f.contentType)
            .catch((e) => notify('Açılamadı', e instanceof Error ? e.message : 'Tekrar deneyin.'))}>
            {f.kind === 'Signature' ? 'İmza' : f.fileName}{f.note ? ` — ${f.note}` : ''}{f.uploadedBy ? ` (${f.uploadedBy})` : ''} ↗
          </Text>
        ))}
      </Card>

      <Card style={{ gap: 4 }}>
        <Text style={s.section}>Durum geçmişi</Text>
        {events.data?.map((e, i) => (
          <Text key={i} style={s.text}>
            {new Date(e.occurredAt).toLocaleString('tr-TR')} · {statusLabel[e.status]}{e.userName ? ` · ${e.userName}` : ''}{e.source === 'Driver' ? ' (şoför)' : ''}{e.note ? ` · ${e.note}` : ''}
          </Text>
        ))}
      </Card>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  customer: { fontSize: 19, fontWeight: '800', color: colors.navy, flex: 1, marginRight: 8 },
  section: { fontSize: 17, fontWeight: '700', color: colors.navy },
  text: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  link: { fontSize: 14, color: colors.brand, paddingVertical: 3 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#fff' },
})
