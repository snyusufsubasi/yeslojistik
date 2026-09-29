import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card } from '../../../components/ui'
import { api, getServer } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { notify } from '../../../lib/dialog'
import type { NotificationPref } from '../../../lib/officeTypes'
import { can } from '../../../lib/permissions'
import { colors } from '../../../lib/theme'

/** Hızlı işlemler, bildirim tercihleri, web paneli ve çıkış. */
export default function More() {
  const { role, signOut } = useAuth()
  const qc = useQueryClient()
  const prefs = useQuery({ queryKey: ['me', 'prefs'], queryFn: () => api.get<NotificationPref[]>('/me/notification-preferences') })
  const toggle = useMutation({
    mutationFn: (p: { type: string; push: boolean }) => api.put<NotificationPref[]>('/me/notification-preferences', [p]),
    onSuccess: (list) => qc.setQueryData(['me', 'prefs'], list),
    onError: (e) => notify('Kaydedilemedi', e instanceof Error ? e.message : 'Tekrar deneyin.'),
  })

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card style={{ gap: 10 }}>
        <Text style={s.section}>Hızlı işlemler</Text>
        {can(role, 'operations') && <Button title="Yeni Sefer" onPress={() => router.push('/yonetim/sefer/yeni')} />}
        {can(role, 'accounting') && <Button title="Tahsilat Ekle" color={colors.green} onPress={() => router.push('/yonetim/tahsilat')} />}
        {can(role, 'accounting') && <Button title="Taşerona Ödeme Yap" variant="outline" onPress={() => router.push('/yonetim/odeme')} />}
        {can(role, 'accounting') && <Button title="Gider Ekle (fişli)" variant="outline" onPress={() => router.push('/yonetim/gider')} />}
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={s.section}>Telefon bildirimleri</Text>
        {prefs.data?.map((p) => (
          <View key={p.type} style={s.pref}>
            <Text style={s.prefText}>{p.label}</Text>
            <Switch value={p.push} onValueChange={(v) => toggle.mutate({ type: p.type, push: v })} accessibilityLabel={p.label} />
          </View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.muted}>Raporlar, fatura kesme ve ayarlar için web panelini kullanın.</Text>
        <Button title="Web Panelini Aç" variant="outline" onPress={async () => Linking.openURL(await getServer())} />
        <Button title="Çıkış" variant="outline" color={colors.red} onPress={signOut} />
      </Card>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  section: { fontSize: 17, fontWeight: '700', color: colors.navy },
  muted: { fontSize: 14, color: colors.muted },
  pref: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  prefText: { flex: 1, fontSize: 14, color: colors.text },
})
