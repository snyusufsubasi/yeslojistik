import { Pressable, StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'

/** "3 işlem gönderilmeyi bekliyor" şeridi; dokununca bekleyenler listesi açılır. */
export function OutboxBanner({ count, failed }: { count: number; failed: number }) {
  if (count === 0) return null
  return (
    <Pressable onPress={() => router.push('/sofor/bekleyenler')} style={[s.bar, failed > 0 && s.error]} accessibilityRole="button">
      <Text style={[s.text, failed > 0 && s.errorText]}>
        {failed > 0
          ? `${failed} işlem gönderilemedi. Görmek için dokunun.`
          : `${count} işlem gönderilmeyi bekliyor. İnternet gelince kendiliğinden gönderilecek.`}
      </Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  bar: { backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 10 },
  text: { color: '#92400e', fontSize: 14, fontWeight: '600' },
  error: { backgroundColor: '#fee2e2' },
  errorText: { color: '#991b1b' },
})
