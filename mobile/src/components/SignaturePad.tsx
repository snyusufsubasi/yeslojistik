import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../lib/theme'

/** Web önizlemesinde imza desteklenmez; teslim, teslim alanın adıyla yapılır. */
export function SignaturePad(_: { onChange: (dataUrl: string | null) => void; onDrawing?: (drawing: boolean) => void }) {
  return (
    <View style={s.box}>
      <Text style={s.text}>İmza yalnızca telefon uygulamasında alınır. Teslim alanın adını yazmanız yeterli.</Text>
    </View>
  )
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 10, padding: 14 },
  text: { color: colors.muted, fontSize: 14 },
})
