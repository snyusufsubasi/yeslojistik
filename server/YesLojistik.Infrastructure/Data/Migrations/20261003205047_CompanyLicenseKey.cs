using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CompanyLicenseKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "license_key",
                table: "company_settings",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "company_settings",
                keyColumn: "id",
                keyValue: 1,
                column: "license_key",
                value: null);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "license_key",
                table: "company_settings");
        }
    }
}
