using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DriverAppOffline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "location_consent_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "location_consent_version",
                table: "users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "client_request_id",
                table: "trip_attachments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "approval_status",
                table: "expenses",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Approved");

            migrationBuilder.AddColumn<Guid>(
                name: "client_request_id",
                table: "expenses",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "paid_by",
                table: "expenses",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Company");

            migrationBuilder.AddColumn<bool>(
                name: "require_delivery_photo",
                table: "company_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "require_delivery_signature",
                table: "company_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "company_settings",
                keyColumn: "id",
                keyValue: 1,
                columns: new[] { "require_delivery_photo", "require_delivery_signature" },
                values: new object[] { false, false });

            migrationBuilder.CreateIndex(
                name: "ix_trip_attachments_client_request_id",
                table: "trip_attachments",
                column: "client_request_id",
                unique: true,
                filter: "client_request_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_expenses_client_request_id",
                table: "expenses",
                column: "client_request_id",
                unique: true,
                filter: "client_request_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_trip_attachments_client_request_id",
                table: "trip_attachments");

            migrationBuilder.DropIndex(
                name: "ix_expenses_client_request_id",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "location_consent_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "location_consent_version",
                table: "users");

            migrationBuilder.DropColumn(
                name: "client_request_id",
                table: "trip_attachments");

            migrationBuilder.DropColumn(
                name: "approval_status",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "client_request_id",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "paid_by",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "require_delivery_photo",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "require_delivery_signature",
                table: "company_settings");
        }
    }
}
