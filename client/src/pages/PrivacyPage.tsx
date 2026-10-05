import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { get } from '../api/client'
import { Logo } from '../components/Logo'
import { usePageTitle } from '../lib/usePageTitle'

interface PublicCompany {
  companyName: string
  address?: string | null
  phone?: string | null
  email?: string | null
  taxOffice?: string | null
  taxNumber?: string | null
  mersisNo?: string | null
  website?: string | null
  locationRetentionDays: number
}

function useCompany() {
  return useQuery({ queryKey: ['public', 'company'], queryFn: () => get<PublicCompany>('/public/company'), staleTime: 300_000 })
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b-[3px] border-hl bg-side px-4 py-3"><div className="mx-auto max-w-3xl"><Logo /></div></header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-[1.5rem] font-extrabold tracking-[-0.01em] text-fg">{title}</h1>
        <div className="card space-y-4 p-5 text-[0.9375rem] leading-relaxed text-fg sm:p-7">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link className="hover:underline" to="/gizlilik">Gizlilik ve KVKK</Link> · <Link className="hover:underline" to="/hesap-silme">Hesap ve veri silme</Link> · <Link className="hover:underline" to="/giris">Giriş</Link>
        </p>
      </main>
    </div>
  )
}

function Contact({ c }: { c?: PublicCompany }) {
  if (!c) return null
  return (
    <p>
      <b>{c.companyName}</b>
      {c.address && <><br />{c.address}</>}
      {(c.taxOffice || c.taxNumber) && <><br />{c.taxOffice} V.D. {c.taxNumber}</>}
      {c.mersisNo && <><br />MERSİS: {c.mersisNo}</>}
      {c.phone && <><br />Telefon: {c.phone}</>}
      {c.email && <><br />E-posta: <a className="text-brand-600" href={`mailto:${c.email}`}>{c.email}</a></>}
    </p>
  )
}

/**
 * Gizlilik politikası ve KVKK aydınlatma metni (herkese açık; mobil uygulama mağaza sayfası ve rıza ekranı buraya bağlanır).
 * Bu metin bir şablondur; hukuki danışmanın gözden geçirmesi önerilir.
 */
export function PrivacyPage() {
  usePageTitle('Gizlilik ve KVKK')
  const { data: c } = useCompany()
  const name = c?.companyName ?? 'Firma'
  return (
    <Page title="Gizlilik Politikası ve KVKK Aydınlatma Metni">
      <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu olarak <b>{name}</b>, taşıma takip sistemi (web paneli ve YES Lojistik mobil uygulaması) üzerinden işlenen kişisel veriler hakkında sizi bilgilendirir.</p>
      <h2 className="text-lg font-medium text-navy-900">Veri sorumlusu</h2>
      <Contact c={c} />
      <h2 className="text-lg font-medium text-navy-900">Hangi verileri, neden işliyoruz?</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Kimlik ve iletişim:</b> ad soyad, telefon, e-posta; hesap açmak, sevkiyat atamak ve iletişim kurmak için.</li>
        <li><b>Şoför belgeleri:</b> ehliyet sınıfı ve SRC/psikoteknik bitiş tarihleri; yasal yükümlülükleri takip etmek için.</li>
        <li><b>Konum:</b> şoförün telefonundan, yalnızca atanmış bir sevkiyat <i>yüklendi</i> veya <i>yolda</i> durumundayken ve şoförün açık rızasıyla; sevkiyatın takibi ve müşteriye bilgi verilmesi için.</li>
        <li><b>Teslim kanıtı:</b> teslim alan kişinin adı, imzası ve teslim fotoğrafları; teslimatın ispatı için.</li>
        <li><b>Masraf ve fişler:</b> tutar, tarih, fiş fotoğrafı; muhasebe ve şoför hesabının tutulması için.</li>
        <li><b>Kullanım kayıtları:</b> giriş zamanı ve yapılan değişiklikler (işlem geçmişi); güvenlik ve hesap verebilirlik için.</li>
      </ul>
      <h2 className="text-lg font-medium text-navy-900">Hukuki sebep</h2>
      <p>Sözleşmenin kurulması ve ifası, hukuki yükümlülüklerin yerine getirilmesi ve meşru menfaat (KVKK m.5/2). Konum verisi için açık rıza (KVKK m.5/1); rıza her zaman geri alınabilir.</p>
      <h2 className="text-lg font-medium text-navy-900">Kimlere aktarılır?</h2>
      <p>Sevkiyat durumu ve araç konumu, yalnızca ilgili sevkiyatın müşterisine gönderilen takip bağlantısında (teslimden en geç 7 gün sonrasına kadar) gösterilir. Fatura bilgileri yasal zorunluluk hâlinde e-Fatura entegratörü ve Gelir İdaresi Başkanlığı ile paylaşılır. Veriler barındırma hizmeti sağlayıcısının sunucularında saklanır. Veriler satılmaz, reklam amacıyla kullanılmaz.</p>
      <h2 className="text-lg font-medium text-navy-900">Ne kadar saklanır?</h2>
      <p>Konum kayıtları {c?.locationRetentionDays ?? 90} gün sonra otomatik silinir. İşlem geçmişi 2 yıl saklanır. Fatura, tahsilat ve sevkiyat kayıtları vergi mevzuatının öngördüğü süre (10 yıl) boyunca saklanır.</p>
      <h2 className="text-lg font-medium text-navy-900">Haklarınız (KVKK m.11)</h2>
      <p>Verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı kişileri öğrenme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz. Başvurularınızı yukarıdaki iletişim bilgileriyle yazılı olarak iletebilirsiniz; en geç 30 gün içinde yanıtlanır.</p>
      <p className="text-sm text-slate-500">Son güncelleme: 29.09.2026</p>
    </Page>
  )
}

/** Hesap ve veri silme talebi (Google Play "hesap silme" şartı). */
export function AccountDeletionPage() {
  usePageTitle('Hesap ve veri silme')
  const { data: c } = useCompany()
  return (
    <Page title="Hesap ve Veri Silme">
      <p>YES Lojistik uygulaması hesapları firma tarafından açılır. Hesabınızın ve kişisel verilerinizin silinmesini istiyorsanız:</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Aşağıdaki iletişim bilgilerinden firmaya <b>"hesabımın silinmesini istiyorum"</b> diye yazın; adınızı ve hesabın e-posta adresini belirtin.</li>
        <li>Talebiniz en geç 30 gün içinde işlenir: uygulama hesabınız ve oturumlarınız kapatılır, konum kayıtlarınız ve kişisel iletişim bilgileriniz silinir.</li>
        <li>Fatura ve sevkiyat gibi yasal saklama süresi olan kayıtlar, süre dolana kadar kimliğinizden ayrılmış olarak saklanır.</li>
      </ol>
      <Contact c={c} />
      <p>Konum paylaşımını hemen durdurmak için telefon ayarlarından uygulamanın konum iznini kapatabilirsiniz.</p>
    </Page>
  )
}
