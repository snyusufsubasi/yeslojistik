using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DriverAppTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "last_latitude",
                table: "vehicles",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_location_at",
                table: "vehicles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "last_longitude",
                table: "vehicles",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "last_speed_kmh",
                table: "vehicles",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "driver_id",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tracking_token",
                table: "trips",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "trip_attachments",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    trip_id = table.Column<int>(type: "integer", nullable: false),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    file_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    size = table.Column<long>(type: "bigint", nullable: false),
                    storage_path = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trip_attachments", x => x.id);
                    table.ForeignKey(
                        name: "fk_trip_attachments_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_locations",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    vehicle_id = table.Column<int>(type: "integer", nullable: false),
                    driver_id = table.Column<int>(type: "integer", nullable: true),
                    trip_id = table.Column<int>(type: "integer", nullable: true),
                    latitude = table.Column<double>(type: "double precision", nullable: false),
                    longitude = table.Column<double>(type: "double precision", nullable: false),
                    speed_kmh = table.Column<double>(type: "double precision", nullable: true),
                    heading = table.Column<double>(type: "double precision", nullable: true),
                    accuracy = table.Column<double>(type: "double precision", nullable: true),
                    recorded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vehicle_locations", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_users_driver_id",
                table: "users",
                column: "driver_id");

            migrationBuilder.CreateIndex(
                name: "ix_trips_tracking_token",
                table: "trips",
                column: "tracking_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_trip_attachments_trip_id",
                table: "trip_attachments",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "ix_vehicle_locations_recorded_at",
                table: "vehicle_locations",
                column: "recorded_at");

            migrationBuilder.CreateIndex(
                name: "ix_vehicle_locations_trip_id_recorded_at",
                table: "vehicle_locations",
                columns: new[] { "trip_id", "recorded_at" });

            migrationBuilder.CreateIndex(
                name: "ix_vehicle_locations_vehicle_id_recorded_at",
                table: "vehicle_locations",
                columns: new[] { "vehicle_id", "recorded_at" });

            migrationBuilder.AddForeignKey(
                name: "fk_users_drivers_driver_id",
                table: "users",
                column: "driver_id",
                principalTable: "drivers",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_users_drivers_driver_id",
                table: "users");

            migrationBuilder.DropTable(
                name: "trip_attachments");

            migrationBuilder.DropTable(
                name: "vehicle_locations");

            migrationBuilder.DropIndex(
                name: "ix_users_driver_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_trips_tracking_token",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "last_latitude",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "last_location_at",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "last_longitude",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "last_speed_kmh",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "driver_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "tracking_token",
                table: "trips");
        }
    }
}
