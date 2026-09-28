using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DailyDigest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "daily_digest_enabled",
                table: "company_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "last_digest_date",
                table: "company_settings",
                type: "date",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "company_settings",
                keyColumn: "id",
                keyValue: 1,
                columns: new[] { "daily_digest_enabled", "last_digest_date" },
                values: new object[] { false, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "daily_digest_enabled",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "last_digest_date",
                table: "company_settings");
        }
    }
}
