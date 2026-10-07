import { useQuery } from '@tanstack/react-query'
import { get } from '../api/client'

/**
 * Nakliye sektöründe yaygın seçenekler (araştırma: Türkiye'deki nakliye panelleri ve UETDS alanları, 7 Ekim 2026).
 * "Akıllı alan" (components/SmartField.tsx) önce firmanın kendi kullandığı değerleri (GET /api/options/{alan}),
 * sonra bu listeyi gösterir. Liste yalnızca öneridir: kullanıcı "Diğer…" ile istediğini yazar, yazdığı aynen kaydedilir.
 *
 * Değerler kayda yazılan metindir; kısa ve listelerde okunur tutulur. `hint` yalnızca açılır listede görünür.
 */
export interface SectorOption {
  value: string
  hint?: string
}

/** Sunucudaki alan adları (server/YesLojistik.Api/Controllers/OptionsController.cs). */
export type OptionField =
  | 'cargoType' | 'cargoUnit' | 'paymentTerms' | 'customerGroup'
  | 'vehicleType' | 'fuelType' | 'vehicleCapacity'
  | 'expenseTitle' | 'expenseCategoryName' | 'expenseRejectionReason'

const o = (value: string, hint?: string): SectorOption => (hint ? { value, hint } : { value })

/** Yük cinsi (sevk belgesine ve UETDS'ye yazılır). */
export const cargoTypeOptions: SectorOption[] = [
  o('Genel kuru yük'), o('Gıda (kuru)'), o('Gıda (soğuk/donuk)', 'soğuk zincir'), o('Tekstil / hazır giyim'),
  o('İnşaat malzemesi', 'çimento, demir, tuğla'), o('Demir-çelik / metal'), o('Otomotiv / yedek parça'),
  o('Makine / iş makinesi'), o('Kimyasal (tehlikesiz)'), o('Tehlikeli madde (ADR)'), o('Tarım ürünü / hububat'),
  o('Hayvan yemi'), o('Kâğıt / ambalaj'), o('Plastik / granül hammadde'), o('Mobilya / beyaz eşya'), o('Elektronik'),
  o('Maden / hafriyat / agrega'), o('İlaç / medikal'), o('Ev-büro eşyası'),
]

/** Miktarın birimi ("12 palet"): kısa yazılır. */
export const cargoUnitOptions: SectorOption[] = [
  o('palet', 'euro 80×120 / endüstriyel 100×120'), o('koli'), o('adet'), o('ton'), o('kg'), o('m³'), o('çuval'),
  o('big bag'), o('rulo / bobin'), o('varil / IBC'), o('demet / paket', 'profil, demir'), o('kasa / sandık'),
  o('konteyner', "20' / 40'"), o('dökme (katı)'), o('dökme (sıvı)'), o('askılı', 'tekstil'), o('desi'),
]

/** Ödeme şekli / vade (sevkiyatta serbest yazı). */
export const paymentTermsOptions: SectorOption[] = [
  o('Peşin'), o('Yüklemede'), o('Teslimde'), o('Evrak teslimde'), o('7 gün'), o('15 gün'), o('30 gün'), o('45 gün'),
  o('60 gün'), o('90 gün'), o('120 gün'), o('Ay sonu + 30 gün'), o('Havale/EFT'), o('Çek'), o('Senet'), o('Nakit'),
  o('Kredi kartı'), o('Mahsup / takas'), o('DBS'),
]

/** Araç tipi (araç kartı; sevkiyat listesinde plakanın yanında görünür). */
export const vehicleTypeOptions: SectorOption[] = [
  o('Tır', 'çekici + dorse'), o('Kırkayak', '10 teker kamyon'), o('Kamyon', '6 teker'), o('Kamyonet'), o('Panelvan'),
  o('Kamyon + römork'), o('Çekici', 'dorsesiz'), o('Midilli', 'kısa kamyon'), o('Pikap'), o('Lowbed'), o('Frigorifik'),
  o('Tenteli'), o('Kapalı kasa'), o('Açık kasa'), o('Damperli'), o('Mega'), o('Jumbo'), o('Silobas'), o('Tanker'),
  o('Konteyner taşıyıcı'), o('Oto taşıyıcı'), o('Vinç'), o('Beton mikser'),
]

export const fuelTypeOptions: SectorOption[] = [
  o('Dizel', 'motorin'), o('Euro dizel'), o('Benzin'), o('LPG'), o('CNG / LNG'), o('Elektrik'), o('Hibrit'), o('AdBlue'),
]

export const vehicleCapacityOptions: SectorOption[] = [
  o('1,5 ton'), o('3,5 ton'), o('7,5 ton'), o('10 ton'), o('15 ton'), o('20 ton'), o('25 ton'), o('27 ton'), o('33 palet'), o('90 m³'),
]

/** Gider adı / gider kalemi. */
export const expenseTitleOptions: SectorOption[] = [
  o('Motorin'), o('AdBlue'), o('HGS / OGS'), o('Köprü / otoyol'), o('Bakım-onarım'), o('Lastik'), o('Yağ / filtre'),
  o('Trafik sigortası'), o('Kasko'), o('MTV'), o('Muayene / egzoz'), o('Şoför harcırahı'), o('Şoför maaşı / SGK'),
  o('Trafik cezası'), o('Takograf / kalibrasyon'), o('Taşeron araç ödemesi'), o('Kredi / leasing taksiti'),
  o('Otopark / yıkama'), o('Yedek parça'), o('Ofis kirası'), o('Hamaliye'), o('Bekleme ücreti'), o('Kantar'),
]

/** Kullanıcının kendi kategori adları için başlangıç önerileri (analizde bu ada göre toplanır). */
export const expenseCategoryNameOptions: SectorOption[] = [
  o('Yakıt'), o('Yol / geçiş'), o('Bakım'), o('Sigorta'), o('Vergi'), o('Personel'), o('Ofis'), o('Taşeron'), o('Finansman'),
]

/** Şoför masrafını reddetme nedeni. */
export const expenseRejectionReasonOptions: SectorOption[] = [
  o('Fiş okunmuyor, tekrar çekin'), o('Fiş eksik'), o('Tutar fişle uyuşmuyor'), o('Mükerrer kayıt'),
  o('Firmaya ait değil'), o('Onaysız harcama'), o('Yanlış araç / sevkiyat'),
]

/** Sevkiyat iptal / sorun nedeni. Panelde henüz neden alanı yok; alan eklendiğinde bu liste kullanılır. */
export const tripProblemReasonOptions: SectorOption[] = [
  o('Müşteri iptal etti'), o('Yük hazır değil'), o('Araç bulunamadı'), o('Araç arızası'), o('Kaza'), o('Şoför gelmedi / değişti'),
  o('Fiyat anlaşmazlığı'), o('Hava / yol kapanması'), o('Evrak eksik'), o('Hasar / eksik teslim'), o('Alıcı teslim almadı'),
  o('Fazla bekleme'), o('Gümrük / liman gecikmesi'), o('Denetimde bekletme'),
]

export const sectorOptions: Record<OptionField, SectorOption[]> = {
  cargoType: cargoTypeOptions,
  cargoUnit: cargoUnitOptions,
  paymentTerms: paymentTermsOptions,
  customerGroup: [],
  vehicleType: vehicleTypeOptions,
  fuelType: fuelTypeOptions,
  vehicleCapacity: vehicleCapacityOptions,
  expenseTitle: expenseTitleOptions,
  expenseCategoryName: expenseCategoryNameOptions,
  expenseRejectionReason: expenseRejectionReasonOptions,
}

/** Firma kullanımı + sektör listesi birleşimi (sunucudan gelen satır). */
export interface OptionUsage { value: string; count: number }

export interface SmartOption { value: string; count: number; hint?: string; preferred?: boolean }

/**
 * Seçenekleri sıralar: önce bağlama özel öneriler (ör. bu müşterinin yük cinsleri), sonra firmanın kullanım sıklığı,
 * en sonda sektör listesi. Büyük/küçük harf ve boşluk farkı aynı seçenek sayılır.
 */
export function mergeOptions(usage: OptionUsage[] | undefined, sector: SectorOption[], preferred: string[] = []): SmartOption[] {
  const key = (s: string) => s.trim().toLocaleLowerCase('tr-TR')
  const out = new Map<string, SmartOption>()
  const hints = new Map(sector.map((s) => [key(s.value), s.hint]))
  for (const p of preferred) {
    if (!p?.trim() || out.has(key(p))) continue
    out.set(key(p), { value: p.trim(), count: 0, preferred: true, hint: hints.get(key(p)) })
  }
  for (const u of usage ?? []) {
    if (!u.value?.trim()) continue
    const existing = out.get(key(u.value))
    if (existing) existing.count += u.count
    else out.set(key(u.value), { value: u.value.trim(), count: u.count, hint: hints.get(key(u.value)) })
  }
  for (const s of sector) if (!out.has(key(s.value))) out.set(key(s.value), { value: s.value, count: 0, hint: s.hint })
  return [...out.values()]
}

/** Firmanın bu alanda kullandığı değerler (sık kullanılan önce). Sunucu yoksa ya da hata verirse yalnız sektör listesi kullanılır. */
export function useOptionUsage(field: OptionField) {
  return useQuery({
    queryKey: ['options', field],
    queryFn: () => get<OptionUsage[]>(`/options/${field}`),
    staleTime: 5 * 60_000,
    retry: false,
    // Öneri listesi yüklenemezse alan yine çalışır: ekranın üstüne hata şeridi düşmesin.
    meta: { silent: true },
  })
}

