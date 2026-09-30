namespace YesLojistik.Core.Entities;

public enum UserRole { Admin, Operations, Accounting, Driver }

public enum AttachmentKind { Photo, Document, Signature }

/// <summary>Gideri kim ödedi: firma (kasa/banka/kart) ya da şoför kendi cebinden (şoför hesabına alacak yazılır).</summary>
public enum ExpensePaidBy { Company, Driver }

public enum ApprovalStatus { Approved, Pending, Rejected }

public enum VehicleStatus { Available, OnRoad, Maintenance }

public enum TripStatus { Planned, Loaded, OnRoad, Delivered, Cancelled }

public enum JobRequestStatus { Pending, Cancelled, Converted }

public enum InvoiceStatus { Draft, Issued, Cancelled }

/// <summary>e-Arşiv: e-Fatura mükellefi olmayan alıcı. Temel/Ticari: e-Fatura mükellefi (ticaride alıcı kabul/ret verir).</summary>
public enum EInvoiceScenario { EArsiv, Temel, Ticari }

public enum EInvoiceTypeCode { Satis, Tevkifat }

public enum EInvoiceStatus { None, Ready, Sent, Delivered, Accepted, Rejected, Failed, CancelRequested, Cancelled }

public enum PaymentMethod { Cash, BankTransfer, Check, CreditCard, PromissoryNote }

public enum SupplierKind { Carrier, Service, Fuel, Other }

public enum VehicleOwnership { Own, Rented }

public enum TripEventSource { Panel, Driver, Import }

public enum ExpenseCategory { Fuel, Maintenance, Toll, DriverAllowance, Tire, Insurance, Tax, Other, DriverAdvance }

/// <summary>Şoför hesabı hareketi: şoföre ödeme (bakiyesini artırır) ya da şoförden geri alınan para.</summary>
public enum SettlementDirection { PaidToDriver, ReceivedFromDriver }

public enum StaffTransactionKind { Advance, Bonus, SalaryPayment }

public enum DocumentOwnerType { Vehicle, Driver, Company }

public enum DocumentType
{
    Registration, TrafficInsurance, Casco, Inspection, KCertificate, TachographCalibration, Emission,
    License, Src, Psychotechnic, HealthReport, Other,
}

public enum MaintenanceType { Periodic, Oil, Tire, Brake, Breakdown, Other }

/// <summary>Çek/senedin durumu: portföyde → tahsile verildi → tahsil edildi; ya da ciro edildi, karşılıksız, iade.</summary>
public enum InstrumentStatus { Portfolio, InCollection, Collected, Endorsed, Bounced, Returned }

public enum CashAccountKind { Cash, Bank, Pos, CreditCard }
