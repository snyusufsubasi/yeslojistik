export type UserRole = 'Admin' | 'Operations' | 'Accounting' | 'Driver'
export type AttachmentKind = 'Photo' | 'Document' | 'Signature'
export type VehicleStatus = 'Available' | 'OnRoad' | 'Maintenance'
export type TripStatus = 'Planned' | 'Loaded' | 'OnRoad' | 'Delivered' | 'Cancelled'
export type JobRequestStatus = 'Pending' | 'Cancelled' | 'Converted'
export type InvoiceStatus = 'Draft' | 'Issued' | 'Cancelled'
export type PaymentMethod = 'Cash' | 'BankTransfer' | 'Check' | 'CreditCard' | 'PromissoryNote'
export type InstrumentStatus = 'Portfolio' | 'InCollection' | 'Collected' | 'Endorsed' | 'Bounced' | 'Returned'
export type CashAccountKind = 'Cash' | 'Bank' | 'Pos' | 'CreditCard'
export type SupplierKind = 'Carrier' | 'Service' | 'Fuel' | 'Other'
export type VehicleOwnership = 'Own' | 'Rented'
export type TripEventSource = 'Panel' | 'Driver' | 'Import'
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
  lockoutUntil?: string | null
  lastLoginAt?: string | null
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
  city?: string | null
  district?: string | null
  contactName?: string | null
  isEInvoiceUser?: boolean
  eInvoiceAlias?: string | null
  paymentTermDays?: number | null
  isActive?: boolean
  creditLimit?: number | null
}

export interface Supplier {
  id: number
  supplierNo: string
  title: string
  kind: SupplierKind
  taxNumber?: string | null
  taxOffice?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  iban?: string | null
  contactName?: string | null
  paymentTermDays: number
  notes?: string | null
  openingBalance: number
  openingBalanceDate?: string | null
  isActive: boolean
  balance: number
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
  ownership: VehicleOwnership
  supplierId?: number | null
  supplierTitle?: string | null
  trailerPlate?: string | null
  nextMaintenanceKm?: number | null
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
  supplierId?: number | null
  supplierTitle?: string | null
  hasAppAccount?: boolean
  locationConsentAt?: string | null
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
  customerReference?: string | null
  cargoType?: string | null
  cargoWeightKg?: number | null
  cargoQuantity?: number | null
  cargoUnit?: string | null
  trailerPlate?: string | null
  loadingCity?: string | null
  deliveryCity?: string | null
  loadingContact?: string | null
  deliveryContact?: string | null
  carrierSupplierId?: number | null
  carrierSupplierTitle?: string | null
  carrierInvoiceNo?: string | null
  carrierInvoiceDate?: string | null
  receivedBy?: string | null
  deliveredAt?: string | null
  vehicleOwnership?: VehicleOwnership
  jobRequestId?: number | null
  /** Eski sistemden aktarılmış geçmiş sefer: borç/fatura hesaplarına girmez. */
  isLegacy?: boolean
}

export interface JobRequest {
  id: number
  customerId: number
  customerTitle: string
  date: string
  loadingAddress: string
  deliveryAddress: string
  deliveryWindow?: string | null
  cargoType?: string | null
  cargoQuantity?: number | null
  vehicleType?: string | null
  salePrice?: number | null
  carrierPrice?: number | null
  commission?: number | null
  driverBonus?: number | null
  otherExpense?: number | null
  customerPays: boolean
  loadingDocumentNo?: string | null
  waybillNo?: string | null
  invoiceFooterNote?: string | null
  description?: string | null
  loadingLatitude?: number | null
  loadingLongitude?: number | null
  deliveryLatitude?: number | null
  deliveryLongitude?: number | null
  status: JobRequestStatus
  tripId?: number | null
}

export interface TripEvent {
  id: number
  status: TripStatus
  occurredAt: string
  recordedAt: string
  userName?: string | null
  source: TripEventSource
  note?: string | null
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
  scenario?: EInvoiceScenario | null
  typeCode?: 'Satis' | 'Tevkifat' | null
  ettn?: string | null
  eInvoiceNo?: string | null
  eInvoiceStatus?: EInvoiceStatus
  eInvoiceMessage?: string | null
  eInvoiceSentAt?: string | null
  withholdingCode?: string | null
}

export type EInvoiceScenario = 'EArsiv' | 'Temel' | 'Ticari'
export type EInvoiceStatus = 'None' | 'Ready' | 'Sent' | 'Delivered' | 'Accepted' | 'Rejected' | 'Failed' | 'CancelRequested' | 'Cancelled'

export interface EInvoiceInfo {
  providerName: string
  canSend: boolean
  supportsStatus: boolean
  supportsRecipientCheck: boolean
  apiKeyConfigured: boolean
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
  cashAccountId?: number | null
  cashAccountName?: string | null
  instrumentNo?: string | null
  bank?: string | null
  instrumentDueDate?: string | null
  instrumentStatus?: InstrumentStatus | null
  endorsedSupplierPaymentId?: number | null
  endorsedTo?: string | null
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
  supplierId?: number | null
  supplierTitle?: string | null
  isOnCredit?: boolean
  hasReceipt?: boolean
  paidBy?: 'Company' | 'Driver'
  approvalStatus?: ApprovalStatus
  rejectionReason?: string | null
  cashAccountId?: number | null
}

export type ApprovalStatus = 'Approved' | 'Pending' | 'Rejected'

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
  setup: SetupStatus
  payableTotal: number
  payableOverdue: number
  pendingExpenseCount: number
  pendingExpenseTotal: number
  uninvoicedTripCount: number
  uninvoicedTripTotal: number
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
  carrierCost: number
  carrierPaid: number
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
  requireDeliveryPhoto?: boolean
  requireDeliverySignature?: boolean
  eInvoiceEnabled?: boolean
  eInvoiceSeriesPrefix?: string
  eArchiveSeriesPrefix?: string
  defaultScenario?: EInvoiceScenario
  senderAlias?: string | null
  city?: string | null
  district?: string | null
  mersisNo?: string | null
  tradeRegistryNo?: string | null
  website?: string | null
  lastBackupAt?: string | null
  sampleDataClearedAt?: string | null
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
  events?: { status: TripStatus; occurredAt: string }[] | null
  customerReference?: string | null
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
  supplierPaymentTotal?: number
  expenseTotal?: number
}

export interface SetupStatus {
  companyInfo: boolean
  vehicleCount: number
  driverCount: number
  customerCount: number
  tripCount: number
  userCount: number
  sampleData: boolean
  supplierCount: number
  customerOpeningTotal: number
  supplierOpeningTotal: number
  lastBackupAt?: string | null
  sampleDataCleared: boolean
  companyDetails: boolean
}

export interface SupplierPayment {
  id: number
  supplierId: number
  supplierTitle: string
  date: string
  amount: number
  method: PaymentMethod
  tripId?: number | null
  tripLabel?: string | null
  description?: string | null
  cashAccountId?: number | null
  cashAccountName?: string | null
  endorsedFromPaymentId?: number | null
}

export interface SupplierSummary {
  supplier: Supplier
  totalDebit: number
  totalCredit: number
  balance: number
  overdueAmount: number
  tripCount: number
  missingInvoiceCount: number
}

export interface PayableAgingRow {
  supplierId: number
  supplier: string
  notDue: number
  days1To30: number
  days31To60: number
  days61To90: number
  over90: number
  total: number
}

export interface SupplierReportRow {
  supplierId: number
  supplier: string
  tripCount: number
  tripCost: number
  creditExpenses: number
  paid: number
  balance: number
}

export type SettlementDirection = 'PaidToDriver' | 'ReceivedFromDriver'
export type DocumentOwnerType = 'Vehicle' | 'Driver' | 'Company'
export type DocumentType = 'Registration' | 'TrafficInsurance' | 'Casco' | 'Inspection' | 'KCertificate' | 'TachographCalibration' | 'Emission'
  | 'License' | 'Src' | 'Psychotechnic' | 'HealthReport' | 'Other'
export type MaintenanceType = 'Periodic' | 'Oil' | 'Tire' | 'Brake' | 'Breakdown' | 'Other'

export interface DriverLedgerRow {
  date: string
  kind: string
  description: string
  debit: number
  credit: number
  balance: number
  expenseId?: number | null
  settlementId?: number | null
  approvalStatus?: ApprovalStatus | null
}

export interface DriverLedger {
  driverId: number
  driverName: string
  advances: number
  paidToDriver: number
  driverExpenses: number
  receivedFromDriver: number
  balance: number
  pendingExpenses: number
  rows: DriverLedgerRow[]
}

export interface FleetDocument {
  id: number
  ownerType: DocumentOwnerType
  ownerId?: number | null
  ownerName?: string | null
  type: DocumentType
  no?: string | null
  issueDate?: string | null
  expiryDate?: string | null
  hasFile: boolean
  note?: string | null
  daysLeft?: number | null
}

export interface MaintenanceRecord {
  id: number
  vehicleId: number
  vehiclePlate: string
  date: string
  km?: number | null
  type: MaintenanceType
  description?: string | null
  cost: number
  supplierId?: number | null
  supplierTitle?: string | null
  nextDueKm?: number | null
  nextDueDate?: string | null
  expenseId?: number | null
}

export interface CashAccount {
  id: number
  name: string
  kind: CashAccountKind
  iban?: string | null
  openingBalance: number
  openingBalanceDate?: string | null
  isActive: boolean
  balance: number
}

export interface CashMovement {
  date: string
  kind: string
  description: string
  in: number
  out: number
  balance: number
  link?: string | null
}

export interface CashTransfer {
  id: number
  fromAccountId: number
  fromAccountName: string
  toAccountId: number
  toAccountName: string
  date: string
  amount: number
  note?: string | null
}

export interface CashFlow {
  buckets: { label: string; from?: string | null; to?: string | null; expectedIn: number; instrumentsIn: number; expectedOut: number }[]
  totalIn: number
  totalOut: number
  cashOnHand: number
}

export interface CustomerRisk {
  customerId: number
  creditLimit?: number | null
  openBalance: number
  uninvoicedDelivered: number
  used: number
  available?: number | null
}

export interface CustomerProfitRow {
  customerId: number
  customer: string
  tripCount: number
  revenue: number
  cost: number
  profit: number
  marginPercent?: number | null
  openReceivable: number
  collectionDays?: number | null
}

export interface RouteProfitRow {
  from: string
  to: string
  tripCount: number
  avgRevenue: number
  avgCost: number
  profit: number
  marginPercent?: number | null
}

export interface SearchResult {
  type: 'trip' | 'customer' | 'supplier' | 'vehicle' | 'driver' | 'invoice'
  id: number
  title: string
  subtitle?: string | null
  link: string
}

/** Yeni sefer formu önerileri (GET /trips/hints). */
export interface TripAddressHint { address: string; city?: string | null; contact?: string | null; count: number }
export interface TripRouteHint { count: number; avgSalePrice: number; avgVehicleCost: number; lastSalePrice: number; lastVehicleCost: number; lastDate: string }
export interface TripHints {
  lastTrip?: Trip | null
  loadingAddresses: TripAddressHint[]
  deliveryAddresses: TripAddressHint[]
  cargoTypes: string[]
  route?: TripRouteHint | null
}

/** Cari tablosu satırları (/api/cari/customers, /api/cari/suppliers). */
export interface CustomerCariRow {
  id: number; customerNo: string; title: string; taxNumber: string | null; phone: string | null
  opening: number; invoiced: number; collected: number; balance: number; overdue: number
  uninvoicedTripCount: number; uninvoicedTrips: number
}
export interface SupplierCariRow {
  id: number; supplierNo: string; title: string; taxNumber: string | null; phone: string | null
  opening: number; tripCost: number; creditExpenses: number; paid: number; balance: number; overdue: number
  tripCount: number; missingInvoiceCount: number
}
export interface TripTotals { count: number; sale: number; vehicleCost: number; expenses: number; profit: number; uninvoicedCount: number; uninvoicedTotal: number }
