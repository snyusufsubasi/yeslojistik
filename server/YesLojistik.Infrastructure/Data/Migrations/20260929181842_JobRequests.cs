using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class JobRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "job_request_id",
                table: "trips",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "job_requests",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    loading_address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    delivery_address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    delivery_window = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    cargo_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    cargo_quantity = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    vehicle_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    sale_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    carrier_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    commission = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    driver_bonus = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    other_expense = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    customer_pays = table.Column<bool>(type: "boolean", nullable: false),
                    loading_document_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    waybill_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    invoice_footer_note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    loading_latitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    loading_longitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    delivery_latitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    delivery_longitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_job_requests", x => x.id);
                    table.ForeignKey(
                        name: "fk_job_requests_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_trips_job_request_id",
                table: "trips",
                column: "job_request_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_job_requests_customer_id",
                table: "job_requests",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_job_requests_date",
                table: "job_requests",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "ix_job_requests_status",
                table: "job_requests",
                column: "status");

            migrationBuilder.AddForeignKey(
                name: "fk_trips_job_requests_job_request_id",
                table: "trips",
                column: "job_request_id",
                principalTable: "job_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trips_job_requests_job_request_id",
                table: "trips");

            migrationBuilder.DropTable(
                name: "job_requests");

            migrationBuilder.DropIndex(
                name: "ix_trips_job_request_id",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "job_request_id",
                table: "trips");
        }
    }
}
