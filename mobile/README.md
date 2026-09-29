# YES Lojistik Mobil Uygulaması

Expo (React Native) ile yazılmış tek uygulama: girişte hesabın rolüne göre **şoför** ya da **ofis (yönetici)** ekranları açılır.
Şoför kendi seferlerini görür, durumu günceller (**Yükü Aldım → Yola Çıktım → Teslim Ettim**), teslimde teslim alanın adını,
imzasını ve fotoğrafı alır, masraf ve fiş girer. Çekim yokken yapılan her işlem telefonda bekler ve internet gelince
kendiliğinden gönderilir (aynı işlem iki kez kaydedilmez). Sefer yüklendiği andan teslime kadar konum, şoförün onayıyla
paylaşılır; ofis haritada, müşteri takip linkinde görür.

Şoförlere dağıtılacak kurulum kılavuzu: [docs/MOBIL-KURULUM.md](../docs/MOBIL-KURULUM.md).

## Giriş hesabı

Web panelde **Ayarlar → Kullanıcılar → Yeni Kullanıcı** ile rolü **Şoför (mobil)** olan, bir şoföre bağlı hesap açılır.
Şoför bu e-posta/şifreyle uygulamaya girer. Sunucu adresi `app.config.ts` → `extra.apiUrl` içindedir (derlemede `API_URL` ortam değişkeniyle değiştirilebilir); giriş ekranındaki
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

## Bildirimler

Ofis şoföre sefer atadığında, seferin güzergâhını/tarihini değiştirdiğinde, seferi başka şoföre aktardığında veya iptal
ettiğinde şoförün telefonuna bildirim gider; bildirime dokununca sefer açılır. Ücretsiz Expo Push servisi kullanılır.

Bir kerelik kurulum:
1. `npx eas-cli@latest init` ile proje açılır; verilen proje kimliği `EAS_PROJECT_ID` olarak derlemeye verilir (`app.config.ts`).
2. Android: Firebase projesi açıp FCM V1 anahtarını `npx eas-cli@latest credentials` ile yükleyin
   ([adımlar](https://docs.expo.dev/push-notifications/fcm-credentials/)).
3. iOS: ilk `eas build` sırasında “Setup Push Notifications” sorusuna evet deyin (Apple geliştirici hesabı gerekir).

`projectId` boşken uygulama çalışmaya devam eder, sadece bildirim kaydı yapılmaz. Sunucuda göndermeyi kapatmak için
`Push__Enabled=false` ortam değişkeni kullanılabilir.

## Masraf girişi

Sefer ekranındaki **Masraf / Yakıt** bölümünden yakıt (tutar, litre, araç km), otoyol/köprü, bakım/onarım ve diğer masraflar girilir. Tutar `4.450,50` ya da `4450.5` şeklinde yazılabilir. Masraf sefere, seferin aracına ve şoföre bağlanır, ofiste **onay bekliyor** olarak görünür; yakıtta girilen km aracın kilometresini günceller. İsteğe bağlı fiş fotoğrafı masrafla birlikte gider.

## Konum ve pil

- Konum yalnızca **yüklendi** veya **yolda** durumunda sefer varken paylaşılır; teslimden sonra otomatik durur.
- 60 saniyede veya 200 metrede bir kayıt alınır. Çekim yoksa telefonda biriktirilir, bağlantı gelince toplu gönderilir.
- Android'de paylaşım sırasında bildirim çubuğunda “Sefer sırasında konum paylaşılıyor” bildirimi görünür (işletim sistemi zorunluluğu).
- Sunucu, konum kayıtlarını varsayılan 90 gün sonra siler (KVKK).
