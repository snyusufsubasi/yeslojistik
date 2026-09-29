import type { ReactNode } from 'react'
import {
  Banknote, Building, Building2, CalendarClock, CarFront, CircleDollarSign, CircleHelp, Cog, CreditCard, Disc3, Droplet, FileCheck2,
  FileText, Fuel, Gauge, HandCoins, Handshake, Landmark, MoveRight, Receipt, ScrollText, ShieldCheck, Signpost, Stamp, Truck,
  UserRound, Wallet, Wrench, Zap,
} from 'lucide-react'
import type { CashAccountKind, ExpenseCategory, MaintenanceType, PaymentMethod, SettlementDirection, SupplierKind, VehicleOwnership } from '../api/types'

/** Şık usulü seçim kartlarının ikonları: her seçenek her ekranda aynı ikonla görünür. */
export const expenseCategoryIcon: Record<ExpenseCategory, ReactNode> = {
  Fuel: <Fuel />, Maintenance: <Wrench />, Toll: <Signpost />, DriverAllowance: <UserRound />, DriverAdvance: <HandCoins />,
  Tire: <Disc3 />, Insurance: <ShieldCheck />, Tax: <Stamp />, Other: <CircleHelp />,
}

export const paymentMethodIcon: Record<PaymentMethod, ReactNode> = {
  Cash: <Banknote />, BankTransfer: <Landmark />, CreditCard: <CreditCard />, Check: <ScrollText />, PromissoryNote: <FileText />,
}

export const vehicleOwnershipIcon: Record<VehicleOwnership, ReactNode> = { Own: <Truck />, Rented: <Handshake /> }

export const supplierKindIcon: Record<SupplierKind, ReactNode> = { Carrier: <Truck />, Service: <Wrench />, Fuel: <Fuel />, Other: <Building2 /> }

export const maintenanceTypeIcon: Record<MaintenanceType, ReactNode> = {
  Periodic: <CalendarClock />, Oil: <Droplet />, Tire: <Disc3 />, Brake: <Gauge />, Breakdown: <Zap />, Other: <Cog />,
}

export const cashAccountKindIcon: Record<CashAccountKind, ReactNode> = { Cash: <Wallet />, Bank: <Landmark />, Pos: <CircleDollarSign />, CreditCard: <CreditCard /> }

export const settlementDirectionIcon: Record<SettlementDirection, ReactNode> = { PaidToDriver: <MoveRight />, ReceivedFromDriver: <Receipt /> }

export const documentIcon = <FileCheck2 />
export const companyIcon = <Building />
export const carIcon = <CarFront />
