import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors } from '../lib/theme'

export function Button({ title, onPress, color = colors.brand, loading, disabled, variant = 'solid', style }:
  { title: string; onPress: () => void; color?: string; loading?: boolean; disabled?: boolean; variant?: 'solid' | 'outline'; style?: StyleProp<ViewStyle> }) {
  const outline = variant === 'outline'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        outline ? { borderColor: color, borderWidth: 1.5, backgroundColor: '#fff' } : { backgroundColor: color },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={outline ? color : '#fff'} /> : <Text style={[s.buttonText, outline && { color }]}>{title}</Text>}
    </Pressable>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.badge, { backgroundColor: color + '22' }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={{ flex: 1 }}>{typeof value === 'string' ? <Text style={s.rowValue}>{value}</Text> : value}</View>
    </View>
  )
}

const s = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  rowLabel: { width: 96, color: colors.muted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '500' },
})
