import { useRef } from 'react'
import { View } from 'react-native'
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas'
import { colors } from '../lib/theme'

/**
 * Teslim alan kişinin imzası (parmakla). Her çizimden sonra PNG data URL'i onChange ile döner; "Temizle" null döner.
 * onDrawing: çizerken sayfa kaymasın diye üst ScrollView'in kaydırması kapatılır.
 */
export function SignaturePad({ onChange, onDrawing }: { onChange: (dataUrl: string | null) => void; onDrawing?: (drawing: boolean) => void }) {
  const ref = useRef<SignatureViewRef>(null)
  return (
    <View style={{ height: 230, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden' }}>
      <SignatureScreen
        ref={ref}
        onBegin={() => onDrawing?.(true)}
        onEnd={() => { onDrawing?.(false); ref.current?.readSignature() }}
        onOK={(sig) => onChange(sig)}
        onEmpty={() => onChange(null)}
        onClear={() => onChange(null)}
        descriptionText="Teslim alan kişi buraya imzalasın"
        clearText="Temizle"
        confirmText="Tamam"
        imageType="image/png"
        autoClear={false}
        webStyle=".m-signature-pad--footer .button.save { display: none; } .m-signature-pad { box-shadow: none; border: none; }"
      />
    </View>
  )
}
