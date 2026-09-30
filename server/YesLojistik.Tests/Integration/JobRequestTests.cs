using System.Net;
using FluentAssertions;
using YesLojistik.Core.Dtos;
using YesLojistik.Core.Entities;

namespace YesLojistik.Tests.Integration;

public class JobRequestTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Request_can_be_converted_once_and_reopened_when_trip_is_deleted()
    {
        var client = await factory.LoginAsync();
        var customer = await (await client.PostJsonAsync("/api/customers", new CustomerSaveRequest(
            "Talep Test Müşterisi", "1234567890", "Tuzla", "0216 555 44 33", "talep@test.local", "İstanbul", null)))
            .ReadAsync<CustomerSummaryDto>();
        var driver = await (await client.PostJsonAsync("/api/drivers", new DriverSaveRequest(
            "Talep Test Şoförü", "05321234567", null, "ce", null, null, null, true))).ReadAsync<DriverDto>();
        var vehicle = await (await client.PostJsonAsync("/api/vehicles", new VehicleSaveRequest(
            "34 TLP 01", "Kamyon", "Ford", "Cargo", 2020, 1000, null, null, null, null,
            VehicleStatus.Available, driver.Id))).ReadAsync<VehicleDto>();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var request = await (await client.PostJsonAsync("/api/job-requests", new JobRequestSaveRequest(
            customer.Customer.Id, today, "İstanbul / Tuzla", "İzmir / Bornova", "2 gün", "Mobilya",
            10, "Kamyon", 25_000, 17_000, null, null, null, false, "EVR-1", "IRS-1", null,
            "Test yükü", null, null, null, null))).ReadAsync<JobRequestDto>();

        request.Status.Should().Be(JobRequestStatus.Pending);
        request.TripId.Should().BeNull();

        var tripRequest = new TripSaveRequest(customer.Customer.Id, vehicle.Id, driver.Id,
            request.LoadingAddress, request.DeliveryAddress, today, null, request.Description,
            request.CarrierPrice!.Value, request.SalePrice!.Value, JobRequestId: request.Id);
        var trip = await (await client.PostJsonAsync("/api/trips", tripRequest)).ReadAsync<TripDto>();
        trip.JobRequestId.Should().Be(request.Id);

        var converted = await (await client.GetAsync($"/api/job-requests/{request.Id}")).ReadAsync<JobRequestDto>();
        converted.Status.Should().Be(JobRequestStatus.Converted);
        converted.TripId.Should().Be(trip.Id);
        (await client.PostJsonAsync("/api/trips", tripRequest)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.DeleteAsync($"/api/job-requests/{request.Id}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.DeleteAsync($"/api/trips/{trip.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var reopened = await (await client.GetAsync($"/api/job-requests/{request.Id}")).ReadAsync<JobRequestDto>();
        reopened.Status.Should().Be(JobRequestStatus.Pending);
        reopened.TripId.Should().BeNull();
    }
}
