import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input, tl, trDate } from '../../components/office'
import { Button, Card } from '../../components/ui'
import { api } from '../../lib/api'
import { notify } from '../../lib/dialog'
import { colors } from '../../lib/theme'

interface PendingExpense {
  id: number
  category: string
  amount: number
  date: string
  vehiclePlate?: string | null
  driverName?: string | null
  tripLabel?: string | null
  description?: string | null
  hasReceipt?: boolean
}

const categoryLabel: Record<string, string> = {
  Fuel: 'Yakıt', Maintenance: 'Bakım/Onarım', Toll: 'Otoyol/Köprü', DriverAllowance: 'Harcırah', DriverAdvance: 'Avans',
  Tire: 'Lastik', Insurance: 'Sigorta', Tax: 'Vergi/Harç', Other: 'Diğer',
}

/** Şoförlerin girdiği, onay bekleyen masraflar: onayla ya da gerekçeyle reddet (gerekçe şoföre bildirim olarak gider). */
export default function ApprovalScreen() {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['expenses', 'pending'],
    queryFn: () => api.get<{ items: PendingExpense[] }>('/expenses?approvalStatus=Pending&pageSize=100&sort=date&desc=true'),
  })
  const done = () => {
    qc.invalidateQueries({ queryKey: ['expenses'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/expenses/${id}/approve`),
    onSuccess: done,
    onError: (e) => notify('Onaylanamadı', e instanceof Error ? e.message : 'Tekrar deneyin.'),
  })

  return (
    <>
      <Stack.Screen options={{ title: 'Onay Bekleyen Masraflar' }} />
      <FlatList
        style={s.screen}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={list.data?.items ?? []}
        keyExtractor={(e) => String(e.id)}
        refreshControl={<RefreshControl refreshing={list.isFetching} onRefresh={() => list.refetch()} />}
        ListEmptyComponent={list.isLoading ? null : <Text style={s.empty}>Onay bekleyen masraf yok.</Text>}
        renderItem={({ item }) => <ExpenseRow e={item} onApprove={() => approve.mutate(item.id)} approving={approve.isPending && approve.variables === item.id} onRejected={done} />}
      />
    </>
  )
}

function ExpenseRow({ e, onApprove, approving, onRejected }: { e: PendingExpense; onApprove: () => void; approving: boolean; onRejected: () => void }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const reject = useMutation({
    mutationFn: () => api.post(`/expenses/${e.id}/reject`, { reason: reason.trim() }),
    onSuccess: onRejected,
    onError: (err) => notify('Reddedilemedi', err instanceof Error ? err.message : 'Tekrar deneyin.'),
  })
  return (
    <Card style={{ gap: 6 }}>
      <View style={s.row}>
        <Text style={s.title}>{categoryLabel[e.category] ?? e.category}</Text>
        <Text style={s.amount}>{tl(e.amount)}</Text>
      </View>
      <Text style={s.muted}>{[trDate(e.date), e.driverName, e.vehiclePlate].filter(Boolean).join(' · ')}</Text>
      {e.tripLabel ? <Text style={s.muted}>{e.tripLabel}</Text> : null}
      {e.description ? <Text style={s.text}>{e.description}</Text> : null}
      {e.hasReceipt ? <Text style={s.muted}>Fiş eklenmiş (web panelinden görülebilir)</Text> : null}
      {rejecting ? (
        <View style={{ gap: 8 }}>
          <Input value={reason} onChangeText={setReason} placeholder="Reddetme gerekçesi (şoföre gider)" maxLength={300} accessibilityLabel="Reddetme gerekçesi" />
          <View style={s.row}>
            <Button style={{ flex: 1 }} title="Vazgeç" variant="outline" onPress={() => setRejecting(false)} />
            <Button style={{ flex: 1 }} title="Reddet" color={colors.red} loading={reject.isPending} disabled={!reason.trim()} onPress={() => reject.mutate()} />
          </View>
        </View>
      ) : (
        <View style={s.row}>
          <Button style={{ flex: 1 }} title="Onayla" color={colors.green} loading={approving} onPress={onApprove} />
          <Button style={{ flex: 1 }} title="Reddet" variant="outline" color={colors.red} onPress={() => setRejecting(true)} />
        </View>
      )}
    </Card>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.navy },
  amount: { fontSize: 17, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  empty: { textAlign: 'center', color: colors.muted, fontSize: 15, marginTop: 40 },
})
