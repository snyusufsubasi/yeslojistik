import { Alert, Platform } from 'react-native'

/** React Native Web'de Alert çalışmadığı için web önizlemesinde tarayıcı diyaloğuna düşer. */
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${message}`)
  else Alert.alert(title, message)
}

export function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes()
    return
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Evet', onPress: onYes },
  ])
}
