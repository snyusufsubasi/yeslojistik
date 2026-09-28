# YES Lojistik Şoför Uygulaması

Expo (React Native) ile yazılmış şoför uygulaması. Şoför kendi seferlerini görür, durumu günceller
(**Yükü Aldım → Yola Çıktım → Teslim Ettim**), teslim fotoğrafı/irsaliye yükler. Sefer yüklendiği andan teslime kadar
konum otomatik paylaşılır; ofis haritada, müşteri takip linkinde görür.

## Giriş hesabı

Web panelde **Ayarlar → Kullanıcılar → Yeni Kullanıcı** ile rolü **Şoför (mobil)** olan, bir şoföre bağlı hesap açılır.
Şoför bu e-posta/şifreyle uygulamaya girer. Sunucu adresi `app.json` → `extra.apiUrl` içindedir; giriş ekranındaki
“Sunucu ayarı” ile değiştirilebilir.

## Geliştirme

```bash
npm install
npx expo start          # Expo Go ile telefonda aç (QR kod)
npm run typecheck
```

> Arka planda konum paylaşımı (uygulama kapalıyken) Expo Go'da iOS'ta çalışmaz; development build gerekir.
> Expo Go'da uygulama açıkken dakikada bir konum gönderilir.

## Telefona kurulum (derleme)

[EAS Build](https://docs.expo.dev/build/introduction/) ile bulutta derlenir (Mac/Android Studio gerekmez):

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android   # Şoförlere doğrudan kurulacak APK
npx eas-cli@latest build --profile production --platform ios    # App Store / TestFlight (Apple geliştirici hesabı gerekir)
```

Android için `preview` profili bir APK üretir; linki şoförlere WhatsApp'tan gönderip kurdurabilirsiniz.
Mağazaya koymak için Google Play (tek sefer 25 $) / Apple Developer (yıllık 99 $) hesabı gerekir.

## Konum ve pil

- Konum yalnızca **yüklendi** veya **yolda** durumunda sefer varken paylaşılır; teslimden sonra otomatik durur.
- 60 saniyede veya 200 metrede bir kayıt alınır. Çekim yoksa telefonda biriktirilir, bağlantı gelince toplu gönderilir.
- Android'de paylaşım sırasında bildirim çubuğunda “Sefer sırasında konum paylaşılıyor” bildirimi görünür (işletim sistemi zorunluluğu).
- Sunucu, konum kayıtlarını varsayılan 90 gün sonra siler (KVKK).
