import type { AttachmentKind, ExpenseCategory, InvoiceStatus, PaymentMethod, TripStatus, UserRole, VehicleStatus } from '../api/types'

export const tripStatusLabel: Record<TripStatus, string> = {
  Planned: 'Planlandı',
  Loaded: 'Yüklendi',
  OnRoad: 'Yolda',
  Delivered: 'Teslim Edildi',
  Cancelled: 'İptal',
}

/** Duruma geçiş butonlarında kullanılan fiil. */
export const tripStatusAction: Record<TripStatus, string> = {
  Planned: 'Planlandıya al',
  Loaded: 'Yüklendi',
  OnRoad: 'Yola Çıktı',
  Delivered: 'Teslim Edildi',
  Cancelled: 'İptal Et',
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
}

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  Fuel: 'Yakıt',
  Maintenance: 'Bakım/Onarım',
  Toll: 'Otoyol/Köprü',
  DriverAllowance: 'Şoför Harcırahı',
  Tire: 'Lastik',
  Insurance: 'Sigorta/Kasko',
  Tax: 'Vergi/Harç',
  Other: 'Diğer',
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
  Loaded: 'teal',
  OnRoad: 'yellow',
  Delivered: 'green',
  Cancelled: 'gray',
}

export const vehicleStatusTone: Record<VehicleStatus, Tone> = {
  Available: 'green',
  OnRoad: 'yellow',
  Maintenance: 'red',
}

export function paymentStatusTone(s: string): Tone {
  switch (s) {
    case 'Ödendi': return 'green'
    case 'Kısmi Ödendi': return 'teal'
    case 'Vadesi Geçti': return 'red'
    case 'Taslak': return 'purple'
    case 'İptal': return 'gray'
    default: return 'orange'
  }
}

export const withholdingOptions = [0, 2, 3, 4, 5, 7, 9, 10].map((n) => ({
  value: n,
  label: n === 0 ? 'Tevkifat yok' : `${n}/10`,
}))

export const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
