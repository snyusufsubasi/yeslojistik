using YesLojistik.Core.Entities;

namespace YesLojistik.Api.Auth;

public static class Policies
{
    /// <summary>Sefer, araç ve şoför kayıtlarını değiştirebilir.</summary>
    public const string Operations = nameof(Operations);
    /// <summary>Fatura, tahsilat ve raporlara erişebilir.</summary>
    public const string Accounting = nameof(Accounting);
    /// <summary>Kullanıcı ve firma ayarlarını yönetebilir.</summary>
    public const string Admin = nameof(Admin);

    public static readonly string[] OperationsRoles = [nameof(UserRole.Admin), nameof(UserRole.Operations)];
    public static readonly string[] AccountingRoles = [nameof(UserRole.Admin), nameof(UserRole.Accounting)];
}
