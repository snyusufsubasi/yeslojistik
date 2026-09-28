import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Bell, FileSpreadsheet, FileText, HelpCircle, Link2, MapPin, Smartphone, Truck, Users, Wallet } from 'lucide-react'
import { Badge, PageHeader } from '../components/ui'

function Section({ icon, title, children, open }: { icon: ReactNode; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="card group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-base font-semibold text-navy-900">
        <span className="text-brand-600">{icon}</span>
        <span className="flex-1">{title}</span>
        <span className="text-slate-500 transition group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-4 py-4 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </details>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
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
            <>Sefer açın: <L to="/seferler?new=1">Seferler → Yeni Sefer</L>. Müşteri, araç, adresler ve fiyatları girin; tahmini kâr hemen görünür.</>,
            <>Sefer ilerledikçe listedeki düğmeyle durumu güncelleyin (ya da şoför mobil uygulamadan günceller).</>,
            <>Masrafları <L to="/giderler">Giderler</L> sayfasından girin; sefere bağlarsanız o seferin kârından düşülür.</>,
            <>Sefer bitince <L to="/faturalar/yeni">Faturalar → Yeni Fatura</L> ile müşteriyi seçin, teslim edilen seferler kendiliğinden işaretlenir.</>,
            <>Ödeme gelince faturanın içinden <b>Tahsilat Ekle</b> deyin. Müşterinin cari bakiyesi kendiliğinden güncellenir.</>,
          ]} />
        </Section>

        <Section icon={<Truck className="size-5" />} title="Sefer durumları ne anlama geliyor?">
          <ul className="space-y-2">
            <li><Badge tone="blue">Planlandı</Badge> Sefer oluşturuldu, yük henüz alınmadı.</li>
            <li><Badge tone="teal">Yüklendi</Badge> Yük araca yüklendi. Araç “Yolda” görünür, konum paylaşımı başlar.</li>
            <li><Badge tone="yellow">Yolda</Badge> Araç yola çıktı.</li>
            <li><Badge tone="green">Teslim Edildi</Badge> Yük teslim edildi, sefer faturalanabilir.</li>
            <li><Badge tone="gray">İptal</Badge> Sefer yapılmadı. Faturalanmış sefer iptal edilemez; önce faturayı iptal edin.</li>
          </ul>
          <p>Yanlış basılan bir durumu sefere tıklayıp açılan penceredeki düğmelerle bir adım geri alabilirsiniz.</p>
        </Section>

        <Section icon={<FileText className="size-5" />} title="Fatura, KDV ve tevkifat">
          <p>Varsayılan KDV %20, tevkifat 2/10'dur; <L to="/ayarlar">Ayarlar</L> sayfasından değiştirilebilir. Örnek: 25.000 TL navlun → 5.000 TL KDV − 1.000 TL tevkifat = <b>29.000 TL</b> ödenecek tutar.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Taslak Kaydet</b>: sonra kesmek için saklar, cari bakiyeye yansımaz.</li>
            <li><b>Faturayı Kes</b>: kesinleştirir, müşterinin borcuna yazılır. <b>PDF</b> ile yazdırın veya gönderin.</li>
            <li>Hatalı fatura <b>silinmez, iptal edilir</b>; numara korunur, seferler tekrar faturalanabilir.</li>
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
            <>Şoför uygulamaya bu e-posta ve şifreyle girer; yalnızca kendi seferlerini görür, fiyatları görmez.</>,
            <>Seferde sırayla <b>Yükü Aldım → Yola Çıktım → Teslim Ettim</b> der, teslim fotoğrafı veya imzalı irsaliye yükler.</>,
            <>Yük alındığı andan teslime kadar konum kendiliğinden paylaşılır. Sefer atadığınızda şoföre bildirim gider.</>,
          ]} />
        </Section>

        <Section icon={<MapPin className="size-5" />} title="Araç takip haritası">
          <p><L to="/harita">Araç Takip Haritası</L> araçların son konumunu gösterir ve 30 saniyede bir yenilenir. Listeden bir araca tıklayınca o seferin izlediği yol çizilir.</p>
        </Section>

        <Section icon={<Link2 className="size-5" />} title="Müşteriye takip linki gönderme">
          <Steps items={[
            <>Sefere tıklayın → <b>Takip ve Rota</b> sekmesi → <b>Takip Linki Oluştur</b>.</>,
            <><b>WhatsApp ile Gönder</b> ya da <b>Kopyala</b>. Müşteri giriş yapmadan sevkiyatın aşamasını ve araç yoldayken konumunu görür.</>,
          ]} />
          <p>Linkte fiyat ve şoför bilgisi yoktur, plakanın son haneleri gizlenir. Teslimden 7 gün sonra link kapanır.</p>
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
          <p><L to="/raporlar">Raporlar</L>: aylık özet, sefer kârlılığı, araç ve şoför bazlı gelir-gider, alacak yaşlandırma ve gider dağılımı. Her rapor ve liste <b>Excel</b> düğmesiyle indirilebilir.</p>
        </Section>

        <Section icon={<Users className="size-5" />} title="Kullanıcılar ve yetkiler">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Yönetici</b>: her şey, kullanıcı ve firma ayarları</li>
            <li><b>Operasyon</b>: sefer, araç, şoför</li>
            <li><b>Muhasebe</b>: fatura, tahsilat, raporlar</li>
            <li><b>Şoför (mobil)</b>: yalnızca mobil uygulama</li>
          </ul>
          <p>Ayrılan personelin hesabını silmek yerine <b>pasife alın</b>; oturumu hemen kapanır.</p>
        </Section>

        <Section icon={<HelpCircle className="size-5" />} title="Sık sorulanlar">
          <dl className="space-y-3">
            <div><dt className="font-semibold">Şifremi unuttum.</dt><dd>Yönetici, <L to="/ayarlar?tab=users">Kullanıcılar</L> ekranında hesabınıza yeni şifre verebilir.</dd></div>
            <div><dt className="font-semibold">Seferi silemiyorum.</dt><dd>Faturalanmış sefer silinemez. Önce faturayı iptal edin.</dd></div>
            <div><dt className="font-semibold">Araç sürekli “Yolda” görünüyor.</dt><dd>Aracın yüklendi/yolda durumunda seferi vardır. O seferi “Teslim Edildi” yapınca araç “Müsait” olur.</dd></div>
            <div><dt className="font-semibold">Faturayı iptal edemiyorum.</dt><dd>Faturaya bağlı tahsilat vardır. Önce tahsilatı silin veya düzenleyip fatura bağlantısını kaldırın.</dd></div>
            <div><dt className="font-semibold">Haritada araç görünmüyor.</dt><dd>Şoförün mobil uygulamada oturum açmış ve konum izni vermiş olması gerekir; konum yalnızca aktif seferde paylaşılır.</dd></div>
          </dl>
        </Section>
      </div>
    </div>
  )
}
