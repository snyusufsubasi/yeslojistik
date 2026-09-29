import { Stack } from 'expo-router'
import { colors } from '../../lib/theme'

export default function OfficeLayout() {
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' }, headerBackTitle: 'Geri' }} />
}
