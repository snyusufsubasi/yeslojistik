import { useEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Chip, Input, tl } from '../../../components/office'
import { api } from '../../../lib/api'
import type { PagedResult, Party } from '../../../lib/officeTypes'
import { colors } from '../../../lib/theme'

type Kind = 'musteri' | 'tedarikci'

/** Müşteri ve tedarikçi (taşeron) carileri; bakiye ile. */
export default function Accounts() {
  const params = useLocalSearchParams<{ tur?: Kind }>()
  const [kind, setKind] = useState<Kind>(params.tur ?? 'musteri')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 350); return () => clearTimeout(t) }, [search])
  useEffect(() => { if (params.tur) setKind(params.tur) }, [params.tur])

  const base = kind === 'musteri' ? '/customers?sort=balance&desc=true' : '/suppliers?sort=title'
  const q = useInfiniteQuery({
    queryKey: [kind === 'musteri' ? 'customers' : 'suppliers', 'mobile', debounced],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<PagedResult<Party>>(`${base}&page=${pageParam}&pageSize=30${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}`),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  })
  const items = q.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <View style={s.screen}>
      <View style={s.filters}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Müşteriler" active={kind === 'musteri'} onPress={() => setKind('musteri')} />
          <Chip label="Tedarikçiler" active={kind === 'tedarikci'} onPress={() => setKind('tedarikci')} />
        </View>
        <Input value={search} onChangeText={setSearch} placeholder="Ünvan, VKN, telefon..." accessibilityLabel="Cari ara" />
      </View>
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage() }}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={() => q.refetch()} />}
        ListEmptyComponent={<Text style={s.empty}>{q.isLoading ? 'Yükleniyor...' : q.isError ? (q.error as Error).message : 'Kayıt yok.'}</Text>}
        renderItem={({ item: p }) => (
          <Pressable onPress={() => router.push({ pathname: '/yonetim/cari/[tur]/[id]', params: { tur: kind, id: String(p.id) } })} style={s.row} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{p.title}</Text>
              {(p.city || p.phone) && <Text style={s.sub}>{[p.city, p.phone].filter(Boolean).join(' · ')}</Text>}
            </View>
            <Text style={[s.balance, { color: p.balance > 0 ? (kind === 'musteri' ? colors.red : colors.amber) : colors.green }]}>{tl(p.balance)}</Text>
          </Pressable>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filters: { backgroundColor: '#fff', padding: 12, gap: 10, borderBottomWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 15, fontWeight: '700', color: colors.navy },
  sub: { fontSize: 13, color: colors.muted },
  balance: { fontSize: 15, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30, fontSize: 15 },
})
