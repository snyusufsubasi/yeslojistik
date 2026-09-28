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
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<CompanySettings> CompanySettings => Set<CompanySettings>();
    public DbSet<TripAttachment> TripAttachments => Set<TripAttachment>();
    public DbSet<VehicleLocation> VehicleLocations => Set<VehicleLocation>();

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
            e.HasOne(x => x.Driver).WithMany().OnDelete(DeleteBehavior.SetNull);
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
        });
        b.Entity<Driver>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(100);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.NationalId).HasMaxLength(11);
            e.Property(x => x.LicenseClass).HasMaxLength(20);
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
        });
        b.Entity<TripAttachment>(e =>
        {
            e.Property(x => x.FileName).HasMaxLength(200);
            e.Property(x => x.ContentType).HasMaxLength(100);
            e.Property(x => x.StoragePath).HasMaxLength(300);
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasOne(x => x.Trip).WithMany(t => t.Attachments).OnDelete(DeleteBehavior.Cascade);
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
        });
        b.Entity<Expense>(e =>
        {
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasOne(x => x.Vehicle).WithMany().OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Trip).WithMany(t => t.Expenses).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.Date);
        });
        b.Entity<CompanySettings>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.CompanyName).HasMaxLength(200);
            e.Property(x => x.InvoicePrefix).HasMaxLength(5);
            e.Property(x => x.DefaultVatRate).HasPrecision(5, 2);
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
        return base.SaveChangesAsync(ct);
    }
}
