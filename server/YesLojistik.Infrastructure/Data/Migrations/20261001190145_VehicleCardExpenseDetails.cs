using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class VehicleCardExpenseDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "capacity",
                table: "vehicles",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "casco_expiry",
                table: "vehicles",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "casco_info",
                table: "vehicles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "emission_expiry",
                table: "vehicles",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "emission_info",
                table: "vehicles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "fuel_type",
                table: "vehicles",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "inspection_info",
                table: "vehicles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "insurance_info",
                table: "vehicles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "maintenance_info",
                table: "vehicles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "registration_owner",
                table: "vehicles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "category_name",
                table: "expenses",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "external_ref",
                table: "expenses",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "fuel_station",
                table: "expenses",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "fuel_type",
                table: "expenses",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "period_end",
                table: "expenses",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "period_start",
                table: "expenses",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "previous_odometer",
                table: "expenses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "title",
                table: "expenses",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "unit_price",
                table: "expenses",
                type: "numeric(12,3)",
                precision: 12,
                scale: 3,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_expenses_category_name",
                table: "expenses",
                column: "category_name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_expenses_category_name",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "capacity",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "casco_expiry",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "casco_info",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "emission_expiry",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "emission_info",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "fuel_type",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "inspection_info",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "insurance_info",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "maintenance_info",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "registration_owner",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "category_name",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "external_ref",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "fuel_station",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "fuel_type",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "period_end",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "period_start",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "previous_odometer",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "title",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "unit_price",
                table: "expenses");
        }
    }
}
