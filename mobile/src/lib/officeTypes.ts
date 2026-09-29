import type { TripStatus } from './types'

export interface PagedResult<T> { items: T[]; total: number; page: number; pageSize: number }
export interface LookupItem { id: number; label: string; extra?: string | null }

export interface Trip {
  id: number
  customerId: number
  customerTitle: string
  vehicleId: number
  vehiclePlate: string
  driverId: number
  driverName: string
  loadingAddress: string
  deliveryAddress: string
  loadingDate: string
  deliveryDate?: string | null
  description?: string | null
  vehicleCost: number
  salePrice: number
  expenseTotal: number
  profit: number
  status: TripStatus
  nextStatuses: TripStatus[]
  invoiceNo?: string | null
  customerReference?: string | null
  cargoType?: string | null
  trailerPlate?: string | null
  loadingCity?: string | null
  deliveryCity?: string | null
  loadingContact?: string | null
  deliveryContact?: string | null
  carrierSupplierTitle?: string | null
  receivedBy?: string | null
  vehicleOwnership?: 'Own' | 'Rented'
}

export interface Dashboard {
  monthTripCount: number
  monthDeliveredCount: number
  activeTripCount: number
  receivableInvoiceCount: number
  receivableTotal: number
  vehicleCount: number
  vehiclesOnRoad: number
  plannedTripCount: number
  monthRevenue: number
  monthExpenses: number
  todayTrips: Trip[]
  payableTotal: number
  payableOverdue: number
}

export interface Alert { type: string; severity: 'danger' | 'warning'; title: string; message: string; link: string; date?: string | null }

export interface VehicleLocation {
  vehicleId: number
  plate: string
  type: string
  status: 'Available' | 'OnRoad' | 'Maintenance'
  latitude?: number | null
  longitude?: number | null
  speedKmh?: number | null
  lastLocationAt?: string | null
  activeTripId?: number | null
  activeTripLabel?: string | null
  driverName?: string | null
}

export interface Party { id: number; title: string; phone?: string | null; balance: number; city?: string | null; iban?: string | null }

export interface AccountSummary {
  totalDebit: number
  totalCredit: number
  balance: number
  overdueAmount: number
  tripCount: number
}

export interface AccountMovement {
  date: string
  type: string
  reference: string
  description?: string | null
  debit: number
  credit: number
  runningBalance: number
}

export type PaymentMethod = 'Cash' | 'BankTransfer' | 'Check' | 'CreditCard' | 'PromissoryNote'
export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'BankTransfer', label: 'Havale/EFT' },
  { value: 'Cash', label: 'Nakit' },
  { value: 'Check', label: 'Çek' },
  { value: 'CreditCard', label: 'Kredi Kartı' },
  { value: 'PromissoryNote', label: 'Senet' },
]

export interface NotificationPref { type: string; label: string; push: boolean }
