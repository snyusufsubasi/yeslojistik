/** Konum paylaşımı açıklaması (Google Play "belirgin açıklama" + KVKK aydınlatma). Metin değişirse sürümü artırın. */
export const CONSENT_VERSION = '1'

export const consentPoints: { title: string; text: string }[] = [
  { title: 'Ne toplanır?', text: 'Telefonun konumu (enlem, boylam) ve aracın hızı.' },
  { title: 'Ne zaman?', text: 'Yalnızca size atanmış, "Yüklendi" veya "Yolda" durumundaki bir sefer varken. Uygulama kapalı veya arka plandayken de sefer bitene kadar paylaşılır. Aktif sefer yokken konum alınmaz.' },
  { title: 'Neden?', text: 'Ofisin seferi takip edebilmesi ve müşteriye gönderilen takip linkinde aracın nerede olduğunun görünmesi için.' },
  { title: 'Kim görür?', text: 'Firmanın ofis çalışanları ve takip linki gönderilen müşteri (müşteri yalnızca o seferi, teslimden en geç 7 gün sonrasına kadar görür).' },
  { title: 'Ne kadar saklanır?', text: 'Konum kayıtları 90 gün sonra kendiliğinden silinir.' },
  { title: 'Nasıl durdurulur?', text: 'Telefon ayarlarından uygulamanın konum iznini kapatabilir veya bu ekrandaki onayınızı "Hesabım" bölümünden geri alabilirsiniz. Bu durumda seferleriniz çalışmaya devam eder, yalnızca konum gönderilmez.' },
]

/** Bu telefonda rıza ekranı gösterildi mi ("Şimdi değil" denince her açılışta tekrar sorulmasın). */
export const CONSENT_ASKED_KEY = 'yl.consentAsked'
