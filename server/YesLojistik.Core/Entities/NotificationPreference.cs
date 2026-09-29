namespace YesLojistik.Core.Entities;

/// <summary>Ofis kullanıcılarına gidecek telefon bildirimi türleri.</summary>
public enum NotificationType
{
    TripDelivered, TripStatusChanged, DriverPhotoUploaded, DriverExpenseAdded, InvoiceOverdue, PayableDue, DocumentExpiring,
}

/// <summary>Kullanıcının bir bildirim türü için kişisel tercihi. Kayıt yoksa rolün varsayılanı geçerlidir.</summary>
public class NotificationPreference
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public NotificationType Type { get; set; }
    public bool Push { get; set; }

    /// <summary>Varsayılanlar: yönetici hepsini, operasyon sefer olaylarını, muhasebe finans olaylarını alır.</summary>
    public static bool Default(UserRole role, NotificationType type) => role switch
    {
        UserRole.Admin => true,
        UserRole.Operations => type is NotificationType.TripDelivered or NotificationType.TripStatusChanged
            or NotificationType.DriverPhotoUploaded or NotificationType.DriverExpenseAdded or NotificationType.DocumentExpiring,
        UserRole.Accounting => type is NotificationType.InvoiceOverdue or NotificationType.PayableDue or NotificationType.DriverExpenseAdded,
        _ => false,
    };
}
