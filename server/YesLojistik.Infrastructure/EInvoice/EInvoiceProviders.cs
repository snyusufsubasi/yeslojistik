using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using YesLojistik.Core.Abstractions;

namespace YesLojistik.Infrastructure.EInvoice;

/// <summary>
/// e-Fatura sağlayıcı kayıt tablosu. <c>EInvoice:Provider</c> (ortam değişkeni <c>EInvoice__Provider</c>) bu tablodaki bir adı seçer.
/// <list type="bullet">
/// <item><c>manual</c> (varsayılan; eski ad <c>FileExport</c> ve <c>xml</c> de çalışır): XML indirilir, portala elle yüklenir.</item>
/// <item><c>mock</c>: yalnızca geliştirme ve test.</item>
/// </list>
/// Gerçek bir entegratör eklemek için: <see cref="IEInvoiceProvider"/>'ı uygulayan sınıfı yazın ve aşağıdaki
/// <see cref="Registry"/>'ye tek satır ekleyin (adımlar: docs/ENTEGRATOR-EKLEME.md). Henüz hiçbir gerçek entegratör YOKTUR.
/// </summary>
public static class EInvoiceProviders
{
    public const string Default = "manual";

    /// <summary>Ad (büyük/küçük harf fark etmez) → sağlayıcıyı üreten fonksiyon. Adaptör IConfiguration, HttpClient vb. buradan alır.</summary>
    private static readonly Dictionary<string, Func<IServiceProvider, IEInvoiceProvider>> Registry = new(StringComparer.OrdinalIgnoreCase)
    {
        ["manual"] = _ => new ManualXmlProvider(),
        ["FileExport"] = _ => new ManualXmlProvider(),
        ["xml"] = _ => new ManualXmlProvider(),
        ["mock"] = _ => new MockEInvoiceProvider(),
        // Örnek (entegratör seçilince): ["nilvera"] = sp => new NilveraProvider(sp.GetRequiredService<HttpClient>(), sp.GetRequiredService<IConfiguration>()),
    };

    /// <summary>Kayıtlı sağlayıcı adları (ayar ekranı ve hata mesajları için).</summary>
    public static IReadOnlyCollection<string> Names => Registry.Keys;

    public static bool IsKnown(string? name) => !string.IsNullOrWhiteSpace(name) && Registry.ContainsKey(name.Trim());

    /// <summary>
    /// Sağlayıcıyı kaydeder. Tanınmayan ad (yazım hatası ya da henüz yazılmamış adaptör) sunucuyu düşürmez:
    /// uyarı yazılır ve <c>manual</c> kullanılır.
    /// </summary>
    public static void Register(IServiceCollection services, string? name)
    {
        var key = string.IsNullOrWhiteSpace(name) ? Default : name.Trim();
        services.AddSingleton<IEInvoiceProvider>(sp =>
        {
            if (Registry.TryGetValue(key, out var factory)) return factory(sp);
            sp.GetService<ILoggerFactory>()?.CreateLogger("EInvoice")
                .LogWarning("EInvoice:Provider='{Provider}' tanınmıyor; 'manual' kullanılıyor. Kayıtlı adlar: {Names}", key, string.Join(", ", Registry.Keys));
            return new ManualXmlProvider();
        });
    }
}
