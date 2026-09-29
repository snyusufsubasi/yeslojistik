import { useEffect, useState } from 'react'
import { AppState, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Stack, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { OutboxBanner } from '../../components/OutboxBanner'
import { Badge, Card } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { CONSENT_ASKED_KEY, CONSENT_VERSION } from '../../lib/consent'
import { confirm } from '../../lib/dialog'
import { sendCurrentLocation, startTracking, stopTracking, type TrackingState } from '../../lib/location'
import { registerForPush } from '../../lib/notifications'
import { clearOutbox, pendingCount, processQueue, useOutbox } from '../../lib/outbox'
import { storage } from '../../lib/storage'
import { colors, formatDate, statusColor, statusLabel } from '../../lib/theme'
import type { DriverProfile, DriverTrip } from '../../lib/types'

export default function TripsScreen() {
  const { signOut } = useAuth()
  const [scope, setScope] = useState<'active' | 'history'>('active')
  const [tracking, setTracking] = useState<TrackingState>('off')
  const outbox = useOutbox()
  const profile = useQuery({ queryKey: ['me'], queryFn: () => api.get<DriverProfile>('/driver/me') })
  const trips = useQuery({
    queryKey: ['trips', scope],
    queryFn: () => api.get<DriverTrip[]>(`/driver/trips?scope=${scope}`),
    refetchInterval: 60_000,
  })
  const active = useQuery({ queryKey: ['trips', 'active'], queryFn: () => api.get<DriverTrip[]>('/driver/trips?scope=active') })
  const onTheRoad = active.data?.some((t) => t.status === 'Loaded' || t.status === 'OnRoad') ?? false
  const consent = !!profile.data?.locationConsentAt

  useEffect(() => { registerForPush().catch(() => undefined) }, [])

  // Konum izni istenmeden önce açıklama ve rıza ekranı (bir kez; "Şimdi değil" dendiyse tekrar sorulmaz).
  useEffect(() => {
    if (!profile.data || profile.data.locationConsentAt) return
    storage.get(CONSENT_ASKED_KEY).then((v) => { if (v !== CONSENT_VERSION) router.push('/izin') })
  }, [profile.data])

  // Yüklenmiş veya yoldaki sefer varsa ve şoför rıza verdiyse konum paylaşımını aç, yoksa kapat.
  useEffect(() => {
    if (!active.data || !profile.data) return
    if (onTheRoad && consent) startTracking().then(setTracking).catch(() => setTracking('off'))
    else stopTracking().then(() => setTracking(consent ? 'off' : 'no-consent'))
  }, [onTheRoad, consent, active.data, profile.data])

  // Arka plan izni yoksa: uygulama açıkken dakikada bir konum gönder.
  useEffect(() => {
    if (tracking !== 'foreground-only') return
    sendCurrentLocation().catch(() => undefined)
    const t = setInterval(() => { if (AppState.currentState === 'active') sendCurrentLocation().catch(() => undefined) }, 60_000)
    return () => clearInterval(t)
  }, [tracking])

  const exit = () => {
    const n = pendingCount()
    if (n === 0) return signOut()
    confirm('Gönderilmemiş işlemler var', `${n} işlem henüz ofise ulaşmadı. Çıkış yaparsanız silinecek. Yine de çıkılsın mı?`,
      () => { clearOutbox().then(signOut) })
  }

  const list = trips.data ?? []
  const warnings = documentWarnings(profile.data)

  return (
    <View style={s.screen}>
      <Stack.Screen options={{
        headerRight: () => <Pressable onPress={exit} hitSlop={10} style={{ paddingHorizontal: 8 }} accessibilityRole="button"><Text style={{ color: '#fff', fontSize: 15 }}>Çıkış</Text></Pressable>,
      }} />
      <View style={s.header}>
        <Text style={s.hello}>Merhaba, {profile.data?.fullName ?? '...'}</Text>
        {profile.data?.vehiclePlate && <Text style={s.plate}>Aracınız: {profile.data.vehiclePlate}</Text>}
        <TrackingBanner state={tracking} onPress={tracking === 'no-consent' ? () => router.push('/izin') : undefined} />
        {profile.data?.companyPhone ? (
          <Text style={s.office} onPress={() => Linking.openURL(`tel:${profile.data!.companyPhone!.replace(/\s/g, '')}`)}>☎ Ofisi ara</Text>
        ) : null}
      </View>
      <OutboxBanner count={outbox.length} failed={outbox.filter((i) => i.failed).length} />
      {warnings.map((w) => <Text key={w} style={s.warning}>⚠ {w}</Text>)}
      <View style={s.tabs}>
        {(['active', 'history'] as const).map((k) => (
          <Pressable key={k} onPress={() => setScope(k)} style={[s.tab, scope === k && s.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: scope === k }}>
            <Text style={[s.tabText, scope === k && s.tabTextActive]}>{k === 'active' ? 'Aktif Seferler' : 'Geçmiş'}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={list}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={trips.isRefetching} onRefresh={() => { processQueue(true); trips.refetch(); active.refetch(); profile.refetch() }} />}
        ListEmptyComponent={
          <Text style={s.empty}>
            {trips.isLoading ? 'Yükleniyor...' : trips.isError ? (trips.error as Error).message : scope === 'active' ? 'Size atanmış aktif sefer yok.' : 'Son 60 günde teslim edilen sefer yok.'}
          </Text>
        }
        renderItem={({ item: t }) => {
          const pending = outbox.some((i) => i.tripId === t.id)
          return (
            <Pressable onPress={() => router.push({ pathname: '/sofor/sefer/[id]', params: { id: String(t.id) } })} accessibilityRole="button">
              <Card>
                <View style={s.cardTop}>
                  <Text style={s.date}>{formatDate(t.loadingDate)}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {pending && <Badge label="Gönderiliyor" color={colors.amber} />}
                    <Badge label={statusLabel[t.status]} color={statusColor[t.status]} />
                  </View>
                </View>
                <Text style={s.customer}>{t.customerTitle}</Text>
                <Text style={s.route}>{t.loadingCity ? `${t.loadingCity} · ` : ''}{t.loadingAddress}</Text>
                <Text style={s.arrow}>↓</Text>
                <Text style={s.route}>{t.deliveryCity ? `${t.deliveryCity} · ` : ''}{t.deliveryAddress}</Text>
                <Text style={s.meta}>{t.vehiclePlate}{t.cargo ? ` · ${t.cargo}` : ''}{t.attachmentCount > 0 ? ` · ${t.attachmentCount} dosya` : ''}</Text>
              </Card>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

/** Ehliyet, SRC, psikoteknik bitişine 30 gün kala uyarı. */
function documentWarnings(p?: DriverProfile) {
  if (!p) return []
  const out: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const [label, value] of [['Ehliyetinizin', p.licenseExpiry], ['SRC belgenizin', p.srcExpiry], ['Psikoteknik belgenizin', p.psychotechnicExpiry]] as const) {
    if (!value) continue
    const days = Math.round((new Date(value + 'T00:00:00').getTime() - today.getTime()) / 86_400_000)
    if (days < 0) out.push(`${label} süresi ${-days} gün önce doldu (${formatDate(value)}).`)
    else if (days <= 30) out.push(`${label} süresi ${days} gün sonra doluyor (${formatDate(value)}).`)
  }
  return out
}

function TrackingBanner({ state, onPress }: { state: TrackingState; onPress?: () => void }) {
  const map: Record<TrackingState, { text: string; color: string }> = {
    off: { text: 'Konum paylaşımı kapalı (aktif yolculuk yok)', color: '#94a3b8' },
    on: { text: '● Konum paylaşılıyor', color: '#34d399' },
    'foreground-only': { text: '● Konum yalnızca uygulama açıkken paylaşılıyor', color: '#fbbf24' },
    denied: { text: 'Konum izni verilmedi. Ayarlardan izin verin.', color: '#f87171' },
    'no-consent': { text: 'Konum paylaşımına onay vermediniz. Onay vermek için dokunun.', color: '#fbbf24' },
  }
  return <Text style={[s.banner, { color: map[state].color }]} onPress={onPress}>{map[state].text}</Text>
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: 16, paddingBottom: 14 },
  hello: { color: '#fff', fontSize: 20, fontWeight: '700' },
  plate: { color: '#bfdbfe', marginTop: 2 },
  banner: { marginTop: 6, fontSize: 13 },
  office: { marginTop: 6, color: '#bfdbfe', fontSize: 15, fontWeight: '600' },
  warning: { backgroundColor: '#fef3c7', color: '#92400e', paddingHorizontal: 16, paddingVertical: 8, fontSize: 14 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabActive: { borderColor: colors.brand },
  tabText: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  tabTextActive: { color: colors.brand },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  date: { color: colors.muted, fontSize: 14 },
  customer: { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  route: { fontSize: 16, color: colors.text },
  arrow: { color: colors.muted, marginVertical: 1 },
  meta: { marginTop: 8, color: colors.muted, fontSize: 13 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 16 },
})
