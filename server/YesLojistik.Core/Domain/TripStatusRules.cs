using YesLojistik.Core.Entities;

namespace YesLojistik.Core.Domain;

public static class TripStatusRules
{
    private static readonly Dictionary<TripStatus, TripStatus[]> Allowed = new()
    {
        [TripStatus.Planned] = [TripStatus.Loaded, TripStatus.Cancelled],
        [TripStatus.Loaded] = [TripStatus.OnRoad, TripStatus.Planned, TripStatus.Cancelled],
        [TripStatus.OnRoad] = [TripStatus.Delivered, TripStatus.Loaded],
        [TripStatus.Delivered] = [TripStatus.OnRoad],
        [TripStatus.Cancelled] = [TripStatus.Planned],
    };

    public static IReadOnlyList<TripStatus> NextStatuses(TripStatus current) => Allowed[current];

    public static bool CanTransition(TripStatus from, TripStatus to) => Allowed[from].Contains(to);

    /// <summary>Araç bu durumdaki bir sefer tarafından kullanılıyor mu?</summary>
    public static bool OccupiesVehicle(TripStatus status) => status is TripStatus.Loaded or TripStatus.OnRoad;

    public static string Label(TripStatus s) => s switch
    {
        TripStatus.Planned => "Planlandı",
        TripStatus.Loaded => "Yüklendi",
        TripStatus.OnRoad => "Yolda",
        TripStatus.Delivered => "Teslim Edildi",
        TripStatus.Cancelled => "İptal",
        _ => s.ToString(),
    };
}
