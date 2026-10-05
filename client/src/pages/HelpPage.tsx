import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Bell, Copy, DatabaseZap, FileSpreadsheet, Handshake, HardDrive, FileText, Fuel, HelpCircle, History, Link2, Mail, MapPin, Smartphone, Truck, Users, Wallet } from 'lucide-react'
import { Badge, PageHeader } from '../components/ui'

function Section({ icon, title, children, open }: { icon: ReactNode; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="card group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-[0.9375rem] font-medium text-navy-900">
        <span className="text-brand-600">{icon}</span>
        <span className="flex-1">{title}</span>
        <span className="text-slate-500 transition group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-4 py-4 text-[0.9375rem] leading-relaxed text-slate-700">{children}</div>
    </details>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  )
}

const L = ({ to, children }: { to: string; children: ReactNode }) => <Link to={to} className="font-medium text-brand-700 underline underline-offset-2">{children}</Link>

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Yardım" subtitle="Sistemi nasıl kullanacağınız, adım adım" />
      <div className="space-y-3">
        <Section icon={<Truck className="size-5" />} title="Günlük iş akışı" open>
          <Steps items={[
            <>Sevkiyat açın: <L to="/seferler?new=1">Sevkiyatlar → Yeni Sevkiyat</L>. Müşteri, araç, il ve adresler, yük bilgisi ve fiyatları girin; tahmini kâr hemen görünür. Müşterinin sipariş numarasını “Müşteri Referans No”ya yazarsanız faturaya da basılır.</>,
            <>Sevkiyat ilerledikçe listedeki düğmeyle durumu güncelleyin (ya da şoför mobil uygulamadan günceller).</>,
            <>Masrafları <L to="/giderler">Giderler</L> sayfasından girin; sevkiyata bağlarsanız o sevkiyatın kârından düşülür.</>,
            <>Sevkiyat bitince <L to="/faturalar/yeni">Faturalar → Yeni Fatura</L> ile müşteriyi seçin, teslim edilen sevkiyatlar kendiliğinden işaretlenir.</>,
            <>Ödeme gelince faturanın içinden <b>Tahsilat Ekle</b> deyin. Müşterinin cari bakiyesi kendiliğinden güncellenir.</>,
          ]} />
        </Section>

        <Section icon={<Handshake className="size-5" />} title="Kiralık araç (taşeron) ve tedarikçiler">
          <p>Dışarıdan tutulan araçların sahipleri <L to="/tedarikciler">Tedarikçiler</L> sayfasında tutulur. Servis ve akaryakıt istasyonları da buraya eklenebilir.</p>
          <Steps items={[
            <>Araç sahibini <b>Yeni Tedarikçi</b> ile ekleyin (IBAN'ı yazarsanız ödeme yaparken tek tuşla kopyalanır).</>,
            <><L to="/araclar">Araçlar</L> sayfasında aracın <b>Sahiplik</b> alanını “Kiralık” yapıp araç sahibini seçin. Dorse plakasını da girebilirsiniz.</>,
            <>Bu araçla sevkiyat açınca form “Taşeron” bölümünü gösterir; <b>Taşerona Ödenecek</b> tutarı araç sahibine borç yazılır. Şoför listede yoksa <b>+ Hızlı şoför ekle</b> deyin.</>,
            <>Borç, sevkiyat <b>Yüklendi</b> olduğunda oluşur; planlanmış ve iptal edilen sevkiyat borç doğurmaz. Tedarikçinin sayfasında toplam borcu ve sevkiyatları görürsünüz.</>,
            <>Ödeme yapınca tedarikçi sayfasında <b>Ödeme Yap</b> deyin ya da <L to="/odemeler">Ödemeler</L> sayfasını kullanın. Ödeme en eski borçtan başlayarak kapatır; bir sevkiyata bağlarsanız önce o sevkiyatı kapatır.</>,
            <>Veresiye yakıt, tamircide açık hesap gibi giderleri <L to="/giderler">Giderler</L>'de tedarikçiyi seçip <b>Vadeli</b> işaretleyerek girin; borca eklenir. Fişin fotoğrafını da ekleyebilirsiniz.</>,
            <><b>Hesap Ekstresi</b> düğmesi mutabakat için PDF verir. Vadesi geçen borçlar ve 15 günü geçtiği halde faturası gelmeyen sevkiyatlar ana sayfadaki uyarılarda çıkar; <L to="/raporlar">Raporlar</L>'da <b>Borç Yaşlandırma</b> ve <b>Tedarikçiler</b> sekmeleri var.</>,
          ]} />
        </Section>

        <Section icon={<FileSpreadsheet className="size-5" />} title="Gerçek verilere geçiş (canlıya geçiş)">
          <p><L to="/ayarlar?tab=data">Ayarlar → Veriler</L> sayfasındaki <b>Canlıya geçiş</b> kartı adımları sırayla gösterir ve yapılanları kendiliğinden işaretler:</p>
          <Steps items={[
            <>Demo verilerini temizleyin.</>,
            <>Firma bilgilerini, logoyu, il/ilçeyi ve IBAN'ı girin.</>,
            <>Ofis ve şoför hesaplarını açın.</>,
            <>Excel'den aktarın, bu sırayla: <b>Tedarikçiler → Müşteriler → Şoförler → Araçlar → Sevkiyatlar</b>. Her sayfadaki “Excel'den Aktar” düğmesi şablonu verir; önce “Kontrol Et”, hata yoksa aktarılır.</>,
            <>Devir bakiyelerinin toplamını eski defterinizle karşılaştırın ve sıradaki fatura numarasını kontrol edin.</>,
            <>İlk tam yedeği indirin.</>,
          ]} />
        </Section>

        <Section icon={<HardDrive className="size-5" />} title="Yedekler">
          <p>Her gece otomatik yedek alınır ve sağlamlığı denenir. Ayrıca haftada bir <L to="/ayarlar?tab=data">Ayarlar → Veriler → Tam yedeği indir</L> ile yedeği indirip telefonunuza ya da bilgisayarınıza kaydedin. Yedek, tüm kayıtları ve yüklenen fotoğrafları içerir.</p>
          <p>Aynı kartta veritabanının doluluğu görünür; ücretsiz sunucuda sınır 1 GB'tır.</p>
        </Section>

        <Section icon={<Truck className="size-5" />} title="Sevkiyat durumları ne anlama geliyor?">
          <ul className="space-y-2">
            <li><Badge tone="blue">Planlandı</Badge> Sevkiyat oluşturuldu, yük henüz alınmadı.</li>
            <li><Badge tone="teal">Yüklendi</Badge> Yük araca yüklendi. Araç “Yolda” görünür, konum paylaşımı başlar.</li>
            <li><Badge tone="yellow">Yolda</Badge> Araç yola çıktı.</li>
            <li><Badge tone="green">Teslim Edildi</Badge> Yük teslim edildi, sevkiyat faturalanabilir.</li>
            <li><Badge tone="gray">İptal</Badge> Sevkiyat yapılmadı. Faturalanmış sevkiyat iptal edilemez; önce faturayı iptal edin.</li>
          </ul>
          <p>Yanlış basılan bir durumu sevkiyata tıklayıp açılan penceredeki düğmelerle bir adım geri alabilirsiniz.</p>
        </Section>

        <Section icon={<FileText className="size-5" />} title="Fatura, KDV ve tevkifat">
          <p>Varsayılan KDV %20, tevkifat 2/10'dur; <L to="/ayarlar">Ayarlar</L> sayfasından değiştirilebilir. Örnek: 25.000 TL navlun → 5.000 TL KDV − 1.000 TL tevkifat = <b>29.000 TL</b> ödenecek tutar.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Taslak Kaydet</b>: sonra kesmek için saklar, cari bakiyeye yansımaz.</li>
            <li><b>Faturayı Kes</b>: kesinleştirir, müşterinin borcuna yazılır. <b>PDF</b> ile yazdırın veya gönderin.</li>
            <li>Hatalı fatura <b>silinmez, iptal edilir</b>; numara korunur, sevkiyatlar tekrar faturalanabilir.</li>
          </ul>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">Bu faturalar sistem içi kayıttır. Resmi e-Fatura/e-Arşiv muhasebe programınızdan kesilmeye devam eder.</p>
        </Section>

        <Section icon={<Wallet className="size-5" />} title="Cari hesap, tahsilat ve devir bakiyesi">
          <p>Müşteriye tıklayınca cari kartı açılır: <b>Toplam Borç</b> (kesilen faturalar), <b>Toplam Alacak</b> (tahsilatlar) ve <b>Cari Bakiye</b>. “Hareketler” sekmesi her işlemi yürüyen bakiyeyle gösterir.</p>
          <p>Tahsilatı bir faturaya bağlamazsanız en eski açık faturadan başlayarak kapatılır. Müşterinin sisteme geçmeden önceki borcunu müşteri formundaki <b>Devir Bakiyesi</b> alanına yazın.</p>
        </Section>

        <Section icon={<FileSpreadsheet className="size-5" />} title="Mevcut listeleri Excel'den aktarma">
          <Steps items={[
            <><L to="/musteriler">Müşteriler</L>, <L to="/araclar">Araçlar</L> veya <L to="/soforler">Şoförler</L> sayfasında <b>Excel'den Aktar</b> düğmesine basın.</>,
            <><b>Şablonu İndir</b> → Excel'de doldurun (örnek satırı silin).</>,
            <><b>Dosya Seç</b> → <b>Kontrol Et</b>. Hatalı satırlar satır numarasıyla listelenir; hepsi düzelene kadar hiçbir kayıt eklenmez.</>,
            <>Hata yoksa <b>Aktar</b>. Sistemde zaten kayıtlı olanlar atlanır.</>,
          ]} />
        </Section>

        <Section icon={<Smartphone className="size-5" />} title="Şoför mobil uygulaması">
          <Steps items={[
            <><L to="/ayarlar?tab=users">Ayarlar → Kullanıcılar → Yeni Kullanıcı</L>: rolü <b>Şoför (mobil)</b> seçin ve şoförü bağlayın.</>,
            <>Şoför uygulamaya bu e-posta ve şifreyle girer; yalnızca kendi sevkiyatlarını görür, fiyatları görmez.</>,
            <>Sevkiyatta sırayla <b>Yükü Aldım → Yola Çıktım → Teslim Ettim</b> der, teslim fotoğrafı veya imzalı irsaliye yükler.</>,
            <>Yolda yaptığı <b>yakıt</b> (litre ve km ile), otoyol/köprü ve onarım masraflarını <b>Masraf / Yakıt</b> bölümünden girer; masraf sevkiyata, araca ve şoföre bağlanarak <L to="/giderler">Giderler</L>'e düşer.</>,
            <>Yük alındığı andan teslime kadar konum kendiliğinden paylaşılır. Sevkiyat atadığınızda şoföre bildirim gider.</>,
          ]} />
        </Section>

        <Section icon={<MapPin className="size-5" />} title="Araç takip haritası">
          <p><L to="/harita">Araç Takip Haritası</L> araçların son konumunu gösterir ve 30 saniyede bir yenilenir. Listeden bir araca tıklayınca o sevkiyatın izlediği yol çizilir.</p>
        </Section>

        <Section icon={<Link2 className="size-5" />} title="Müşteriye takip linki gönderme">
          <Steps items={[
            <>Sevkiyata tıklayın → <b>Takip ve Rota</b> sekmesi → <b>Takip Linki Oluştur</b>.</>,
            <><b>WhatsApp ile Gönder</b> ya da <b>Kopyala</b>. Müşteri giriş yapmadan sevkiyatın aşamasını ve araç yoldayken konumunu görür.</>,
          ]} />
          <p>Linkte fiyat ve şoför bilgisi yoktur, plakanın son haneleri gizlenir. Teslimden 7 gün sonra link kapanır.</p>
        </Section>

        <Section icon={<Copy className="size-5" />} title="Sevk belgesi ve sevkiyat kopyalama">
          <ul className="list-disc space-y-1 pl-5">
            <li>Sevkiyata tıklayın → <b>Sevk Belgesi</b>: araçta taşınacak, teslimde imzalatılacak belge. Fiyat içermez.</li>
            <li><b>Kopyala</b>: aynı müşteri, güzergah, araç ve fiyatla bugünün tarihine yeni sevkiyat açar. Düzenli sevkiyatlar için idealdir.</li>
          </ul>
        </Section>

        <Section icon={<FileText className="size-5" />} title="Hesap ekstresi (mutabakat)">
          <p>Müşteri kartında <b>Hesap Ekstresi</b>: tarih aralığı seçin, <b>PDF Aç</b> ya da <b>E-postayla Gönder</b>. Devreden bakiye, dönemdeki faturalar ve tahsilatlar, güncel bakiye listelenir.</p>
        </Section>

        <Section icon={<Fuel className="size-5" />} title="Yakıt takibi ve şoför avansı">
          <ul className="list-disc space-y-1 pl-5">
            <li>Yakıt giderine <b>litre</b> ve <b>araç kilometresini</b> yazın. <L to="/raporlar">Raporlar → Yakıt</L> her aracın 100 km'de kaç litre yaktığını gösterir; ortalamanın belirgin üstündeki araç kırmızı görünür.</li>
            <li>Depoyu her sevkiyatında doldurup o anki km'yi yazarsanız sonuç en doğru olur. Girilen km araç kartındaki km'yi de günceller.</li>
            <li>Şoföre verilen avans için <b>Şoför Avansı</b> kategorisini seçip şoförü işaretleyin. <b>Raporlar → Şoför Bazlı</b> avans ve harcırah toplamlarını gösterir.</li>
          </ul>
        </Section>

        <Section icon={<HelpCircle className="size-5" />} title="Genel arama ve telefona kurma">
          <ul className="list-disc space-y-1 pl-5">
            <li>Üst çubuktaki <b>Ara</b> kutusu (ya da <b>Ctrl+K</b>): plaka, müşteri, sevkiyat referans no, fatura no, şoför ve tedarikçi arar; sonuca tıklayınca kayıt açılır.</li>
            <li>Paneli telefona uygulama gibi kurmak için: iPhone'da Safari → Paylaş → <b>Ana Ekrana Ekle</b>; Android'de Chrome menüsü → <b>Uygulamayı yükle</b>.</li>
            <li><L to="/raporlar">Raporlar</L> → <b>Müşteri Kârlılığı</b> ve <b>Güzergâh</b>: hangi müşteri ve hangi il-il hattının ne kadar kazandırdığını gösterir.</li>
          </ul>
        </Section>

        <Section icon={<Wallet className="size-5" />} title="Çek / senet, kasa / banka ve nakit akışı">
          <ul className="list-disc space-y-1 pl-5">
            <li>Çek ya da senetle gelen tahsilatı Tahsilatlar'da yöntemi <b>Çek</b> / <b>Senet</b> seçip numarası, bankası ve vadesiyle girin; <L to="/cek-senet">Çek / Senet</L> portföyüne düşer. Vadesine 7 gün kala uyarı çıkar.</li>
            <li>Portföydeki çeki <b>Tahsile ver</b>, <b>Tahsil edildi</b> (hesabını seçin), <b>Ciro et</b> (tedarikçiye ödeme olarak yazılır) ya da <b>Karşılıksız</b> / <b>İade</b> olarak işaretleyin. Karşılıksız ve iade çek müşterinin bakiyesinden düşmez; ciro edilmişse tedarikçi ödemesi de geri alınır.</li>
            <li><L to="/kasa-banka">Kasa / Banka</L>: hesaplarınızı açılış bakiyesiyle açın. Tahsilat, ödeme, gider ve şoför ödemesinde hesap seçerseniz bakiye kendiliğinden hesaplanır. Hesaplar arası para aktarımı için <b>Virman</b>.</li>
            <li>Ana sayfadaki <b>Nakit Akışı</b> kartı önümüzdeki 4 haftada beklenen tahsilatı (fatura vadeleri, çek/senetler) ve taşeron/tedarikçi ödemelerini gösterir.</li>
            <li>Müşteri kartında <b>Risk limiti</b> girerseniz, açık bakiye + faturalanmamış sevkiyatlar limiti aşınca sevkiyat formunda ve bildirimlerde uyarı çıkar. Vadesi geçmiş alacakta müşteri sayfasındaki <b>Vade Hatırlatma</b> e-posta (ekstre ekli) ya da WhatsApp mesajı hazırlar.</li>
          </ul>
        </Section>

        <Section icon={<Wallet className="size-5" />} title="Şoför masraf onayı ve şoför hesabı">
          <ul className="list-disc space-y-1 pl-5">
            <li>Şoförün uygulamadan girdiği masraf <b>Onay bekliyor</b> olarak düşer; ana sayfada sayısı görünür. <L to="/giderler?onay=Pending">Giderler</L> sayfasında <b>Onayla</b> ya da gerekçe yazıp <b>Reddet</b> deyin. Gerekçe şoföre bildirim olarak gider.</li>
            <li>Raporlar, ana sayfa ve sevkiyat kârı yalnızca <b>onaylı</b> masrafları sayar.</li>
            <li>Şoför kartındaki <b>Hesap</b> sekmesi: verilen avans ve ödemeler bakiyeyi artırır; şoförün cebinden yaptığı onaylı masraflar ve geri verdiği para düşürür. Pozitif bakiye “şoförde kalan firma parası”, negatif bakiye “şoföre borcumuz” demektir. Mahsuplaşma için <b>Ödeme / İade Gir</b> kullanın.</li>
          </ul>
        </Section>

        <Section icon={<FileText className="size-5" />} title="Araç ve şoför belgeleri, bakım">
          <ul className="list-disc space-y-1 pl-5">
            <li>Araç ya da şoför kartını açıp <b>Belgeler</b> sekmesinden kasko, K belgesi, takograf, SRC gibi belgeleri numarası, bitiş tarihi ve taranmış dosyasıyla ekleyin. Firma belgeleri Ayarlar → Firma Bilgileri'nde.</li>
            <li>Bitişe 30 gün kala zil simgesinde ve sabah özetinde uyarı çıkar.</li>
            <li>Araç kartındaki <b>Bakım</b> sekmesine girilen kayıt, tutarı “Bakım” gideri olarak da yazar (çift sayılmaz) ve aracın km'sini, son/sonraki bakımını günceller. <b>Sonraki bakım km</b>'sine 1.000 km kala uyarı çıkar.</li>
          </ul>
        </Section>

        <Section icon={<Mail className="size-5" />} title="Müşteriye otomatik e-posta ve sabah özeti">
          <ul className="list-disc space-y-1 pl-5">
            <li>Müşteri kartında <b>Sevkiyat durumu değişince müşteriye e-posta gönder</b> işaretliyse, yük yüklendiğinde, yola çıktığında ve teslim edildiğinde müşteriye takip linkli e-posta gider.</li>
            <li><L to="/ayarlar">Ayarlar → Bildirimler → Sabah uyarı özeti</L>: her sabah 08:00'de yöneticilere bakım, belge ve vadesi geçen alacak uyarıları e-postayla gelir.</li>
            <li>E-postaların çalışması için sunucuda e-posta (SMTP) ayarının yapılmış olması gerekir.</li>
          </ul>
        </Section>

        <Section icon={<History className="size-5" />} title="İşlem geçmişi">
          <p><L to="/ayarlar?tab=audit">Ayarlar → İşlem Geçmişi</L> (yalnızca yönetici): kim, ne zaman, hangi kaydı oluşturdu, değiştirdi ya da sildi; değişen alanların eski ve yeni değeriyle. Bir sevkiyatın geçmişi, sevkiyat penceresindeki <b>Geçmiş</b> sekmesinde de görünür.</p>
        </Section>

        <Section icon={<DatabaseZap className="size-5" />} title="Demo verilerden gerçek kullanıma geçiş">
          <p>Program örnek verilerle açıldıysa ana sayfada sarı bir uyarı görünür. Deneme bitince <L to="/ayarlar?tab=data">Ayarlar → Veriler</L> bölümünde kutuya <b>SİL</b> yazıp onaylayın: müşteri, araç, sevkiyat, fatura gibi bütün kayıtlar silinir; firma bilgileri ve personel hesapları kalır, numaralar 1'den başlar.</p>
        </Section>

        <Section icon={<Bell className="size-5" />} title="Bildirimler (zil simgesi)">
          <ul className="list-disc space-y-1 pl-5">
            <li>Periyodik bakımı 15 gün içinde olan veya geçmiş araçlar</li>
            <li>Muayene, trafik sigortası, ehliyet, SRC ve psikoteknik süresi 30 gün içinde dolacaklar</li>
            <li>Vadesi geçmiş alacaklar (müşteri bazında)</li>
          </ul>
          <p>Bildirime tıklayınca ilgili kayıt açılır.</p>
        </Section>

        <Section icon={<BarChart3 className="size-5" />} title="Raporlar">
          <p><L to="/raporlar">Raporlar</L>: aylık özet, sevkiyat kârlılığı, araç ve şoför bazlı gelir-gider, yakıt tüketimi, alacak yaşlandırma ve gider dağılımı. Her rapor ve liste <b>Excel</b> düğmesiyle indirilebilir.</p>
        </Section>

        <Section icon={<Users className="size-5" />} title="Kullanıcılar ve yetkiler">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Yönetici</b>: her şey, kullanıcı ve firma ayarları</li>
            <li><b>Operasyon</b>: sevkiyat, araç, şoför</li>
            <li><b>Muhasebe</b>: fatura, tahsilat, raporlar</li>
            <li><b>Şoför (mobil)</b>: yalnızca mobil uygulama</li>
          </ul>
          <p>Ayrılan personelin hesabını silmek yerine <b>pasife alın</b>; oturumu hemen kapanır.</p>
        </Section>

        <Section icon={<HelpCircle className="size-5" />} title="Sık sorulanlar">
          <dl className="space-y-3">
            <div><dt className="font-medium">Şifremi unuttum.</dt><dd>Yönetici, <L to="/ayarlar?tab=users">Kullanıcılar</L> ekranında hesabınıza yeni şifre verebilir.</dd></div>
            <div><dt className="font-medium">Sevkiyatı silemiyorum.</dt><dd>Faturalanmış sevkiyat silinemez. Önce faturayı iptal edin.</dd></div>
            <div><dt className="font-medium">Araç sürekli “Yolda” görünüyor.</dt><dd>Aracın yüklendi/yolda durumunda sevkiyatı vardır. O sevkiyatı “Teslim Edildi” yapınca araç “Müsait” olur.</dd></div>
            <div><dt className="font-medium">Faturayı iptal edemiyorum.</dt><dd>Faturaya bağlı tahsilat vardır. Önce tahsilatı silin veya düzenleyip fatura bağlantısını kaldırın.</dd></div>
            <div><dt className="font-medium">Haritada araç görünmüyor.</dt><dd>Şoförün mobil uygulamada oturum açmış ve konum izni vermiş olması gerekir; konum yalnızca aktif sevkiyatta paylaşılır.</dd></div>
          </dl>
        </Section>
      </div>
    </div>
  )
}
