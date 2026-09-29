import type { ExpoConfig } from 'expo/config'

/**
 * Tek uygulama: şoför ve ofis (yönetici) aynı uygulamayı kullanır; girişte hesabın rolüne göre ekranlar açılır.
 * Sunucu adresi derlemede API_URL ile değiştirilebilir. Eski adresler (legacyApiUrls) telefonda kayıtlıysa
 * uygulama açılışta kendiliğinden yeni adrese geçer (sunucu taşınmasında kullanılır).
 */
const config: ExpoConfig = {
  name: 'YES Lojistik',
  slug: 'yeslojistik',
  scheme: 'yeslojistik',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.yeslojistik.app',
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: 'com.yeslojistik.app',
    adaptiveIcon: {
      backgroundColor: '#0b2a55',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Yüklenmiş veya yoldaki bir seferiniz varken aracın konumu, seferi takip edebilmeleri için ofise ve müşteriye gösterilir.',
        locationWhenInUsePermission:
          'Yüklenmiş veya yoldaki bir seferiniz varken aracın konumu, seferi takip edebilmeleri için ofise ve müşteriye gösterilir.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Teslim belgelerini galeriden seçmek için fotoğraflarınıza erişim gerekir.',
        cameraPermission: 'Teslim fotoğrafı ve masraf fişi çekmek için kameraya erişim gerekir.',
      },
    ],
    ['expo-notifications', { color: '#0b2a55', defaultChannel: 'trips' }],
  ],
  extra: {
    apiUrl: process.env.API_URL ?? 'https://yeslojistik.onrender.com',
    legacyApiUrls: ['https://panel.yeslojistik.com'],
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
  },
  web: { favicon: './assets/favicon.png' },
}

export default config
