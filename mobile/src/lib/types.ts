export type TripStatus = 'Planned' | 'Loaded' | 'OnRoad' | 'Delivered' | 'Cancelled'

export type Role = 'Admin' | 'Operations' | 'Accounting' | 'Driver'

export interface User {
  id: number
  fullName: string
  email: string
  role: Role
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  user: User
}

export interface DriverProfile {
  driverId: number
  fullName: string
  phone?: string | null
  vehiclePlate?: string | null
  companyName: string
  companyPhone?: string | null
  licenseExpiry?: string | null
  srcExpiry?: string | null
  psychotechnicExpiry?: string | null
  locationConsentAt?: string | null
  locationConsentVersion?: string | null
  requireDeliveryPhoto?: boolean
  requireDeliverySignature?: boolean
}

export interface DriverTrip {
  id: number
  customerTitle: string
  customerPhone?: string | null
  loadingAddress: string
  deliveryAddress: string
  loadingDate: string
  deliveryDate?: string | null
  description?: string | null
  vehiclePlate: string
  status: TripStatus
  nextStatuses: TripStatus[]
  attachmentCount: number
  customerReference?: string | null
  cargo?: string | null
  trailerPlate?: string | null
  loadingCity?: string | null
  deliveryCity?: string | null
  loadingContact?: string | null
  deliveryContact?: string | null
}

export interface Attachment {
  id: number
  kind: 'Photo' | 'Document' | 'Signature'
  fileName: string
  note?: string | null
  createdAt: string
}

export interface LocationPing {
  latitude: number
  longitude: number
  speedKmh?: number | null
  heading?: number | null
  accuracy?: number | null
  recordedAt: string
}

export type DriverExpenseCategory = 'Fuel' | 'Toll' | 'Maintenance' | 'Other'

export interface DriverExpense {
  id: number
  category: DriverExpenseCategory
  amount: number
  date: string
  liters?: number | null
  odometer?: number | null
  description?: string | null
  approvalStatus?: 'Approved' | 'Pending' | 'Rejected'
  hasReceipt?: boolean
}
