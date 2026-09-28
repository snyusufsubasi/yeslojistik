using FluentAssertions;
using YesLojistik.Api.Infrastructure;

namespace YesLojistik.Tests.Unit;

public class HostingSupportTests
{
    [Theory]
    [InlineData("postgresql://yl:p%40ss@dpg-abc.oregon-postgres.render.com/yeslojistik",
        "Host=dpg-abc.oregon-postgres.render.com;Port=5432;Database=yeslojistik;Username=yl;Password=p@ss")]
    [InlineData("postgres://u:x@db:6543/app", "Host=db;Port=6543;Database=app;Username=u;Password=x")]
    [InlineData("Host=localhost;Database=a", "Host=localhost;Database=a")]
    public void Converts_database_urls_to_npgsql_connection_strings(string input, string expected) =>
        HostingSupport.NormalizeConnectionString(input).Should().Be(expected);

    [Fact]
    public void Empty_value_is_null() => HostingSupport.NormalizeConnectionString(" ").Should().BeNull();
}
