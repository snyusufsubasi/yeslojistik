import { Linking, StyleSheet, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { Button, Card } from '../../components/ui'
import { getServer } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors } from '../../lib/theme'

/** Ofis kullanıcıları için geçici ekran (yönetici modu hazırlanıyor). */
export default function OfficeHome() {
  const { signOut } = useAuth()
  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: 'YES Lojistik' }} />
      <Card style={{ gap: 12 }}>
        <Text style={s.title}>Yönetici ekranları hazırlanıyor</Text>
        <Text style={s.text}>Şimdilik web panelini kullanın. Panel telefonda da açılır.</Text>
        <Button title="Web Panelini Aç" onPress={async () => Linking.openURL(await getServer())} />
        <Button title="Çıkış" variant="outline" onPress={signOut} />
      </Card>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy },
  text: { fontSize: 15, color: colors.text },
})
