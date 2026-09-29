import '../lib/location' // arka plan konum görevini kaydeder
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack, router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from '../lib/auth'
import { onSynced, startOutbox } from '../lib/outbox'
import { colors } from '../lib/theme'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } })

function RootStack() {
  const { ready, signedIn, role } = useAuth()
  const qc = useQueryClient()
  const driver = signedIn && role === 'Driver'
  const office = signedIn && role !== 'Driver'
  // Platform.OS çalışma anında sabit olduğundan hook sırası değişmez; web önizlemesinde bildirim yok.
  const lastResponse = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse()

  // Çevrimdışı kuyruk: gönderilen her işlemden sonra ekranlar yenilensin.
  useEffect(() => {
    if (!driver) return
    startOutbox()
    return onSynced((item) => {
      qc.invalidateQueries({ queryKey: ['trip', String(item.tripId)] })
      qc.invalidateQueries({ queryKey: ['trips'] })
    })
  }, [driver, qc])

  // Bildirime dokunulunca ilgili seferi aç.
  useEffect(() => {
    const data = lastResponse?.notification.request.content.data
    const tripId = data?.tripId
    if (!signedIn || (typeof tripId !== 'string' && typeof tripId !== 'number')) return
    if (driver) router.push({ pathname: '/sofor/sefer/[id]', params: { id: String(tripId) } })
    else router.push({ pathname: '/yonetim', params: { tripId: String(tripId) } })
  }, [lastResponse, signedIn, driver])

  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }}><ActivityIndicator color="#fff" /></View>
  }
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' }, headerBackTitle: 'Geri' }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={driver}>
        <Stack.Screen name="sofor/index" options={{ title: 'Seferlerim' }} />
        <Stack.Screen name="sofor/sefer/[id]" options={{ title: 'Sefer Detayı' }} />
        <Stack.Screen name="sofor/teslim/[id]" options={{ title: 'Teslim' }} />
        <Stack.Screen name="sofor/bekleyenler" options={{ title: 'Gönderilmeyi Bekleyenler' }} />
        <Stack.Screen name="izin" options={{ title: 'Konum Paylaşımı', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={office}>
        <Stack.Screen name="yonetim" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootStack />
      </AuthProvider>
    </QueryClientProvider>
  )
}
