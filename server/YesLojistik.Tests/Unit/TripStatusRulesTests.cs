using FluentAssertions;
using YesLojistik.Core.Domain;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Unit;

public class TripStatusRulesTests
{
    [Theory]
    [InlineData(TripStatus.Planned, TripStatus.Loaded, true)]
    [InlineData(TripStatus.Loaded, TripStatus.OnRoad, true)]
    [InlineData(TripStatus.OnRoad, TripStatus.Delivered, true)]
    [InlineData(TripStatus.Planned, TripStatus.Cancelled, true)]
    [InlineData(TripStatus.Cancelled, TripStatus.Planned, true)]
    [InlineData(TripStatus.Planned, TripStatus.Delivered, false)]
    [InlineData(TripStatus.OnRoad, TripStatus.Cancelled, false)]
    [InlineData(TripStatus.Delivered, TripStatus.Cancelled, false)]
    [InlineData(TripStatus.Cancelled, TripStatus.Delivered, false)]
    public void Enforces_transitions(TripStatus from, TripStatus to, bool allowed) =>
        TripStatusRules.CanTransition(from, to).Should().Be(allowed);

    [Fact]
    public void Every_status_has_a_label_and_transition_list()
    {
        foreach (var s in Enum.GetValues<TripStatus>())
        {
            TripStatusRules.Label(s).Should().NotBe(s.ToString());
            TripStatusRules.NextStatuses(s).Should().NotBeNull();
        }
    }
}
