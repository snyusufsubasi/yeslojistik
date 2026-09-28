namespace YesLojistik.Infrastructure.Services;

public static class Clock
{
    private static readonly TimeZoneInfo Istanbul = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Istanbul);
    public static DateOnly Today => DateOnly.FromDateTime(Now);
    public static DateOnly MonthStart => new(Today.Year, Today.Month, 1);
}
