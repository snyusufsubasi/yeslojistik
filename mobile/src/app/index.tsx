import { useEffect, useState } from 'react'
import { AppState, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Stack, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { sendCurrentLocation, startTracking, stopTracking, type TrackingState } from '../lib/location'
import { colors, formatDate, statusColor, statusLabel } from '../lib/theme'
import type { DriverProfile, DriverTrip } from '../lib/types'

export default function TripsScreen() {
  const { signOut } = useAuth()
  const [scope, setScope] = useState<'active' | 'history'>('active')
  const [tracking, setTracking] = useState<TrackingState>('off')
  const profile = useQuery({ queryKey: ['me'], queryFn: () => api.get<DriverProfile>('/driver/me') })
  const trips = useQuery({
    queryKey: ['trips', scope],
    queryFn: () => api.get<DriverTrip[]>(`/driver/trips?scope=${scope}`),
    refetchInterval: 60_000,
  })
  const active = useQuery({ queryKey: ['trips', 'active'], queryFn: () => api.get<DriverTrip[]>('/driver/trips?scope=active') })
  const onTheRoad = active.data?.some((t) => t.status === 'Loaded' || t.status === 'OnRoad') ?? false

  // Yüklenmiş veya yoldaki sefer varsa konum paylaşımını aç, yoksa kapat.
  useEffect(() => {
    if (!active.data) return
    if (onTheRoad) startTracking().then(setTracking).catch(() => setTracking('off'))
    else stopTracking().then(() => setTracking('off'))
  }, [onTheRoad, active.data])

  // Arka plan izni yoksa: uygulama açıkken dakikada bir konum gönder.
  useEffect(() => {
    if (tracking !== 'foreground-only') return
    sendCurrentLocation().catch(() => undefined)
    const t = setInterval(() => { if (AppState.currentState === 'active') sendCurrentLocation().catch(() => undefined) }, 60_000)
    return () => clearInterval(t)
  }, [tracking])

  const list = trips.data ?? []

  return (
    <View style={s.screen}>
      <Stack.Screen options={{
        headerRight: () => <Pressable onPress={signOut} hitSlop={10} style={{ paddingHorizontal: 8 }} accessibilityRole="button"><Text style={{ color: '#fff', fontSize: 15 }}>Çıkış</Text></Pressable>,
      }} />
      <View style={s.header}>
        <Text style={s.hello}>Merhaba, {profile.data?.fullName ?? '...'}</Text>
        {profile.data?.vehiclePlate && <Text style={s.plate}>Aracınız: {profile.data.vehiclePlate}</Text>}
        <TrackingBanner state={tracking} />
      </View>
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
        refreshControl={<RefreshControl refreshing={trips.isRefetching} onRefresh={() => { trips.refetch(); active.refetch() }} />}
        ListEmptyComponent={
          <Text style={s.empty}>
            {trips.isLoading ? 'Yükleniyor...' : trips.isError ? (trips.error as Error).message : scope === 'active' ? 'Size atanmış aktif sefer yok.' : 'Son 60 günde teslim edilen sefer yok.'}
          </Text>
        }
        renderItem={({ item: t }) => (
          <Pressable onPress={() => router.push({ pathname: '/trip/[id]', params: { id: String(t.id) } })} accessibilityRole="button">
            <Card>
              <View style={s.cardTop}>
                <Text style={s.date}>{formatDate(t.loadingDate)}</Text>
                <Badge label={statusLabel[t.status]} color={statusColor[t.status]} />
              </View>
              <Text style={s.customer}>{t.customerTitle}</Text>
              <Text style={s.route}>{t.loadingAddress}</Text>
              <Text style={s.arrow}>↓</Text>
              <Text style={s.route}>{t.deliveryAddress}</Text>
              <Text style={s.meta}>{t.vehiclePlate}{t.attachmentCount > 0 ? ` · ${t.attachmentCount} dosya` : ''}</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  )
}

function TrackingBanner({ state }: { state: TrackingState }) {
  const map: Record<TrackingState, { text: string; color: string }> = {
    off: { text: 'Konum paylaşımı kapalı (aktif yolculuk yok)', color: '#94a3b8' },
    on: { text: '● Konum paylaşılıyor', color: '#34d399' },
    'foreground-only': { text: '● Konum yalnızca uygulama açıkken paylaşılıyor', color: '#fbbf24' },
    denied: { text: 'Konum izni verilmedi. Ayarlardan izin verin.', color: '#f87171' },
  }
  return <Text style={[s.banner, { color: map[state].color }]}>{map[state].text}</Text>
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, paddingHorizontal: 16, paddingBottom: 14 },
  hello: { color: '#fff', fontSize: 20, fontWeight: '700' },
  plate: { color: '#bfdbfe', marginTop: 2 },
  banner: { marginTop: 6, fontSize: 13 },
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
