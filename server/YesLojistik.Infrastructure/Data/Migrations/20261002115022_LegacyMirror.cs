using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class LegacyMirror : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "legacy_key",
                table: "vehicles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "legacy_balance",
                table: "suppliers",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "legacy_balance_at",
                table: "suppliers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "legacy_key",
                table: "suppliers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "legacy_key",
                table: "staff",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "legacy_key",
                table: "drivers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "legacy_balance",
                table: "customers",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "legacy_balance_at",
                table: "customers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "legacy_key",
                table: "customers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "mirror_last_at",
                table: "company_settings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mirror_last_summary",
                table: "company_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "mirror_mode",
                table: "company_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "spelling_exceptions",
                table: "company_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "legacy_key",
                table: "cash_accounts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "company_settings",
                keyColumn: "id",
                keyValue: 1,
                columns: new[] { "mirror_last_at", "mirror_last_summary", "mirror_mode", "spelling_exceptions" },
                values: new object[] { null, null, false, null });

            migrationBuilder.CreateIndex(
                name: "ix_vehicles_legacy_key",
                table: "vehicles",
                column: "legacy_key");

            migrationBuilder.CreateIndex(
                name: "ix_suppliers_legacy_key",
                table: "suppliers",
                column: "legacy_key");

            migrationBuilder.CreateIndex(
                name: "ix_staff_legacy_key",
                table: "staff",
                column: "legacy_key");

            migrationBuilder.CreateIndex(
                name: "ix_drivers_legacy_key",
                table: "drivers",
                column: "legacy_key");

            migrationBuilder.CreateIndex(
                name: "ix_customers_legacy_key",
                table: "customers",
                column: "legacy_key");

            migrationBuilder.CreateIndex(
                name: "ix_cash_accounts_legacy_key",
                table: "cash_accounts",
                column: "legacy_key");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_vehicles_legacy_key",
                table: "vehicles");

            migrationBuilder.DropIndex(
                name: "ix_suppliers_legacy_key",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "ix_staff_legacy_key",
                table: "staff");

            migrationBuilder.DropIndex(
                name: "ix_drivers_legacy_key",
                table: "drivers");

            migrationBuilder.DropIndex(
                name: "ix_customers_legacy_key",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_cash_accounts_legacy_key",
                table: "cash_accounts");

            migrationBuilder.DropColumn(
                name: "legacy_key",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "legacy_balance",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "legacy_balance_at",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "legacy_key",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "legacy_key",
                table: "staff");

            migrationBuilder.DropColumn(
                name: "legacy_key",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "legacy_balance",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "legacy_balance_at",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "legacy_key",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "mirror_last_at",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "mirror_last_summary",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "mirror_mode",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "spelling_exceptions",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "legacy_key",
                table: "cash_accounts");
        }
    }
}
