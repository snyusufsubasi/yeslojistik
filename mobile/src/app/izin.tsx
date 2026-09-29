import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/ui'
import { api } from '../lib/api'
import { CONSENT_ASKED_KEY, CONSENT_VERSION, consentPoints } from '../lib/consent'
import { notify } from '../lib/dialog'
import { storage } from '../lib/storage'
import { colors } from '../lib/theme'

/**
 * Konum izni istenmeden önce gösterilen açıklama (Google Play "belirgin açıklama" şartı ve KVKK açık rızası).
 * "Şimdi değil" denirse uygulama çalışır ama konum paylaşılmaz; ofis bunu şoför listesinde görür.
 */
export default function ConsentScreen() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<'yes' | 'no' | null>(null)

  const answer = async (accepted: boolean) => {
    setBusy(accepted ? 'yes' : 'no')
    try {
      await api.post('/driver/consent', { accepted, version: CONSENT_VERSION })
      await storage.set(CONSENT_ASKED_KEY, CONSENT_VERSION)
      await qc.invalidateQueries({ queryKey: ['me'] })
      if (router.canGoBack()) router.back()
      else router.replace('/sofor')
    } catch (e) {
      notify('Kaydedilemedi', e instanceof Error ? e.message : 'Tekrar deneyin.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={s.title}>Sefer sırasında konumunuz paylaşılacak</Text>
      <Text style={s.lead}>
        YES Lojistik uygulaması, size atanmış bir sefer yüklendiğinde veya yoldayken, uygulama kapalıyken de telefonunuzun
        konumunu toplar ve ofise gönderir.
      </Text>
      {consentPoints.map((p) => (
        <View key={p.title} style={s.point}>
          <Text style={s.pointTitle}>{p.title}</Text>
          <Text style={s.pointText}>{p.text}</Text>
        </View>
      ))}
      <Text style={s.small}>
        Kabul ederseniz telefon sizden konum izni isteyecek. Kesintisiz takip için "Her zaman izin ver" seçeneğini seçin.
      </Text>
      <Button title="Kabul ediyorum" onPress={() => answer(true)} loading={busy === 'yes'} disabled={busy !== null} />
      <Button title="Şimdi değil" variant="outline" onPress={() => answer(false)} loading={busy === 'no'} disabled={busy !== null} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  lead: { fontSize: 16, color: colors.text, lineHeight: 22 },
  point: { borderLeftWidth: 3, borderColor: colors.brand, paddingLeft: 10 },
  pointTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  pointText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontSize: 14, color: colors.muted },
})
