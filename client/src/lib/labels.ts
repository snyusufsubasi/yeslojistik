import type { ApprovalStatus, CashAccountKind, CommissionStatus, DriverRating, InvoiceNoteKind, PurchaseInvoiceKind, InstrumentStatus, AttachmentKind, DocumentType, ExpenseCategory, InvoiceStatus, MaintenanceType, PaymentMethod, SettlementDirection, SupplierKind, TripEventSource, TripStatus, UserRole, VehicleOwnership, VehicleStatus } from '../api/types'

export const tripStatusLabel: Record<TripStatus, string> = {
  Planned: 'Planlandı',
  Loaded: 'Yüklendi',
  OnRoad: 'Yolda',
  Delivered: 'Teslim Edildi',
  Cancelled: 'İptal',
}

/** Duruma geçiş düğmelerinde kullanılan ifade ("şu duruma getir"). */
export const tripStatusAction: Record<TripStatus, string> = {
  Planned: 'Planlandıya geri al',
  Loaded: 'Yüklendi yap',
  OnRoad: 'Yola çıktı yap',
  Delivered: 'Teslim edildi yap',
  Cancelled: 'Seferi iptal et',
}

export const vehicleStatusLabel: Record<VehicleStatus, string> = {
  Available: 'Müsait',
  OnRoad: 'Yolda',
  Maintenance: 'Bakımda',
}

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  Draft: 'Taslak',
  Issued: 'Kesildi',
  Cancelled: 'İptal',
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  Cash: 'Nakit',
  BankTransfer: 'Havale/EFT',
  Check: 'Çek',
  CreditCard: 'Kredi Kartı',
  PromissoryNote: 'Senet',
}

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  Fuel: 'Yakıt',
  Maintenance: 'Bakım/Onarım',
  Toll: 'Otoyol/Köprü',
  DriverAllowance: 'Şoför Harcırahı',
  DriverAdvance: 'Şoför Avansı',
  Tire: 'Lastik',
  Insurance: 'Sigorta/Kasko',
  Tax: 'Vergi/Harç',
  Other: 'Diğer',
}

/** Gider kategorisinin varsayılan KDV oranı (sunucudaki ExpenseVat.DefaultFor ile aynı). Yemek/konaklama için "Diğer"de %10 seçilir. */
export const expenseVatDefault: Record<ExpenseCategory, number> = {
  Fuel: 20,
  Maintenance: 20,
  Toll: 20,
  Tire: 20,
  Other: 20,
  Insurance: 0,
  Tax: 0,
  DriverAllowance: 0,
  DriverAdvance: 0,
}

export const roleLabel: Record<UserRole, string> = {
  Admin: 'Yönetici',
  Operations: 'Operasyon',
  Accounting: 'Muhasebe',
  Driver: 'Şoför (mobil)',
}

export const attachmentKindLabel: Record<AttachmentKind, string> = {
  Photo: 'Fotoğraf',
  Document: 'Belge / İrsaliye',
  Signature: 'İmza',
}

export type Tone = 'yellow' | 'green' | 'blue' | 'gray' | 'red' | 'teal' | 'orange' | 'purple'

export const tripStatusTone: Record<TripStatus, Tone> = {
  Planned: 'blue',
  Loaded: 'yellow',
  OnRoad: 'teal',
  Delivered: 'green',
  Cancelled: 'gray',
}

export const vehicleStatusTone: Record<VehicleStatus, Tone> = {
  Available: 'green',
  OnRoad: 'yellow',
  Maintenance: 'red',
}

/** Fatura ödeme durumu, Otoyol renkleriyle: Ödendi good, Kısmi accent, Vadesi Geçti bad, Açık warn, Taslak info, İptal muted. */
export function paymentStatusTone(s: string): Tone {
  switch (s) {
    case 'Ödendi': return 'green'
    case 'Kısmi Ödendi': return 'teal'
    case 'Vadesi Geçti': return 'red'
    case 'Taslak': return 'blue'
    case 'İptal': return 'gray'
    default: return 'yellow'
  }
}

export const withholdingOptions = [0, 2, 3, 4, 5, 7, 9, 10].map((n) => ({
  value: n,
  label: n === 0 ? 'Tevkifat yok' : `${n}/10`,
}))

export const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

export const supplierKindLabel: Record<SupplierKind, string> = {
  Carrier: 'Taşeron / Araç sahibi',
  Service: 'Servis / Tamir',
  Fuel: 'Akaryakıt',
  Other: 'Diğer',
}

export const vehicleOwnershipLabel: Record<VehicleOwnership, string> = {
  Own: 'Özmal',
  Rented: 'Kiralık (taşeron)',
}

export const tripEventSourceLabel: Record<TripEventSource, string> = {
  Panel: 'Panel',
  Driver: 'Şoför uygulaması',
  Import: 'Excel aktarımı',
}

export const approvalStatusLabel: Record<ApprovalStatus, string> = {
  Approved: 'Onaylı',
  Pending: 'Onay bekliyor',
  Rejected: 'Reddedildi',
}

export const settlementDirectionLabel: Record<SettlementDirection, string> = {
  PaidToDriver: 'Şoföre ödeme',
  ReceivedFromDriver: 'Şoförden alınan',
}

export const documentTypeLabel: Record<DocumentType, string> = {
  Registration: 'Ruhsat',
  TrafficInsurance: 'Trafik Sigortası',
  Casco: 'Kasko',
  Inspection: 'Muayene',
  KCertificate: 'K Belgesi',
  TachographCalibration: 'Takograf Kalibrasyonu',
  Emission: 'Egzoz Emisyon',
  License: 'Ehliyet',
  Src: 'SRC',
  Psychotechnic: 'Psikoteknik',
  HealthReport: 'Sağlık Raporu',
  Other: 'Diğer',
}

/** Sahibine göre önerilen belge türleri. */
export const vehicleDocumentTypes: DocumentType[] = ['Registration', 'TrafficInsurance', 'Casco', 'Inspection', 'KCertificate', 'TachographCalibration', 'Emission', 'Other']
export const driverDocumentTypes: DocumentType[] = ['License', 'Src', 'Psychotechnic', 'HealthReport', 'Other']
export const companyDocumentTypes: DocumentType[] = ['KCertificate', 'Other']

export const maintenanceTypeLabel: Record<MaintenanceType, string> = {
  Periodic: 'Periyodik',
  Oil: 'Yağ',
  Tire: 'Lastik',
  Brake: 'Fren',
  Breakdown: 'Arıza',
  Other: 'Diğer',
}

export const instrumentStatusLabel: Record<InstrumentStatus, string> = {
  Portfolio: 'Portföyde',
  InCollection: 'Tahsilde',
  Collected: 'Tahsil edildi',
  Endorsed: 'Ciro edildi',
  Bounced: 'Karşılıksız',
  Returned: 'İade',
}

export const instrumentStatusTone: Record<InstrumentStatus, Tone> = {
  Portfolio: 'blue',
  InCollection: 'yellow',
  Collected: 'green',
  Endorsed: 'purple',
  Bounced: 'red',
  Returned: 'gray',
}

export const cashAccountKindLabel: Record<CashAccountKind, string> = {
  Cash: 'Kasa',
  Bank: 'Banka',
  Pos: 'POS',
  CreditCard: 'Kredi Kartı',
}

export const isInstrument = (m?: string | null) => m === 'Check' || m === 'PromissoryNote'

export const commissionStatusLabel: Record<CommissionStatus, string> = {
  Pending: 'Bekleniyor',
  Received: 'Alındı',
  DeductFromInvoice: 'Faturadan düş',
}

export const commissionStatusTone: Record<CommissionStatus, Tone> = {
  Pending: 'yellow',
  Received: 'green',
  DeductFromInvoice: 'blue',
}

export const driverRatingLabel: Record<DriverRating, string> = {
  Excellent: 'Mükemmel',
  Workable: 'Çalışılır',
  NoCommission: 'Komisyon çıkarmıyor',
  StealsCustomers: 'Müşteri çalıyor',
  BadAttitude: 'Ters davranıyor',
  Unreliable: 'Güvenilmez',
  QuitsJobs: 'İşi yarıda bırakıyor',
}

export const driverRatingTone: Record<DriverRating, Tone> = {
  Excellent: 'green',
  Workable: 'blue',
  NoCommission: 'yellow',
  StealsCustomers: 'red',
  BadAttitude: 'red',
  Unreliable: 'red',
  QuitsJobs: 'red',
}

/** Seçilebilen KDV oranları (Temmuz 2023'ten beri). Eski kayıtlardaki %8 / %18 sunucuda geçerli kalır. */
export const vatRates = [0, 1, 10, 20]

/** Seçim listesi: güncel oranlar + kayıtta eski bir oran (%8, %18) varsa o da. */
export const vatRateChoices = (current?: number | null) =>
  current != null && !vatRates.includes(current) ? [...vatRates, current].sort((a, b) => a - b) : vatRates

/** KDV %0 faturada istisna kodları (GİB listesi). Nakliyede genelde 311. */
export const vatExemptionOptions = [
  { value: '311', label: '311 · 14/1 Uluslararası taşımacılık' },
  { value: '301', label: '301 · 11/1-a Mal ihracatı' },
  { value: '302', label: '302 · 11/1-b Hizmet ihracatı' },
]

export const purchaseInvoiceKindLabel: Record<PurchaseInvoiceKind, string> = {
  EInvoice: 'e-Fatura',
  EArchive: 'e-Arşiv',
  Paper: 'Kâğıt',
  Receipt: 'Fiş',
}

export const invoiceNoteKindLabel: Record<InvoiceNoteKind, string> = {
  Sale: 'Satış',
  Withholding: 'Tevkifat',
}
