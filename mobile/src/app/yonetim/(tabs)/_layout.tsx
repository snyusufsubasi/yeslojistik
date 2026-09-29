import { Pressable, Text, type ColorValue } from 'react-native'
import { Tabs, router } from 'expo-router'
import { useAuth } from '../../../lib/auth'
import { can } from '../../../lib/permissions'
import { colors } from '../../../lib/theme'

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 20 }}>{glyph}</Text>

/** Ofis kullanıcılarının (yönetici, operasyon, muhasebe) alt sekmeleri. */
export default function OfficeTabs() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.navy }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' },
      tabBarActiveTintColor: colors.brand, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Özet', tabBarIcon: icon('▦') }} />
      <Tabs.Screen name="seferler" options={{ title: 'Seferler', tabBarIcon: icon('⇄'),
        headerRight: () => <NewTripButton /> }} />
      <Tabs.Screen name="harita" options={{ title: 'Harita', tabBarIcon: icon('⌖') }} />
      <Tabs.Screen name="cariler" options={{ title: 'Cariler', tabBarIcon: icon('₺') }} />
      <Tabs.Screen name="daha" options={{ title: 'Daha', tabBarIcon: icon('☰') }} />
    </Tabs>
  )
}

function NewTripButton() {
  const { role } = useAuth()
  if (!can(role, 'operations')) return null
  return (
    <Pressable onPress={() => router.push('/yonetim/sefer/yeni')} hitSlop={10} style={{ paddingHorizontal: 12 }} accessibilityRole="button">
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>+ Yeni</Text>
    </Pressable>
  )
}
