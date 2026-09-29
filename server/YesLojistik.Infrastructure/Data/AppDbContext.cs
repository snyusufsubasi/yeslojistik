using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Entities;

namespace YesLojistik.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser? currentUser = null) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<JobRequest> JobRequests => Set<JobRequest>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<CompanySettings> CompanySettings => Set<CompanySettings>();
    public DbSet<TripAttachment> TripAttachments => Set<TripAttachment>();
    public DbSet<VehicleLocation> VehicleLocations => Set<VehicleLocation>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<EInvoiceSequence> EInvoiceSequences => Set<EInvoiceSequence>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<TripEvent> TripEvents => Set<TripEvent>();
    public DbSet<SupplierPayment> SupplierPayments => Set<SupplierPayment>();
    public DbSet<DriverSettlement> DriverSettlements => Set<DriverSettlement>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<StaffTransaction> StaffTransactions => Set<StaffTransaction>();
    public DbSet<RecurringPayment> RecurringPayments => Set<RecurringPayment>();
    public DbSet<FleetDocument> Documents => Set<FleetDocument>();
    public DbSet<MaintenanceRecord> MaintenanceRecords => Set<MaintenanceRecord>();
    public DbSet<CashAccount> CashAccounts => Set<CashAccount>();
    public DbSet<CashTransfer> CashTransfers => Set<CashTransfer>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        b.Properties<decimal>().HavePrecision(18, 2);
        b.Properties<Enum>().HaveConversion<string>().HaveMaxLength(30);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Soft delete: silinen kayıtlar tüm sorgulardan otomatik gizlenir.
        foreach (var type in b.Model.GetEntityTypes().Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType)))
        {
            var p = Expression.Parameter(type.ClrType, "e");
            var filter = Expression.Lambda(Expression.Not(Expression.Property(p, nameof(BaseEntity.IsDeleted))), p);
            b.Entity(type.ClrType).HasQueryFilter(filter);
            b.Entity(type.ClrType).Property(nameof(BaseEntity.CreatedBy)).HasMaxLength(100);
        }

        b.Entity<User>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(200);
            e.HasIndex(x => x.Email).IsUnique().HasFilter("is_deleted = false");
            e.Property(x => x.LocationConsentVersion).HasMaxLength(20);
            e.HasOne(x => x.Driver).WithMany().OnDelete(DeleteBehavior.SetNull);
        });
        b.Entity<AuditLog>(e =>
        {
            e.Property(x => x.UserName).HasMaxLength(100);
            e.Property(x => x.Action).HasMaxLength(20);
            e.Property(x => x.EntityType).HasMaxLength(50);
            e.Property(x => x.Label).HasMaxLength(200);
            e.Property(x => x.Changes).HasMaxLength(2000);
            e.HasIndex(x => x.At);
            e.HasIndex(x => new { x.EntityType, x.EntityId });
        });
        b.Entity<RefreshToken>(e =>
        {
            e.Property(x => x.TokenHash).HasMaxLength(100);
            e.HasIndex(x => x.TokenHash).IsUnique();
        });
        b.Entity<Customer>(e =>
        {
            e.Ignore(x => x.CustomerNo);
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.TaxNumber).HasMaxLength(11);
            e.Property(x => x.TaxOffice).HasMaxLength(100);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Address).HasMaxLength(500);
            e.Property(x => x.City).HasMaxLength(30);
            e.Property(x => x.District).HasMaxLength(50);
            e.Property(x => x.ContactName).HasMaxLength(100);
            e.Property(x => x.EInvoiceAlias).HasMaxLength(200);
            e.HasIndex(x => x.Title);
        });
        b.Entity<Supplier>(e =>
        {
            e.Ignore(x => x.SupplierNo);
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.TaxNumber).HasMaxLength(11);
            e.Property(x => x.TaxOffice).HasMaxLength(100);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Address).HasMaxLength(500);
            e.Property(x => x.City).HasMaxLength(30);
            e.Property(x => x.District).HasMaxLength(50);
            e.Property(x => x.Iban).HasMaxLength(34);
            e.Property(x => x.ContactName).HasMaxLength(100);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.HasIndex(x => x.Title);
        });
        b.Entity<Vehicle>(e =>
        {
            e.Property(x => x.Plate).HasMaxLength(15);
            e.Property(x => x.Type).HasMaxLength(100);
            e.Property(x => x.Brand).HasMaxLength(50);
            e.Property(x => x.Model).HasMaxLength(50);
            e.HasIndex(x => x.Plate).IsUnique().HasFilter("is_deleted = false");
            e.HasOne(x => x.DefaultDriver).WithMany().OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Supplier).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.TrailerPlate).HasMaxLength(15);
        });
        b.Entity<Driver>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(100);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.NationalId).HasMaxLength(11);
            e.Property(x => x.LicenseClass).HasMaxLength(20);
            e.HasOne(x => x.Supplier).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.LicenseNo).HasMaxLength(30);
            e.Property(x => x.Address).HasMaxLength(300);
            e.Property(x => x.Plate).HasMaxLength(20);
            e.Property(x => x.Note).HasMaxLength(500);
        });
        b.Entity<Trip>(e =>
        {
            e.Property(x => x.LoadingAddress).HasMaxLength(300);
            e.Property(x => x.DeliveryAddress).HasMaxLength(300);
            e.Property(x => x.Description).HasMaxLength(1000);
            e.HasOne(x => x.Customer).WithMany(c => c.Trips).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Vehicle).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Driver).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Invoice).WithMany(i => i.Trips).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.LoadingDate);
            e.HasIndex(x => x.Status);
            e.Property(x => x.TrackingToken).HasMaxLength(40);
            e.HasIndex(x => x.TrackingToken).IsUnique();
            e.Property(x => x.CustomerReference).HasMaxLength(50);
            e.Property(x => x.CargoType).HasMaxLength(100);
            e.Property(x => x.CargoWeightKg).HasPrecision(12, 2);
            e.Property(x => x.CargoUnit).HasMaxLength(20);
            e.Property(x => x.TrailerPlate).HasMaxLength(15);
            e.Property(x => x.LoadingCity).HasMaxLength(30);
            e.Property(x => x.DeliveryCity).HasMaxLength(30);
            e.Property(x => x.LoadingContact).HasMaxLength(150);
            e.Property(x => x.DeliveryContact).HasMaxLength(150);
            e.Property(x => x.CarrierInvoiceNo).HasMaxLength(50);
            e.Property(x => x.ReceivedBy).HasMaxLength(100);
            e.HasOne(x => x.CarrierSupplier).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.CustomerReference);
            e.HasOne(x => x.JobRequest).WithOne(x => x.Trip).HasForeignKey<Trip>(x => x.JobRequestId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.JobRequestId).IsUnique();
            e.HasOne(x => x.CommissionAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.SaleVatRate).HasPrecision(5, 2);
            e.Property(x => x.CostVatRate).HasPrecision(5, 2);
            e.Property(x => x.ExtraChargeTaxNo).HasMaxLength(11);
            e.Property(x => x.ExtraChargeTitle).HasMaxLength(200);
            e.Property(x => x.CustomerGroup).HasMaxLength(50);
            e.Property(x => x.DeliveryDocumentNo).HasMaxLength(50);
            e.Property(x => x.WaybillNo).HasMaxLength(50);
            e.Property(x => x.EWaybillNo).HasMaxLength(50);
            e.Property(x => x.InvoiceFooterNote).HasMaxLength(500);
            e.Property(x => x.DeliveredBy).HasMaxLength(100);
            e.Property(x => x.PaymentTerms).HasMaxLength(100);
            e.Property(x => x.ExternalRef).HasMaxLength(40);
            e.HasIndex(x => x.ExternalRef);
            e.HasIndex(x => x.CustomerGroup);
        });
        b.Entity<JobRequest>(e =>
        {
            e.HasOne(x => x.Customer).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.LoadingAddress).HasMaxLength(300);
            e.Property(x => x.DeliveryAddress).HasMaxLength(300);
            e.Property(x => x.DeliveryWindow).HasMaxLength(100);
            e.Property(x => x.CargoType).HasMaxLength(100);
            e.Property(x => x.VehicleType).HasMaxLength(100);
            e.Property(x => x.LoadingDocumentNo).HasMaxLength(50);
            e.Property(x => x.WaybillNo).HasMaxLength(50);
            e.Property(x => x.InvoiceFooterNote).HasMaxLength(500);
            e.Property(x => x.Description).HasMaxLength(1000);
            e.Property(x => x.CargoQuantity).HasPrecision(12, 2);
            e.Property(x => x.LoadingLatitude).HasPrecision(9, 6);
            e.Property(x => x.LoadingLongitude).HasPrecision(9, 6);
            e.Property(x => x.DeliveryLatitude).HasPrecision(9, 6);
            e.Property(x => x.DeliveryLongitude).HasPrecision(9, 6);
            e.HasIndex(x => x.Date);
            e.HasIndex(x => x.Status);
        });
        b.Entity<TripEvent>(e =>
        {
            e.Property(x => x.UserName).HasMaxLength(100);
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne(x => x.Trip).WithMany(t => t.Events).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.TripId, x.OccurredAt });
            e.HasQueryFilter(x => !x.Trip.IsDeleted);
        });
        b.Entity<TripAttachment>(e =>
        {
            e.Property(x => x.FileName).HasMaxLength(200);
            e.Property(x => x.ContentType).HasMaxLength(100);
            e.Property(x => x.StoragePath).HasMaxLength(300);
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne(x => x.Trip).WithMany(t => t.Attachments).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.ClientRequestId).IsUnique().HasFilter("client_request_id IS NOT NULL");
        });
        b.Entity<PushToken>(e =>
        {
            e.Property(x => x.Token).HasMaxLength(200);
            e.Property(x => x.Platform).HasMaxLength(20);
            e.HasIndex(x => x.Token).IsUnique();
            e.HasOne(x => x.User).WithMany().OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<EInvoiceSequence>(e =>
        {
            e.Property(x => x.Prefix).HasMaxLength(3);
            e.HasIndex(x => new { x.Prefix, x.Year }).IsUnique();
        });
        b.Entity<PasswordResetToken>(e =>
        {
            e.Property(x => x.TokenHash).HasMaxLength(100);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasOne(x => x.User).WithMany().OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<NotificationPreference>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.Type }).IsUnique();
            e.HasOne(x => x.User).WithMany().OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<VehicleLocation>(e =>
        {
            e.HasIndex(x => new { x.VehicleId, x.RecordedAt });
            e.HasIndex(x => new { x.TripId, x.RecordedAt });
            e.HasIndex(x => x.RecordedAt);
        });
        b.Entity<Invoice>(e =>
        {
            e.Property(x => x.InvoiceNo).HasMaxLength(20);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.Property(x => x.ExternalId).HasMaxLength(100);
            e.Property(x => x.EInvoiceNo).HasMaxLength(16);
            e.Property(x => x.EInvoiceMessage).HasMaxLength(500);
            e.Property(x => x.WithholdingCode).HasMaxLength(10);
            e.Property(x => x.VatExemptionCode).HasMaxLength(10);
            e.HasIndex(x => x.EInvoiceNo).IsUnique().HasFilter("e_invoice_no IS NOT NULL");
            e.HasIndex(x => x.Ettn).IsUnique().HasFilter("ettn IS NOT NULL");
            e.Property(x => x.VatRate).HasPrecision(5, 2);
            e.HasIndex(x => x.InvoiceNo).IsUnique();
            e.HasOne(x => x.Customer).WithMany(c => c.Invoices).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<InvoiceLine>(e =>
        {
            e.Property(x => x.Description).HasMaxLength(300);
            e.HasOne(x => x.Invoice).WithMany(i => i.Lines).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<Payment>(e =>
        {
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasOne(x => x.Customer).WithMany(c => c.Payments).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Invoice).WithMany(i => i.Payments).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.CashAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.InstrumentNo).HasMaxLength(50);
            e.Property(x => x.Bank).HasMaxLength(100);
            e.HasIndex(x => x.InstrumentDueDate).HasFilter("instrument_status IS NOT NULL");
        });
        b.Entity<CashAccount>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Iban).HasMaxLength(34);
        });
        b.Entity<CashTransfer>(e =>
        {
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne(x => x.FromAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ToAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<Expense>(e =>
        {
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasOne(x => x.Vehicle).WithMany().OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Trip).WithMany(t => t.Expenses).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Supplier).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.ReceiptPath).HasMaxLength(300);
            e.Property(x => x.ReceiptContentType).HasMaxLength(100);
            e.Property(x => x.RejectionReason).HasMaxLength(300);
            e.Property(x => x.ReviewedBy).HasMaxLength(100);
            e.HasOne(x => x.CashAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.RecurringPayment).WithMany().OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.Date);
            e.HasIndex(x => x.ClientRequestId).IsUnique().HasFilter("client_request_id IS NOT NULL");
        });
        b.Entity<StoredFile>(e =>
        {
            e.Property(x => x.Path).HasMaxLength(300);
            e.Property(x => x.ContentType).HasMaxLength(100);
            e.HasIndex(x => x.Path).IsUnique();
        });
        b.Entity<SupplierPayment>(e =>
        {
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasOne(x => x.Supplier).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Trip).WithMany().OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.CashAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.Date);
        });
        b.Entity<Staff>(e =>
        {
            e.ToTable("staff");
            e.Property(x => x.FullName).HasMaxLength(150);
            e.Property(x => x.NationalId).HasMaxLength(11);
            e.Property(x => x.Phone).HasMaxLength(30);
            e.Property(x => x.Notes).HasMaxLength(500);
        });
        b.Entity<StaffTransaction>(e =>
        {
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne(x => x.Staff).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CashAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.StaffId, x.Date });
        });
        b.Entity<RecurringPayment>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(150);
            e.Property(x => x.Detail).HasMaxLength(500);
            e.HasOne(x => x.CashAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<DriverSettlement>(e =>
        {
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne(x => x.Driver).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CashAccount).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.DriverId, x.Date });
        });
        b.Entity<FleetDocument>(e =>
        {
            e.ToTable("documents");
            e.Property(x => x.No).HasMaxLength(50);
            e.Property(x => x.Note).HasMaxLength(500);
            e.Property(x => x.FilePath).HasMaxLength(300);
            e.Property(x => x.FileContentType).HasMaxLength(100);
            e.HasIndex(x => new { x.OwnerType, x.OwnerId });
            e.HasIndex(x => x.ExpiryDate);
        });
        b.Entity<MaintenanceRecord>(e =>
        {
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasOne(x => x.Vehicle).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Supplier).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Expense).WithMany().OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.VehicleId, x.Date });
        });
        b.Entity<CompanySettings>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.CompanyName).HasMaxLength(200);
            e.Property(x => x.InvoicePrefix).HasMaxLength(5);
            e.Property(x => x.City).HasMaxLength(30);
            e.Property(x => x.District).HasMaxLength(50);
            e.Property(x => x.MersisNo).HasMaxLength(20);
            e.Property(x => x.TradeRegistryNo).HasMaxLength(30);
            e.Property(x => x.Website).HasMaxLength(200);
            e.Property(x => x.DefaultVatRate).HasPrecision(5, 2);
            e.Property(x => x.EInvoiceSeriesPrefix).HasMaxLength(3);
            e.Property(x => x.EArchiveSeriesPrefix).HasMaxLength(3);
            e.Property(x => x.SenderAlias).HasMaxLength(200);
            e.HasData(new CompanySettings { Id = 1, UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) });
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.CreatedBy ??= currentUser?.Name;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }
        foreach (var entry in ChangeTracker.Entries<CompanySettings>().Where(e => e.State == EntityState.Modified))
            entry.Entity.UpdatedAt = now;
        return SaveWithAuditAsync(now, ct);
    }

    /// <summary>Değişiklikleri kaydeder, ardından işlem geçmişine yazar (yeni kayıtların Id'si kayıttan sonra belli olur).</summary>
    private async Task<int> SaveWithAuditAsync(DateTime now, CancellationToken ct)
    {
        var pending = ChangeTracker.Entries().Where(AuditTrail.Tracks).Select(AuditTrail.Describe).OfType<AuditTrail.Pending>().ToList();
        var result = await base.SaveChangesAsync(ct);
        if (pending.Count == 0) return result;
        AuditLogs.AddRange(pending.Select(p => AuditTrail.ToLog(p, now, currentUser?.Id, currentUser?.Name)));
        await base.SaveChangesAsync(ct);
        return result;
    }
}
