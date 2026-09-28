namespace YesLojistik.Core.Entities;

public enum UserRole { Admin, Operations, Accounting, Driver }

public enum AttachmentKind { Photo, Document, Signature }

public enum VehicleStatus { Available, OnRoad, Maintenance }

public enum TripStatus { Planned, Loaded, OnRoad, Delivered, Cancelled }

public enum InvoiceStatus { Draft, Issued, Cancelled }

public enum PaymentMethod { Cash, BankTransfer, Check, CreditCard }

public enum SupplierKind { Carrier, Service, Fuel, Other }

public enum VehicleOwnership { Own, Rented }

public enum TripEventSource { Panel, Driver, Import }

public enum ExpenseCategory { Fuel, Maintenance, Toll, DriverAllowance, Tire, Insurance, Tax, Other, DriverAdvance }
