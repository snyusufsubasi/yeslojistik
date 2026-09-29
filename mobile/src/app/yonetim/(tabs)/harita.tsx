import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../../components/ui'
import { VehicleMap } from '../../../components/VehicleMap'
import { api } from '../../../lib/api'
import type { VehicleLocation } from '../../../lib/officeTypes'
import { colors } from '../../../lib/theme'

const vehicleStatus = { Available: ['Müsait', colors.green], OnRoad: ['Yolda', colors.amber], Maintenance: ['Bakımda', colors.muted] } as const

/** Araç haritası: 30 saniyede bir yenilenir. Araca dokununca aktif seferi açılır. */
export default function OfficeMap() {
  const [selected, setSelected] = useState<number | null>(null)
  const q = useQuery({ queryKey: ['tracking', 'vehicles'], queryFn: () => api.get<VehicleLocation[]>('/tracking/vehicles'), refetchInterval: 30_000 })
  const list = [...(q.data ?? [])].sort((a, b) => (a.vehicleId === selected ? -1 : b.vehicleId === selected ? 1 : 0))
  return (
    <View style={s.screen}>
      <VehicleMap vehicles={q.data ?? []} onSelect={setSelected} />
      <FlatList
        data={list}
        keyExtractor={(v) => String(v.vehicleId)}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />}
        ListEmptyComponent={<Text style={s.muted}>{q.isLoading ? 'Yükleniyor...' : 'Araç yok.'}</Text>}
        renderItem={({ item: v }) => (
          <Pressable disabled={!v.activeTripId} onPress={() => router.push({ pathname: '/yonetim/sefer/[id]', params: { id: String(v.activeTripId) } })}
            style={[s.card, v.vehicleId === selected && { borderColor: colors.brand }]} accessibilityRole="button">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.plate}>{v.plate} <Text style={s.muted}>{v.type}</Text></Text>
              <Badge label={vehicleStatus[v.status][0]} color={vehicleStatus[v.status][1]} />
            </View>
            {v.driverName && <Text style={s.muted}>{v.driverName}</Text>}
            {v.activeTripLabel && <Text style={s.text}>{v.activeTripLabel}</Text>}
            <Text style={s.muted}>
              {v.lastLocationAt ? `Son konum: ${new Date(v.lastLocationAt).toLocaleString('tr-TR')}${v.speedKmh != null ? ` · ${Math.round(v.speedKmh)} km/s` : ''}` : 'Konum bilgisi yok'}
            </Text>
          </Pressable>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 2 },
  plate: { fontSize: 16, fontWeight: '800', color: colors.navy },
  text: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
})
