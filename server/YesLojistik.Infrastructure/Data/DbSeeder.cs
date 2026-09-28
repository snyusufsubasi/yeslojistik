using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Infrastructure.Data;

/// <summary>Demo firma bilgileri. "Demo verilerini temizle" bu değerlerde kalan alanları boşaltır.</summary>
public static class DemoCompany
{
    public const string Address = "Tuzla / İstanbul";
    public const string Phone = "0216 555 00 00";
    public const string Email = "info@yeslojistik.com";
    public const string TaxOffice = "Tuzla";
    public const string TaxNumber = "1234567890";
    public const string Iban = "TR00 0000 0000 0000 0000 0000 00";
}

public static class DbSeeder
{
    public static async Task SeedAdminAsync(AppDbContext db, string email, string password, string fullName)
    {
        if (await db.Users.IgnoreQueryFilters().AnyAsync()) return;
        var user = new User { FullName = fullName, Email = email.Trim().ToLowerInvariant(), Role = UserRole.Admin, CreatedBy = "sistem" };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    private static void SeedRoute(AppDbContext db, Trip trip, Vehicle vehicle, (double Lat, double Lng) from, (double Lat, double Lng) to, int points)
    {
        var start = DateTime.UtcNow.AddMinutes(-10 * points);
        for (var i = 0; i < points; i++)
        {
            var f = points == 1 ? 1 : i / (double)(points - 1);
            db.VehicleLocations.Add(new VehicleLocation
            {
                VehicleId = vehicle.Id, DriverId = trip.DriverId, TripId = trip.Id,
                Latitude = from.Lat + (to.Lat - from.Lat) * f + Math.Sin(f * 9) * 0.05,
                Longitude = from.Lng + (to.Lng - from.Lng) * f,
                SpeedKmh = points == 1 ? 0 : 75 + (i % 5) * 4, RecordedAt = start.AddMinutes(10 * i), CreatedAt = DateTime.UtcNow,
            });
        }
        var last = db.ChangeTracker.Entries<VehicleLocation>().Select(e => e.Entity).Where(l => l.VehicleId == vehicle.Id).MaxBy(l => l.RecordedAt)!;
        vehicle.LastLatitude = last.Latitude;
        vehicle.LastLongitude = last.Longitude;
        vehicle.LastSpeedKmh = last.SpeedKmh;
        vehicle.LastLocationAt = last.RecordedAt;
    }

    /// <summary>Geliştirme/demo için örnek veri. Veritabanında müşteri varsa hiçbir şey yapmaz.</summary>
    public static async Task SeedSampleDataAsync(AppDbContext db, InvoiceService invoices)
    {
        if (await db.Customers.IgnoreQueryFilters().AnyAsync()) return;
        // Canlıya geçişte demo veriler silindiyse, SAMPLE_DATA açık kalsa bile tekrar yüklenmez.
        if (await db.CompanySettings.AnyAsync(s => s.SampleDataClearedAt != null)) return;
        var today = Clock.Today;

        var settings = await db.CompanySettings.FirstAsync();
        settings.HasSampleData = true;
        settings.Address = DemoCompany.Address;
        settings.Phone = DemoCompany.Phone;
        settings.Email = DemoCompany.Email;
        settings.TaxOffice = DemoCompany.TaxOffice;
        settings.TaxNumber = DemoCompany.TaxNumber;
        settings.Iban = DemoCompany.Iban;

        var customers = new[]
        {
            new Customer { Title = "Yıldız Mobilya", Phone = "0216 555 44 33", Email = "info@yildizmobilya.com", Address = "İstanbul / Sultanbeyli", TaxOffice = "Sultanbeyli", TaxNumber = "1234567890" },
            new Customer { Title = "ABC İnşaat", Phone = "0312 444 55 66", Address = "Ankara / Çankaya", TaxOffice = "Çankaya" },
            new Customer { Title = "Dekor A.Ş.", Phone = "0262 333 22 11", Address = "Kocaeli / Gebze", TaxOffice = "Gebze" },
            new Customer { Title = "Haser Oto", Phone = "0216 222 33 44", Address = "İstanbul / Pendik" },
            new Customer { Title = "Martur", Phone = "0224 211 00 00", Address = "Bursa / Nilüfer" },
            new Customer { Title = "FLS", Phone = "0262 500 10 10", Address = "Kocaeli / Dilovası" },
            new Customer { Title = "Lineadecor", Phone = "0216 600 70 70", Address = "İstanbul / Ümraniye" },
        };
        db.Customers.AddRange(customers);

        var drivers = new[]
        {
            new Driver { FullName = "Mehmet Yılmaz", Phone = "0532 111 22 33", LicenseClass = "CE", SrcExpiry = today.AddDays(20), LicenseExpiry = today.AddYears(3) },
            new Driver { FullName = "Ali Demir", Phone = "0533 222 33 44", LicenseClass = "CE", SrcExpiry = today.AddYears(2), PsychotechnicExpiry = today.AddDays(-5) },
            new Driver { FullName = "Murat Kaya", Phone = "0534 333 44 55", LicenseClass = "C", SrcExpiry = today.AddYears(1) },
            new Driver { FullName = "Ahmet Çelik", Phone = "0535 444 55 66", LicenseClass = "C", SrcExpiry = today.AddYears(1) },
            new Driver { FullName = "İsmail Arslan", Phone = "0536 555 66 77", LicenseClass = "C", SrcExpiry = today.AddYears(1) },
        };
        db.Drivers.AddRange(drivers);

        var vehicles = new[]
        {
            new Vehicle { Plate = "34 VES 01", Type = "Kamyon", Brand = "Ford", Model = "Cargo", ModelYear = 2020, Km = 420_000, LastMaintenanceDate = today.AddMonths(-4), NextMaintenanceDate = today.AddDays(10), DefaultDriver = drivers[0] },
            new Vehicle { Plate = "34 ABC 06", Type = "Tır", Brand = "Mercedes", Model = "Axor", ModelYear = 2015, Km = 650_000, LastMaintenanceDate = today.AddMonths(-6), NextMaintenanceDate = today.AddMonths(2), DefaultDriver = drivers[1] },
            new Vehicle { Plate = "16 KZ 528", Type = "Kamyon", Brand = "Iveco", Model = "Eurocargo", ModelYear = 2018, Km = 780_000, LastMaintenanceDate = today.AddMonths(-2), NextMaintenanceDate = today.AddMonths(4), DefaultDriver = drivers[2] },
            new Vehicle { Plate = "34 VES 02", Type = "Kamyonet", Brand = "Ford", Model = "Transit", ModelYear = 2021, Km = 310_000, LastMaintenanceDate = today.AddMonths(-1), NextMaintenanceDate = today.AddMonths(5), InspectionExpiry = today.AddDays(25), DefaultDriver = drivers[3] },
            new Vehicle { Plate = "34 VK 03", Type = "Kamyonet", Brand = "Ford", Model = "Transit", ModelYear = 2022, Km = 210_000, LastMaintenanceDate = today.AddMonths(-3), NextMaintenanceDate = today.AddMonths(3), DefaultDriver = drivers[4] },
        };
        db.Vehicles.AddRange(vehicles);
        await db.SaveChangesAsync();

        Trip T(int c, int v, string from, string to, int dayOffset, decimal cost, decimal price, TripStatus status) => new()
        {
            CustomerId = customers[c].Id, VehicleId = vehicles[v].Id, DriverId = vehicles[v].DefaultDriverId!.Value,
            LoadingAddress = from, DeliveryAddress = to, LoadingDate = today.AddDays(dayOffset),
            DeliveryDate = status == TripStatus.Delivered ? today.AddDays(dayOffset + 1) : null,
            VehicleCost = cost, SalePrice = price, Status = status, Description = "Genel yük",
        };

        var trips = new List<Trip>
        {
            T(0, 0, "İstanbul / Sultanbeyli", "İzmir / Balçova", 0, 18_000, 25_000, TripStatus.OnRoad),
            T(1, 1, "Ankara", "İstanbul", 0, 22_000, 32_500, TripStatus.Loaded),
            T(2, 2, "Kocaeli", "Bursa", 1, 19_000, 28_000, TripStatus.Planned),
            T(3, 3, "İstanbul", "Kırşehir", 1, 26_000, 38_000, TripStatus.Planned),
            T(4, 4, "Bursa", "İstanbul", 2, 15_000, 22_500, TripStatus.Planned),
            T(5, 2, "Kocaeli", "Düzce", 2, 11_000, 17_000, TripStatus.Planned),
        };
        // Geçmiş, teslim edilmiş seferler (son 4 ay).
        var rnd = new Random(42);
        string[] cities = ["İstanbul", "Ankara", "İzmir", "Bursa", "Kocaeli", "Kayseri", "Konya", "Eskişehir", "Sakarya", "Tekirdağ"];
        for (var i = 0; i < 40; i++)
        {
            var c = rnd.Next(customers.Length);
            var v = rnd.Next(vehicles.Length);
            var price = Money.Round(rnd.Next(12, 45) * 1000m);
            var from = cities[rnd.Next(cities.Length)];
            var to = cities.Where(x => x != from).ElementAt(rnd.Next(cities.Length - 1));
            trips.Add(T(c, v, from, to, -rnd.Next(2, 120), Money.Round(price * 0.7m), price, TripStatus.Delivered));
        }
        db.Trips.AddRange(trips);
        vehicles[0].Status = VehicleStatus.OnRoad;
        vehicles[1].Status = VehicleStatus.OnRoad;
        await db.SaveChangesAsync();

        // Demo GPS: İstanbul → İzmir yolundaki araç ve Ankara'da yüklenen araç.
        SeedRoute(db, trips[0], vehicles[0], (40.93, 29.30), (39.20, 27.60), 24);
        SeedRoute(db, trips[1], vehicles[1], (39.93, 32.85), (39.93, 32.85), 1);
        vehicles[3].LastLatitude = 40.99; vehicles[3].LastLongitude = 29.12; vehicles[3].LastLocationAt = DateTime.UtcNow.AddHours(-3);

        // Demo şoför hesabı (mobil uygulama): Mehmet Yılmaz
        var driverUser = new User { FullName = drivers[0].FullName, Email = "sofor@yeslojistik.com", Role = UserRole.Driver, DriverId = drivers[0].Id };
        driverUser.PasswordHash = new PasswordHasher<User>().HashPassword(driverUser, "Sofor123!");
        db.Users.Add(driverUser);
        await db.SaveChangesAsync();

        var expenseCats = new[] { ExpenseCategory.Fuel, ExpenseCategory.Toll, ExpenseCategory.DriverAllowance, ExpenseCategory.Maintenance };
        foreach (var t in trips.Where(t => t.Status == TripStatus.Delivered).Take(25))
        {
            db.Expenses.Add(new Expense
            {
                Category = expenseCats[rnd.Next(expenseCats.Length)], Amount = Money.Round(rnd.Next(5, 30) * 100m),
                Date = t.LoadingDate, VehicleId = t.VehicleId, TripId = t.Id, Description = "Sefer gideri",
            });
        }
        db.Expenses.Add(new Expense { Category = ExpenseCategory.Insurance, Amount = 14_500, Date = today.AddDays(-20), VehicleId = vehicles[2].Id, Description = "Kasko yenileme" });
        db.Expenses.Add(new Expense { Category = ExpenseCategory.Tire, Amount = 32_000, Date = today.AddDays(-45), VehicleId = vehicles[1].Id, Description = "4 adet lastik" });

        // Yakıt alımları (litre + km): araç başına her ~10 günde depo doldurma, tüketim raporu için.
        foreach (var (vehicle, per100) in vehicles.Zip(new[] { 29m, 33m, 24m, 22m, 38m }))
        {
            var km = vehicle.Km - 6_000;
            for (var day = -80; day <= 0; day += 10)
            {
                var driven = day == -80 ? 0 : 600 + rnd.Next(0, 250);
                km += driven;
                var liters = day == -80 ? 300m : Math.Round(driven * per100 / 100m, 1);
                db.Expenses.Add(new Expense
                {
                    Category = ExpenseCategory.Fuel, Date = today.AddDays(day), VehicleId = vehicle.Id, DriverId = vehicle.DefaultDriver?.Id,
                    Liters = liters, Odometer = km, Amount = Money.Round(liters * 44.5m), Description = "Depo doldurma",
                });
            }
            vehicle.Km = Math.Max(vehicle.Km, km);
        }
        // Şoför avansları
        foreach (var (driver, i) in drivers.Select((d, i) => (d, i)))
            db.Expenses.Add(new Expense { Category = ExpenseCategory.DriverAdvance, Amount = 2_000 + i * 500, Date = today.AddDays(-7 - i), DriverId = driver.Id, Description = "Yol avansı" });
        await db.SaveChangesAsync();

        // Teslim edilmiş seferleri müşteri ve ay bazında faturala; bir kısmını tahsil et.
        var delivered = trips.Where(t => t.Status == TripStatus.Delivered).GroupBy(t => (t.CustomerId, t.LoadingDate.Year, t.LoadingDate.Month));
        var n = 0;
        foreach (var g in delivered.OrderBy(g => g.Min(t => t.LoadingDate)))
        {
            var date = g.Max(t => t.LoadingDate).AddDays(2);
            if (date > today) date = today;
            var inv = await invoices.CreateAsync(new(g.Key.CustomerId, date, null, settings.DefaultVatRate, settings.DefaultWithholdingTenths,
                null, false, g.Select(t => t.Id).ToList(), null));
            n++;
            if (n % 3 != 0)
                db.Payments.Add(new Payment { CustomerId = inv.CustomerId, InvoiceId = inv.Id, Date = date.AddDays(15) > today ? today : date.AddDays(15), Amount = inv.Total, Method = PaymentMethod.BankTransfer, Description = $"{inv.InvoiceNo} ödemesi" });
            else if (n % 2 == 0)
                db.Payments.Add(new Payment { CustomerId = inv.CustomerId, Date = today.AddDays(-3), Amount = Money.Round(inv.Total / 2), Method = PaymentMethod.Cash, Description = "Kısmi ödeme" });
        }
        await db.SaveChangesAsync();
    }
}
