namespace YesLojistik.Core.Entities;

/// <summary>Seferin durum zaman çizelgesi: ne zaman yüklendi, yola çıktı, teslim edildi; kim, nereden.</summary>
public class TripEvent
{
    public long Id { get; set; }
    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public TripStatus Status { get; set; }
    /// <summary>Olayın gerçekleştiği an (şoför çevrimdışıysa telefondaki saat).</summary>
    public DateTime OccurredAt { get; set; }
    /// <summary>Sisteme yazıldığı an.</summary>
    public DateTime RecordedAt { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public TripEventSource Source { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Note { get; set; }
}
