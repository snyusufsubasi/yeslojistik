using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SuppliersAndTripDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ownership",
                table: "vehicles",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Own");

            migrationBuilder.AddColumn<int>(
                name: "supplier_id",
                table: "vehicles",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "trailer_plate",
                table: "vehicles",
                type: "character varying(15)",
                maxLength: 15,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "cargo_quantity",
                table: "trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cargo_type",
                table: "trips",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cargo_unit",
                table: "trips",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "cargo_weight_kg",
                table: "trips",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "carrier_invoice_date",
                table: "trips",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "carrier_invoice_no",
                table: "trips",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "carrier_supplier_id",
                table: "trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "customer_reference",
                table: "trips",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "delivered_at",
                table: "trips",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "delivery_city",
                table: "trips",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "delivery_contact",
                table: "trips",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "loading_city",
                table: "trips",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "loading_contact",
                table: "trips",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "received_by",
                table: "trips",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "trailer_plate",
                table: "trips",
                type: "character varying(15)",
                maxLength: 15,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "supplier_id",
                table: "drivers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "city",
                table: "customers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contact_name",
                table: "customers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "district",
                table: "customers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "e_invoice_alias",
                table: "customers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_e_invoice_user",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "payment_term_days",
                table: "customers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "city",
                table: "company_settings",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "district",
                table: "company_settings",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mersis_no",
                table: "company_settings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "trade_registry_no",
                table: "company_settings",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "website",
                table: "company_settings",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "suppliers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    tax_number = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    tax_office = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    city = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    district = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    iban = table.Column<string>(type: "character varying(34)", maxLength: 34, nullable: true),
                    contact_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    payment_term_days = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    opening_balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    opening_balance_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_suppliers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "trip_events",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    trip_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recorded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    user_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    source = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trip_events", x => x.id);
                    table.ForeignKey(
                        name: "fk_trip_events_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "company_settings",
                keyColumn: "id",
                keyValue: 1,
                columns: new[] { "city", "district", "mersis_no", "trade_registry_no", "website" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.CreateIndex(
                name: "ix_vehicles_supplier_id",
                table: "vehicles",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "ix_trips_carrier_supplier_id",
                table: "trips",
                column: "carrier_supplier_id");

            migrationBuilder.CreateIndex(
                name: "ix_trips_customer_reference",
                table: "trips",
                column: "customer_reference");

            migrationBuilder.CreateIndex(
                name: "ix_drivers_supplier_id",
                table: "drivers",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "ix_suppliers_title",
                table: "suppliers",
                column: "title");

            migrationBuilder.CreateIndex(
                name: "ix_trip_events_trip_id_occurred_at",
                table: "trip_events",
                columns: new[] { "trip_id", "occurred_at" });

            migrationBuilder.AddForeignKey(
                name: "fk_drivers_suppliers_supplier_id",
                table: "drivers",
                column: "supplier_id",
                principalTable: "suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_trips_suppliers_carrier_supplier_id",
                table: "trips",
                column: "carrier_supplier_id",
                principalTable: "suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_vehicles_suppliers_supplier_id",
                table: "vehicles",
                column: "supplier_id",
                principalTable: "suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_drivers_suppliers_supplier_id",
                table: "drivers");

            migrationBuilder.DropForeignKey(
                name: "fk_trips_suppliers_carrier_supplier_id",
                table: "trips");

            migrationBuilder.DropForeignKey(
                name: "fk_vehicles_suppliers_supplier_id",
                table: "vehicles");

            migrationBuilder.DropTable(
                name: "suppliers");

            migrationBuilder.DropTable(
                name: "trip_events");

            migrationBuilder.DropIndex(
                name: "ix_vehicles_supplier_id",
                table: "vehicles");

            migrationBuilder.DropIndex(
                name: "ix_trips_carrier_supplier_id",
                table: "trips");

            migrationBuilder.DropIndex(
                name: "ix_trips_customer_reference",
                table: "trips");

            migrationBuilder.DropIndex(
                name: "ix_drivers_supplier_id",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "ownership",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "supplier_id",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "trailer_plate",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "cargo_quantity",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "cargo_type",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "cargo_unit",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "cargo_weight_kg",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "carrier_invoice_date",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "carrier_invoice_no",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "carrier_supplier_id",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "customer_reference",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivered_at",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivery_city",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivery_contact",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "loading_city",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "loading_contact",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "received_by",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "trailer_plate",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "supplier_id",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "city",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "contact_name",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "district",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "e_invoice_alias",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "is_e_invoice_user",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "payment_term_days",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "city",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "district",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "mersis_no",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "trade_registry_no",
                table: "company_settings");

            migrationBuilder.DropColumn(
                name: "website",
                table: "company_settings");
        }
    }
}
