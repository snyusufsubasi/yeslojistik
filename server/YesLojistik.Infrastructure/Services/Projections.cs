using System.Linq.Expressions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Infrastructure.Services;

/// <summary>Birden çok yerde kullanılan EF projeksiyonları (ifade ağacında isteğe bağlı parametre kullanılamadığı için tüm alanlar açıkça verilir).</summary>
public static class Projections
{
    public static readonly Expression<Func<Vehicle, VehicleDto>> Vehicle = v => new VehicleDto(v.Id, v.Plate, v.Type,
        v.Brand, v.Model, v.ModelYear, v.Km, v.LastMaintenanceDate, v.NextMaintenanceDate, v.InspectionExpiry,
        v.InsuranceExpiry, v.Status, v.DefaultDriverId, v.DefaultDriver != null ? v.DefaultDriver.FullName : null,
        v.Ownership, v.SupplierId, v.Supplier != null ? v.Supplier.Title : null, v.TrailerPlate, v.NextMaintenanceKm,
        new VehicleCard(v.Capacity, v.FuelType, v.InsuranceInfo, v.CascoInfo, v.CascoExpiry, v.InspectionInfo, v.EmissionInfo, v.EmissionExpiry,
            v.MaintenanceInfo, v.RegistrationOwner));

    public static readonly Expression<Func<Driver, DriverDto>> Driver = d => new DriverDto(d.Id, d.FullName, d.Phone,
        d.NationalId, d.LicenseClass, d.LicenseExpiry, d.SrcExpiry, d.PsychotechnicExpiry, d.IsActive,
        d.SupplierId, d.Supplier != null ? d.Supplier.Title : null, false, null,
        d.LicenseNo, d.BirthYear, d.Address, d.IsForeign, d.Plate, d.Rating, d.Note);
}
