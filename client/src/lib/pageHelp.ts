/** Sayfa başlığının yanındaki "?" kutusunda gösterilen kısa ipuçları (adresin ilk parçasına göre). */
export const pageHelp: Record<string, string[]> = {
  seferler: [
    'Yeni yük için sağ üstteki mavi "Yeni Sefer" düğmesine basın; müşteri, araç ve güzergâhı seçin.',
    'Satırdaki "Yüklendi yap", "Yola çıktı yap" düğmeleriyle seferin durumunu ilerletin.',
    'Teslim edilen seferler "Faturalar" sayfasında fatura kesilmeyi bekler.',
  ],
  araclar: [
    'Kendi araçlarınızı "Özmal", başkasından kiraladıklarınızı "Kiralık" olarak ekleyin.',
    'Araca tıklayınca belgeleri, bakımları ve giderleri görürsünüz.',
    'Belge ya da bakım zamanı yaklaşınca menüde turuncu sayı çıkar.',
  ],
  soforler: [
    'Şoförün ehliyet, SRC ve psikoteknik bitiş tarihlerini girin; yaklaşınca uyarı gelir.',
    'Şoföre tıklayıp "Hesap" sekmesinden verilen avansları ve harcamaları takip edin.',
    'Şoföre uygulama hesabı açmak için Ayarlar → Kullanıcılar sayfasını kullanın.',
  ],
  harita: [
    'Yolda olan araçların son konumları haritada görünür.',
    'Araca tıklayınca hangi seferde olduğunu görürsünüz.',
    'Konum, şoför uygulamada "Yola çıktım" dediğinde gelmeye başlar.',
  ],
  musteriler: [
    'Müşteriye tıklayınca borcunu, faturalarını ve ödemelerini tek sayfada görürsünüz.',
    '"Tahsilat Gir" ile müşteriden gelen parayı kaydedin; bakiye kendiliğinden düşer.',
    'Kırmızı tutar müşterinin size borcu demektir.',
  ],
  tedarikciler: [
    'Araç sahipleri (taşeronlar), servisler ve akaryakıtçılar burada durur.',
    'Kiralık araçla yapılan her sefer taşerona borç olarak yazılır.',
    'Tedarikçiye tıklayıp "Ödeme Yap" ile borcu kapatın.',
  ],
  faturalar: [
    '"Yeni Fatura" ile teslim edilmiş seferleri seçip tek faturada birleştirin.',
    'Faturaya tıklayınca PDF\'ini indirebilir ya da e-postayla gönderebilirsiniz.',
    'Ödenmeyen faturalar "Açık" görünür; tahsilat girilince kapanır.',
  ],
  tahsilatlar: [
    'Müşteriden gelen her ödemeyi "Tahsilat Ekle" ile girin.',
    'Çek ya da senet alırsanız yöntem olarak onu seçin; vadesi Çek/Senet sayfasına düşer.',
    'Tahsilat en eski açık faturadan başlayarak kapatır.',
  ],
  odemeler: [
    'Taşerona (araç sahibine) yaptığınız ödemeleri buradan girin.',
    'Ödeme, tedarikçinin borcunu eskiden yeniye doğru kapatır.',
    'Belirli bir seferin avansıysa sefer de seçilebilir.',
  ],
  'cek-senet': [
    'Müşteriden aldığınız çek ve senetler burada vadesine göre sıralanır.',
    'Bankaya verince "Tahsile ver", para gelince "Tahsil edildi" deyin.',
    'Taşerona verdiyseniz "Ciro et" ile tedarikçiyi seçin.',
  ],
  'kasa-banka': [
    'Kasa ve banka hesaplarınızın güncel bakiyesi burada görünür.',
    'Tahsilat, ödeme ve giderlerde hesap seçerseniz bakiye kendiliğinden hesaplanır.',
    'Kasadan bankaya para yatırınca "Virman" kullanın.',
  ],
  giderler: [
    'Yakıt, bakım, otoyol gibi masrafları "Gider Ekle" ile girin.',
    'Şoförlerin telefondan girdiği masraflar "Onay bekliyor" olarak gelir; onaylayın ya da reddedin.',
    'Veresiye (vadeli) giderler tedarikçiye borç olarak yazılır.',
  ],
  raporlar: [
    'Üstteki sekmelerden istediğiniz raporu seçin.',
    'Her raporu "Excel\'e Aktar" ile indirebilirsiniz.',
    'Kârlılık raporları seferin satış fiyatından araç maliyeti ve giderleri düşer.',
  ],
  ayarlar: [
    'Firma bilgileri faturalarda ve PDF\'lerde görünür; eksiksiz doldurun.',
    'Kullanıcılar sekmesinden çalışanlara ve şoförlere hesap açın.',
    'Veriler sekmesinden haftada bir tam yedek indirin.',
  ],
}
