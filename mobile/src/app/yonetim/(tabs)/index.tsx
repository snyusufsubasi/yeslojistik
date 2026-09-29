import { useEffect } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card } from '../../../components/ui'
import { Stat, tl0, trDate } from '../../../components/office'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { registerForPush } from '../../../lib/notifications'
import type { Alert, Dashboard } from '../../../lib/officeTypes'
import { can } from '../../../lib/permissions'
import { colors, statusColor, statusLabel } from '../../../lib/theme'

/** Yönetici özeti: bu ay, yoldakiler, alacak/borç, bugünün seferleri ve uyarılar. */
export default function OfficeSummary() {
  const { role } = useAuth()
  const money = can(role, 'accounting')
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/dashboard'), refetchInterval: 60_000 })
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: () => api.get<Alert[]>('/dashboard/alerts') })

  useEffect(() => { registerForPush().catch(() => undefined) }, [])

  const d = dash.data
  const refreshing = dash.isRefetching || alerts.isRefetching
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { dash.refetch(); alerts.refetch() }} />}>
      {!d ? <Text style={s.muted}>{dash.isError ? (dash.error as Error).message : 'Yükleniyor...'}</Text> : (
        <>
          <View style={s.grid}>
            <Stat label="Bu ay sefer" value={String(d.monthTripCount)} sub={`${d.monthDeliveredCount} teslim`} onPress={() => router.push('/yonetim/seferler')} />
            <Stat label="Yolda / bekleyen" value={String(d.activeTripCount)} sub={`${d.vehiclesOnRoad}/${d.vehicleCount} araç yolda`}
              onPress={() => router.push({ pathname: '/yonetim/seferler', params: { status: 'OnRoad' } })} />
            {money && <Stat label="Tahsilat bekleyen" value={tl0(d.receivableTotal)} sub={`${d.receivableInvoiceCount} fatura`} tone={d.receivableTotal > 0 ? colors.red : undefined}
              onPress={() => router.push({ pathname: '/yonetim/cariler', params: { tur: 'musteri' } })} />}
            {money && <Stat label="Taşerona ödenecek" value={tl0(d.payableTotal)} sub={d.payableOverdue > 0 ? `Vadesi geçen: ${tl0(d.payableOverdue)}` : undefined}
              tone={d.payableTotal > 0 ? colors.amber : undefined} onPress={() => router.push({ pathname: '/yonetim/cariler', params: { tur: 'tedarikci' } })} />}
            {money && <Stat label="Bu ay ciro" value={tl0(d.monthRevenue)} />}
            {money && <Stat label="Bu ay kâr" value={tl0(d.monthRevenue - d.monthExpenses)} tone={d.monthRevenue - d.monthExpenses < 0 ? colors.red : colors.green} />}
          </View>

          <Card style={{ gap: 8 }}>
            <Text style={s.section}>Bugünün seferleri</Text>
            {d.todayTrips.length === 0 && <Text style={s.muted}>Bugün yüklenecek, teslim edilecek ya da yolda sefer yok.</Text>}
            {d.todayTrips.map((t) => (
              <Pressable key={t.id} onPress={() => router.push({ pathname: '/yonetim/sefer/[id]', params: { id: String(t.id) } })} style={s.row} accessibilityRole="button">
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{t.customerTitle}</Text>
                  <Text style={s.rowSub}>{t.vehiclePlate} · {t.driverName}</Text>
                  <Text style={s.rowSub}>{t.loadingCity ?? t.loadingAddress} → {t.deliveryCity ?? t.deliveryAddress}</Text>
                </View>
                <Badge label={statusLabel[t.status]} color={statusColor[t.status]} />
              </Pressable>
            ))}
          </Card>
        </>
      )}

      <Card style={{ gap: 8 }}>
        <Text style={s.section}>Uyarılar</Text>
        {alerts.data?.length === 0 && <Text style={s.muted}>Uyarı yok.</Text>}
        {alerts.data?.slice(0, 20).map((a, i) => (
          <View key={i} style={[s.alert, { borderColor: a.severity === 'danger' ? colors.red : colors.amber }]}>
            <Text style={s.rowTitle}>{a.title}</Text>
            <Text style={s.rowSub}>{a.message}{a.date ? ` (${trDate(a.date)})` : ''}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { fontSize: 17, fontWeight: '700', color: colors.navy },
  muted: { color: colors.muted, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: colors.border },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted },
  alert: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 4 },
})
