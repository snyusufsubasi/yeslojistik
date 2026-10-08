using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class TripOpsTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "problem_note",
                table: "trips",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "problem_reason",
                table: "trips",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "trailer_type",
                table: "trips",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "transport_mode",
                table: "trips",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "trip_templates",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: true),
                    vehicle_id = table.Column<int>(type: "integer", nullable: true),
                    driver_id = table.Column<int>(type: "integer", nullable: true),
                    loading_city = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    loading_district = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    loading_address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    loading_contact = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    delivery_city = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    delivery_district = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    delivery_address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    delivery_contact = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    cargo_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    cargo_weight_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    cargo_quantity = table.Column<int>(type: "integer", nullable: true),
                    cargo_unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    transport_mode = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    trailer_type = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    sale_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    vehicle_cost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payment_terms = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    use_count = table.Column<int>(type: "integer", nullable: false),
                    last_used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trip_templates", x => x.id);
                    table.ForeignKey(
                        name: "fk_trip_templates_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_trip_templates_drivers_driver_id",
                        column: x => x.driver_id,
                        principalTable: "drivers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_trip_templates_vehicles_vehicle_id",
                        column: x => x.vehicle_id,
                        principalTable: "vehicles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_trip_templates_customer_id",
                table: "trip_templates",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_trip_templates_driver_id",
                table: "trip_templates",
                column: "driver_id");

            migrationBuilder.CreateIndex(
                name: "ix_trip_templates_vehicle_id",
                table: "trip_templates",
                column: "vehicle_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trip_templates");

            migrationBuilder.DropColumn(
                name: "problem_note",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "problem_reason",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "trailer_type",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "transport_mode",
                table: "trips");
        }
    }
}
