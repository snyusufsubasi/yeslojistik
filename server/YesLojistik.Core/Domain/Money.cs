namespace YesLojistik.Core.Domain;

/// <summary>Tüm para yuvarlamaları bu sınıftan geçer (2 hane, yarım yukarı).</summary>
public static class Money
{
    public static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
