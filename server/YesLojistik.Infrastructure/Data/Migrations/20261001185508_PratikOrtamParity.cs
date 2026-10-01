using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class PratikOrtamParity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "commission",
                table: "trips",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "commission_account_id",
                table: "trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "commission_invoiced",
                table: "trips",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "commission_status",
                table: "trips",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<bool>(
                name: "commission_vat_included",
                table: "trips",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "cost_vat_rate",
                table: "trips",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "cost_withholding_tenths",
                table: "trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "customer_group",
                table: "trips",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "customer_pays",
                table: "trips",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "delivered_by",
                table: "trips",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "delivery_document_approved",
                table: "trips",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "delivery_document_no",
                table: "trips",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "delivery_latitude",
                table: "trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "delivery_longitude",
                table: "trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "distance_km",
                table: "trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "driver_bonus",
                table: "trips",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateOnly>(
                name: "e_waybill_date",
                table: "trips",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "e_waybill_no",
                table: "trips",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "external_ref",
                table: "trips",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "extra_charge",
                table: "trips",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "extra_charge_invoiced",
                table: "trips",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "extra_charge_tax_no",
                table: "trips",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "extra_charge_title",
                table: "trips",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "extra_charge_vat_included",
                table: "trips",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "hide_carrier_price",
                table: "trips",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "invoice_footer_note",
                table: "trips",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "loading_latitude",
                table: "trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "loading_longitude",
                table: "trips",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payment_terms",
                table: "trips",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "purchase_invoice_id",
                table: "trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "sale_vat_rate",
                table: "trips",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 20m);

            migrationBuilder.AddColumn<int>(
                name: "sale_withholding_tenths",
                table: "trips",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "show_footer_note",
                table: "trips",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "waybill_no",
                table: "trips",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "address",
                table: "drivers",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "birth_year",
                table: "drivers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_foreign",
                table: "drivers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "license_no",
                table: "drivers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "note",
                table: "drivers",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "plate",
                table: "drivers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "rating",
                table: "drivers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "building_name",
                table: "customers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "building_no",
                table: "customers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "country",
                table: "customers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "door_no",
                table: "customers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "fax",
                table: "customers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_line_cargo",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_line_date",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_line_delivery",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_line_delivery_document_no",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_line_description",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_line_loading",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_line_plate",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_line_vehicle_type",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "invoice_template_note",
                table: "customers",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "invoice_template_sale_note_id",
                table: "customers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "invoice_template_scenario",
                table: "customers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "invoice_template_trip_footer_notes",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "invoice_template_withholding_note_id",
                table: "customers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "neighborhood",
                table: "customers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "postal_code",
                table: "customers",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "street",
                table: "customers",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "website",
                table: "customers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "customer_groups",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_groups", x => x.id);
                    table.ForeignKey(
                        name: "fk_customer_groups_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "invoice_notes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    account_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    iban = table.Column<string>(type: "character varying(34)", maxLength: 34, nullable: true),
                    text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_invoice_notes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "purchase_invoices",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    supplier_id = table.Column<int>(type: "integer", nullable: false),
                    invoice_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    vat_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    withholding_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_cancelled = table.Column<bool>(type: "boolean", nullable: false),
                    cancel_reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    file_path = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    file_content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    external_ref = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_purchase_invoices", x => x.id);
                    table.ForeignKey(
                        name: "fk_purchase_invoices_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalTable: "suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_trips_commission_account_id",
                table: "trips",
                column: "commission_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_trips_customer_group",
                table: "trips",
                column: "customer_group");

            migrationBuilder.CreateIndex(
                name: "ix_trips_external_ref",
                table: "trips",
                column: "external_ref");

            migrationBuilder.CreateIndex(
                name: "ix_trips_purchase_invoice_id",
                table: "trips",
                column: "purchase_invoice_id");

            migrationBuilder.CreateIndex(
                name: "ix_customer_groups_customer_id_name",
                table: "customer_groups",
                columns: new[] { "customer_id", "name" },
                unique: true,
                filter: "is_deleted = false");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoices_date",
                table: "purchase_invoices",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "ix_purchase_invoices_supplier_id_invoice_no",
                table: "purchase_invoices",
                columns: new[] { "supplier_id", "invoice_no" },
                unique: true,
                filter: "is_deleted = false");

            migrationBuilder.AddForeignKey(
                name: "fk_trips_cash_accounts_commission_account_id",
                table: "trips",
                column: "commission_account_id",
                principalTable: "cash_accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_trips_purchase_invoices_purchase_invoice_id",
                table: "trips",
                column: "purchase_invoice_id",
                principalTable: "purchase_invoices",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trips_cash_accounts_commission_account_id",
                table: "trips");

            migrationBuilder.DropForeignKey(
                name: "fk_trips_purchase_invoices_purchase_invoice_id",
                table: "trips");

            migrationBuilder.DropTable(
                name: "customer_groups");

            migrationBuilder.DropTable(
                name: "invoice_notes");

            migrationBuilder.DropTable(
                name: "purchase_invoices");

            migrationBuilder.DropIndex(
                name: "ix_trips_commission_account_id",
                table: "trips");

            migrationBuilder.DropIndex(
                name: "ix_trips_customer_group",
                table: "trips");

            migrationBuilder.DropIndex(
                name: "ix_trips_external_ref",
                table: "trips");

            migrationBuilder.DropIndex(
                name: "ix_trips_purchase_invoice_id",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "commission",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "commission_account_id",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "commission_invoiced",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "commission_status",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "commission_vat_included",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "cost_vat_rate",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "cost_withholding_tenths",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "customer_group",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "customer_pays",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivered_by",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivery_document_approved",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivery_document_no",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivery_latitude",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivery_longitude",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "distance_km",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "driver_bonus",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "e_waybill_date",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "e_waybill_no",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "external_ref",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "extra_charge",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "extra_charge_invoiced",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "extra_charge_tax_no",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "extra_charge_title",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "extra_charge_vat_included",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "hide_carrier_price",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "invoice_footer_note",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "loading_latitude",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "loading_longitude",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "payment_terms",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "purchase_invoice_id",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "sale_vat_rate",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "sale_withholding_tenths",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "show_footer_note",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "waybill_no",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "address",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "birth_year",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "is_foreign",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "license_no",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "note",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "plate",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "rating",
                table: "drivers");

            migrationBuilder.DropColumn(
                name: "building_name",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "building_no",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "country",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "door_no",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "fax",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_line_cargo",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_line_date",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_line_delivery",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_line_delivery_document_no",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_line_description",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_line_loading",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_line_plate",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_line_vehicle_type",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_note",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_sale_note_id",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_scenario",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_trip_footer_notes",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "invoice_template_withholding_note_id",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "neighborhood",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "postal_code",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "street",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "website",
                table: "customers");
        }
    }
}
