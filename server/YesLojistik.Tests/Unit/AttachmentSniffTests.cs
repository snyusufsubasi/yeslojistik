using FluentAssertions;
using YesLojistik.Infrastructure.Services;

namespace YesLojistik.Tests.Unit;

public class AttachmentSniffTests
{
    [Fact]
    public void Detects_types_from_content()
    {
        AttachmentService.Sniff([0xFF, 0xD8, 0xFF, 0xE0])!.Value.ContentType.Should().Be("image/jpeg");
        AttachmentService.Sniff([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])!.Value.ContentType.Should().Be("image/png");
        AttachmentService.Sniff("RIFF\0\0\0\0WEBPVP8 "u8)!.Value.ContentType.Should().Be("image/webp");
        AttachmentService.Sniff("%PDF-1.7"u8)!.Value.ContentType.Should().Be("application/pdf");
    }

    [Fact]
    public void Rejects_other_content()
    {
        AttachmentService.Sniff("<html>"u8).Should().BeNull();
        AttachmentService.Sniff("MZ\x90\0"u8).Should().BeNull();
        AttachmentService.Sniff([]).Should().BeNull();
    }

    [Theory]
    [InlineData("34 VES 01", "34 VES **")]
    [InlineData("06 A 1234", "06 A ****")]
    public void Masks_plates(string plate, string expected) => TrackingService.MaskPlate(plate).Should().Be(expected);
}
