using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using YesLojistik.Core.Dtos;
using YesLojistik.Infrastructure.Data;

namespace YesLojistik.Tests.Integration;

public class LegacyMirrorRemovalTests
{
    private static MirrorSnapshot Snapshot(int accounts, decimal balance = 5_000) => new(
        new DateTime(2026, 10, 4, 9, 0, 0, DateTimeKind.Utc),
        [],
        [new MirrorParty("C:TEST", "Örnek Müşteri", null, null, null, null, null, null, null, null, balance)],
        [], [], [], [],
        Enumerable.Range(1, accounts).Select(i => new MirrorCashAccount($"B:{i}", $"Örnek Hesap {i}")).ToList(),
        []);

    [Theory]
    [InlineData(1, 0, false)]
    [InlineData(3, 1, false)]
    [InlineData(9, 4, false)]
    [InlineData(10, 4, false)]
    [InlineData(1, 0, true)]
    public async Task Incomplete_snapshot_rejects_large_removal_even_for_small_collections_and_rolls_back(int before, int after, bool dryRun)
    {
        await using var factory = new ApiFactory();
        var client = await factory.LoginAsync();
        (await client.PostJsonAsync("/api/legacy/mode", new MirrorModeRequest(true))).EnsureSuccessStatusCode();
        (await client.PostJsonAsync("/api/legacy/mirror", Snapshot(before))).EnsureSuccessStatusCode();
        var initial = await ReadState(factory);

        // Müşteri bakiyesi bankalardan önce kaydediliyor: bankadaki eksiklik tüm işlemi geri almalı.
        var response = await client.PostJsonAsync($"/api/legacy/mirror?dryRun={dryRun.ToString().ToLowerInvariant()}", Snapshot(after, balance: 9_999));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("senkron durduruldu");
        (await ReadState(factory)).Should().BeEquivalentTo(initial);
    }

    [Fact]
    public async Task Small_collection_can_remove_less_than_half_or_use_the_explicit_override()
    {
        await using var factory = new ApiFactory();
        var client = await factory.LoginAsync();
        (await client.PostJsonAsync("/api/legacy/mode", new MirrorModeRequest(true))).EnsureSuccessStatusCode();
        (await client.PostJsonAsync("/api/legacy/mirror", Snapshot(3))).EnsureSuccessStatusCode();

        (await client.PostJsonAsync("/api/legacy/mirror", Snapshot(2))).EnsureSuccessStatusCode();
        (await ReadState(factory)).ActiveAccounts.Should().Be(2);

        (await client.PostJsonAsync("/api/legacy/mirror?allowLargeRemoval=true", Snapshot(0))).EnsureSuccessStatusCode();
        var final = await ReadState(factory);
        final.ActiveAccounts.Should().Be(0);
        final.DeletedAccounts.Should().Be(3);
    }

    private sealed record State(int ActiveAccounts, int DeletedAccounts, decimal? Balance, DateTime? LastAt, string? LastSummary, int AuditCount);

    private static async Task<State> ReadState(ApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var settings = await db.CompanySettings.AsNoTracking().SingleAsync();
        return new State(await db.CashAccounts.CountAsync(),
            await db.CashAccounts.IgnoreQueryFilters().CountAsync(a => a.IsDeleted),
            await db.Customers.Select(c => c.LegacyBalance).SingleAsync(),
            settings.MirrorLastAt, settings.MirrorLastSummary, await db.AuditLogs.CountAsync());
    }
}
