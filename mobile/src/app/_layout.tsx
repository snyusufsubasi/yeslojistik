import '../lib/location' // arka plan konum görevini kaydeder
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from '../lib/auth'
import { colors } from '../lib/theme'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } })

function RootStack() {
  const { ready, signedIn } = useAuth()
  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }}><ActivityIndicator color="#fff" /></View>
  }
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ title: 'Seferlerim' }} />
        <Stack.Screen name="trip/[id]" options={{ title: 'Sefer Detayı', headerBackTitle: 'Geri' }} />
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
