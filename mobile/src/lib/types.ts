export type TripStatus = 'Planned' | 'Loaded' | 'OnRoad' | 'Delivered' | 'Cancelled'

export interface User {
  id: number
  fullName: string
  email: string
  role: 'Admin' | 'Operations' | 'Accounting' | 'Driver'
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
}
