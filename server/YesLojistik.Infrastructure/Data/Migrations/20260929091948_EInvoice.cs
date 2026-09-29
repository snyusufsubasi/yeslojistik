using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class EInvoice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "e_invoice_message",
                table: "invoices",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "e_invoice_no",
                table: "invoices",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "e_invoice_sent_at",
                table: "invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "e_invoice_status",
                table: "invoices",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "None");

            migrationBuilder.AddColumn<Guid>(
                name: "ettn",
                table: "invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "scenario",
                table: "invoices",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "type_code",
                table: "invoices",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vat_exemption_code",
                table: "invoices",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "withholding_code",
                table: "invoices",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "default_scenario",
                table: "company_settings",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Temel");

            migrationBuilder.AddColumn<string>(
                name: "e_archive_series_prefix",
                table: "company_settings",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "YEA");

            migrationBuilder.AddColumn<bool>(
                name: "e_invoice_enabled",
                table: "company_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "e_invoice_series_prefix",
                table: "company_settings",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "YES");

            migrationBuilder.AddColumn<string>(
                name: "sender_alias",
                table: "company_settings",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "e_invoice_sequences",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    prefix = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    year = table.Column<int>(type: "integer", nullable: false),
                    next = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_e_invoice_sequences", x => x.id);
                });

            migrationBuilder.UpdateData(
                table: "company_settings",
                keyColumn: "id",
                keyValue: 1,
                columns: new[] { "default_scenario", "e_archive_series_prefix", "e_invoice_enabled", "e_invoice_series_prefix", "sender_alias" },
                values: new object[] { "Temel", "YEA", false, "YES", null });

            migrationBuilder.CreateIndex(
                name: "ix_invoices_e_invoice_no",
                table: "invoices",
                column: "e_invoice_no",
                unique: true,
                filter: "e_invoice_no IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_invoices_ettn",
                table: "invoices",
                column: "ettn",
                unique: true,
                filter: "ettn IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_e_invoice_sequences_prefix_year",
                table: "e_invoice_sequences",
                columns: new[] { "prefix", "year" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "e_invoice_sequences");

            migrationBuilder.DropIndex(
                name: "ix_invoices_e_invoice_no",
                table: "invoices");

            migrationBuilder.DropIndex(
                name: "ix_invoices_ettn",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "e_invoice_message",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "e_invoice_no",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "e_invoice_sent_at",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "e_invoice_status",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "ettn",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "scenario",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "type_code",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "vat_exemption_code",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "withholding_code",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "default_scenario",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "e_archive_series_prefix",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "e_invoice_enabled",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "e_invoice_series_prefix",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "sender_alias",
                table: "company_settings");
        }
    }
}
