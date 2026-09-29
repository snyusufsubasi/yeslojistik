import { useEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Badge, Card } from '../../../components/ui'
import { Chip, Input, tl0, trDate } from '../../../components/office'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import type { PagedResult, Trip } from '../../../lib/officeTypes'
import { can } from '../../../lib/permissions'
import { colors, statusColor, statusLabel } from '../../../lib/theme'
import type { TripStatus } from '../../../lib/types'

const statuses: (TripStatus | '')[] = ['', 'Planned', 'Loaded', 'OnRoad', 'Delivered', 'Cancelled']

export default function OfficeTrips() {
  const params = useLocalSearchParams<{ status?: string }>()
  const { role } = useAuth()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState<TripStatus | ''>((params.status as TripStatus) ?? '')
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 350); return () => clearTimeout(t) }, [search])
  useEffect(() => { if (params.status) setStatus(params.status as TripStatus) }, [params.status])

  const q = useInfiniteQuery({
    queryKey: ['trips', 'office', debounced, status],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<PagedResult<Trip>>(
      `/trips?page=${pageParam}&pageSize=20&sort=loadingDate&desc=true${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}${status ? `&status=${status}` : ''}`),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  })
  const items = q.data?.pages.flatMap((p) => p.items) ?? []
  const money = can(role, 'accounting')

  return (
    <View style={s.screen}>
      <View style={s.filters}>
        <Input value={search} onChangeText={setSearch} placeholder="Müşteri, plaka, şoför, adres, ref no..." accessibilityLabel="Sefer ara" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {statuses.map((st) => <Chip key={st || 'all'} label={st ? statusLabel[st] : 'Tümü'} active={status === st} onPress={() => setStatus(st)} />)}
        </ScrollView>
      </View>
      <FlatList
        data={items}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage() }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={() => q.refetch()} />}
        ListEmptyComponent={<Text style={s.empty}>{q.isLoading ? 'Yükleniyor...' : q.isError ? (q.error as Error).message : 'Sefer bulunamadı.'}</Text>}
        renderItem={({ item: t }) => (
          <Pressable onPress={() => router.push({ pathname: '/yonetim/sefer/[id]', params: { id: String(t.id) } })} accessibilityRole="button">
            <Card>
              <View style={s.top}>
                <Text style={s.date}>{trDate(t.loadingDate)}{t.customerReference ? ` · Ref ${t.customerReference}` : ''}</Text>
                <Badge label={statusLabel[t.status]} color={statusColor[t.status]} />
              </View>
              <Text style={s.customer}>{t.customerTitle}</Text>
              <Text style={s.route}>{t.loadingCity ?? t.loadingAddress} → {t.deliveryCity ?? t.deliveryAddress}</Text>
              <Text style={s.meta}>{t.vehiclePlate}{t.vehicleOwnership === 'Rented' ? ' (kiralık)' : ''} · {t.driverName}{money ? ` · ${tl0(t.salePrice)}` : ''}</Text>
            </Card>
          </Pressable>
        )}
        ListFooterComponent={q.isFetchingNextPage ? <Text style={s.empty}>Yükleniyor...</Text> : null}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filters: { backgroundColor: '#fff', padding: 12, gap: 10, borderBottomWidth: 1, borderColor: colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  date: { color: colors.muted, fontSize: 13, flex: 1 },
  customer: { fontSize: 17, fontWeight: '700', color: colors.navy },
  route: { fontSize: 15, color: colors.text, marginTop: 2 },
  meta: { marginTop: 6, color: colors.muted, fontSize: 13 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30, fontSize: 15 },
})
