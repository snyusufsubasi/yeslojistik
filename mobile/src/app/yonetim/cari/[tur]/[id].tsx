import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Card } from '../../../../components/ui'
import { Stat, tl, tl0, trDate } from '../../../../components/office'
import { api } from '../../../../lib/api'
import { useAuth } from '../../../../lib/auth'
import { notify } from '../../../../lib/dialog'
import { sharePdf } from '../../../../lib/files'
import type { AccountMovement, AccountSummary, Party } from '../../../../lib/officeTypes'
import { can } from '../../../../lib/permissions'
import { colors } from '../../../../lib/theme'

type Summary = AccountSummary & { customer?: Party; supplier?: Party }

/** Cari detayı: özet, hareketler, arama/WhatsApp, tahsilat/ödeme ve ekstre PDF'i. */
export default function AccountDetail() {
  const { tur, id } = useLocalSearchParams<{ tur: 'musteri' | 'tedarikci'; id: string }>()
  const { role } = useAuth()
  const customer = tur === 'musteri'
  const base = customer ? `/customers/${id}` : `/suppliers/${id}`
  const summary = useQuery({ queryKey: [customer ? 'customers' : 'suppliers', 'detail', id], queryFn: () => api.get<Summary>(base) })
  const moves = useQuery({ queryKey: [customer ? 'customers' : 'suppliers', 'movements', id], queryFn: () => api.get<AccountMovement[]>(`${base}/movements`) })
  const sum = summary.data
  const party = sum?.customer ?? sum?.supplier
  if (!sum || !party) return <View style={s.center}><Text style={s.muted}>{summary.isError ? (summary.error as Error).message : 'Yükleniyor...'}</Text></View>
  const phone = party.phone?.replace(/\D/g, '')
  const wa = phone ? `https://wa.me/${phone.startsWith('0') ? '9' + phone : phone}` : null

  const statement = () => sharePdf(`${base}/statement`, `${customer ? 'musteri' : 'tedarikci'}-ekstre-${id}.pdf`)
    .catch((e) => notify('Ekstre açılamadı', e instanceof Error ? e.message : 'Tekrar deneyin.'))

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Stack.Screen options={{ title: party.title }} />
      <View style={s.grid}>
        <Stat label={customer ? 'Alacak bakiyesi' : 'Borcumuz'} value={tl0(sum.balance)} tone={sum.balance > 0 ? colors.red : colors.green} />
        <Stat label="Vadesi geçen" value={tl0(sum.overdueAmount)} tone={sum.overdueAmount > 0 ? colors.red : undefined} />
        <Stat label={customer ? 'Toplam borçlanma' : 'Toplam borç'} value={tl0(sum.totalDebit)} />
        <Stat label={customer ? 'Tahsil edilen' : 'Ödenen'} value={tl0(sum.totalCredit)} />
      </View>
      <Card style={{ gap: 10 }}>
        {party.iban ? <Text style={s.text}>IBAN: {party.iban}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {party.phone ? <Button title="Ara" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${party.phone!.replace(/\s/g, '')}`)} /> : null}
          {wa ? <Button title="WhatsApp" variant="outline" color={colors.green} style={{ flex: 1 }} onPress={() => Linking.openURL(wa)} /> : null}
        </View>
        {can(role, 'accounting') && (
          <Button title={customer ? 'Tahsilat Ekle' : 'Ödeme Yap'} color={colors.green}
            onPress={() => router.push({ pathname: customer ? '/yonetim/tahsilat' : '/yonetim/odeme', params: { id } })} />
        )}
        <Button title="Hesap Ekstresi (PDF)" variant="outline" onPress={statement} />
      </Card>
      <Card style={{ gap: 4 }}>
        <Text style={s.section}>Hareketler</Text>
        {moves.data?.length === 0 && <Text style={s.muted}>Hareket yok.</Text>}
        {[...(moves.data ?? [])].reverse().slice(0, 100).map((m, i) => (
          <View key={i} style={s.move}>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{trDate(m.date)} · {m.type}</Text>
              <Text style={s.muted}>{[m.reference, m.description].filter(Boolean).join(' · ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.text, { color: m.debit > 0 ? colors.red : colors.green }]}>{m.debit > 0 ? `+${tl(m.debit)}` : `−${tl(m.credit)}`}</Text>
              <Text style={s.muted}>Bakiye {tl(m.runningBalance)}</Text>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { fontSize: 17, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  text: { fontSize: 14, color: colors.text },
  muted: { fontSize: 12, color: colors.muted },
  move: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: colors.border },
})
