export type UserRole = 'Admin' | 'Operations' | 'Accounting' | 'Driver'
export type AttachmentKind = 'Photo' | 'Document' | 'Signature'
export type VehicleStatus = 'Available' | 'OnRoad' | 'Maintenance'
export type TripStatus = 'Planned' | 'Loaded' | 'OnRoad' | 'Delivered' | 'Cancelled'
export type InvoiceStatus = 'Draft' | 'Issued' | 'Cancelled'
export type PaymentMethod = 'Cash' | 'BankTransfer' | 'Check' | 'CreditCard'
export type ExpenseCategory = 'Fuel' | 'Maintenance' | 'Toll' | 'DriverAllowance' | 'DriverAdvance' | 'Tire' | 'Insurance' | 'Tax' | 'Other'

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  desc?: boolean
  [key: string]: string | number | boolean | undefined | null
}

export interface LookupItem {
  id: number
  label: string
  extra?: string | null
}

export interface CurrentUser {
  id: number
  fullName: string
  email: string
  role: UserRole
}

export interface User extends CurrentUser {
  isActive: boolean
  createdAt: string
  driverId?: number | null
  driverName?: string | null
}

export interface Customer {
  id: number
  customerNo: string
  title: string
  taxNumber?: string | null
  taxOffice?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  balance: number
  openingBalance: number
  openingBalanceDate?: string | null
  notifyStatusByEmail?: boolean
}

export interface CustomerSummary {
  customer: Customer
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
  status: string
}

export interface Vehicle {
  id: number
  plate: string
  type: string
  brand?: string | null
  model?: string | null
  modelYear?: number | null
  km: number
  lastMaintenanceDate?: string | null
  nextMaintenanceDate?: string | null
  inspectionExpiry?: string | null
  insuranceExpiry?: string | null
  status: VehicleStatus
  defaultDriverId?: number | null
  defaultDriverName?: string | null
}

export interface Driver {
  id: number
  fullName: string
  phone?: string | null
  nationalId?: string | null
  licenseClass?: string | null
  licenseExpiry?: string | null
  srcExpiry?: string | null
  psychotechnicExpiry?: string | null
  isActive: boolean
}

export interface Trip {
  id: number
  customerId: number
  customerTitle: string
  vehicleId: number
  vehiclePlate: string
  vehicleType: string
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
  invoiceId?: number | null
  invoiceNo?: string | null
}

export interface InvoiceLine {
  id: number
  tripId?: number | null
  description: string
  amount: number
}

export interface Invoice {
  id: number
  invoiceNo: string
  customerId: number
  customerTitle: string
  date: string
  dueDate: string
  subtotal: number
  vatRate: number
  vatAmount: number
  withholdingTenths: number
  withholdingAmount: number
  total: number
  paid: number
  remaining: number
  status: InvoiceStatus
  paymentStatus: string
  notes?: string | null
  lines: InvoiceLine[]
}

export interface Payment {
  id: number
  customerId: number
  customerTitle: string
  invoiceId?: number | null
  invoiceNo?: string | null
  date: string
  amount: number
  method: PaymentMethod
  description?: string | null
}

export interface Expense {
  id: number
  category: ExpenseCategory
  amount: number
  date: string
  vehicleId?: number | null
  vehiclePlate?: string | null
  tripId?: number | null
  tripLabel?: string | null
  description?: string | null
  driverId?: number | null
  driverName?: string | null
  liters?: number | null
  odometer?: number | null
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
  recentInvoices: Invoice[]
  vehicles: Vehicle[]
  trend: { year: number; month: number; revenue: number; cost: number }[]
  setup: { companyInfo: boolean; vehicleCount: number; driverCount: number; customerCount: number; tripCount: number; userCount: number; sampleData: boolean }
}

export interface Alert {
  type: string
  severity: 'danger' | 'warning'
  title: string
  message: string
  link: string
  date?: string | null
}

export interface MonthlySummaryRow {
  year: number
  month: number
  tripCount: number
  tripRevenue: number
  vehicleCost: number
  invoiced: number
  collected: number
  expenses: number
  netProfit: number
}

export interface TripProfitRow {
  tripId: number
  loadingDate: string
  customer: string
  vehicle: string
  route: string
  status: string
  salePrice: number
  vehicleCost: number
  expenses: number
  profit: number
}

export interface VehicleReportRow {
  vehicleId: number
  plate: string
  type: string
  tripCount: number
  revenue: number
  vehicleCost: number
  expenses: number
  net: number
}

export interface CustomerAgingRow {
  customerId: number
  customer: string
  notDue: number
  days1To30: number
  days31To60: number
  days61To90: number
  over90: number
  total: number
}

export interface ExpenseCategoryRow {
  category: ExpenseCategory
  amount: number
}

export interface CompanySettings {
  companyName: string
  slogan?: string | null
  taxNumber?: string | null
  taxOffice?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  iban?: string | null
  logoDataUrl?: string | null
  invoicePrefix: string
  nextInvoiceNumber: number
  defaultVatRate: number
  defaultWithholdingTenths: number
  defaultPaymentTermDays: number
  emailEnabled?: boolean
  dailyDigestEnabled?: boolean
}

export interface DriverReportRow {
  driverId: number
  driver: string
  tripCount: number
  deliveredCount: number
  revenue: number
  vehicleCost: number
  expenses: number
  profit: number
  advances: number
  allowances: number
}

export interface FuelReportRow {
  vehicleId: number
  plate: string
  fillCount: number
  liters: number
  cost: number
  pricePerLiter?: number | null
  km?: number | null
  litersPer100Km?: number | null
}

export interface Attachment {
  id: number
  tripId: number
  kind: AttachmentKind
  fileName: string
  contentType: string
  size: number
  note?: string | null
  uploadedBy?: string | null
  createdAt: string
}

export interface VehicleLocation {
  vehicleId: number
  plate: string
  type: string
  status: VehicleStatus
  latitude?: number | null
  longitude?: number | null
  speedKmh?: number | null
  lastLocationAt?: string | null
  activeTripId?: number | null
  activeTripLabel?: string | null
  driverName?: string | null
}

export interface RoutePoint {
  latitude: number
  longitude: number
  speedKmh?: number | null
  recordedAt: string
}

export interface TrackingLink {
  token: string
  url: string
}

export interface PublicTracking {
  companyName: string
  companyPhone?: string | null
  customerTitle: string
  loadingAddress: string
  deliveryAddress: string
  loadingDate: string
  deliveryDate?: string | null
  status: TripStatus
  vehiclePlate: string
  latitude?: number | null
  longitude?: number | null
  lastLocationAt?: string | null
}

export interface AuditLogEntry {
  id: number
  at: string
  userName?: string | null
  action: string
  entityType: string
  entityId: number
  label?: string | null
  changes?: string | null
}

export interface Health {
  status: string
  version?: string
  commit?: string | null
  maintenance?: boolean
}

export interface DataStats {
  counts: Record<string, number>
  customerBalanceTotal: number
  issuedInvoiceTotal: number
  fileCount: number
  fileBytes: number
  databaseBytes: number
  lastBackupAt: string | null
}
