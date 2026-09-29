using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CashAccountsAndInstruments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "cash_account_id",
                table: "supplier_payments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "endorsed_from_payment_id",
                table: "supplier_payments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank",
                table: "payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "cash_account_id",
                table: "payments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "endorsed_supplier_payment_id",
                table: "payments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "instrument_due_date",
                table: "payments",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "instrument_no",
                table: "payments",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "instrument_status",
                table: "payments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "cash_account_id",
                table: "expenses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "cash_account_id",
                table: "driver_settlements",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "credit_limit",
                table: "customers",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "cash_accounts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    iban = table.Column<string>(type: "character varying(34)", maxLength: 34, nullable: true),
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
                    table.PrimaryKey("pk_cash_accounts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cash_transfers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    from_account_id = table.Column<int>(type: "integer", nullable: false),
                    to_account_id = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cash_transfers", x => x.id);
                    table.ForeignKey(
                        name: "fk_cash_transfers_cash_accounts_from_account_id",
                        column: x => x.from_account_id,
                        principalTable: "cash_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_cash_transfers_cash_accounts_to_account_id",
                        column: x => x.to_account_id,
                        principalTable: "cash_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_supplier_payments_cash_account_id",
                table: "supplier_payments",
                column: "cash_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_payments_cash_account_id",
                table: "payments",
                column: "cash_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_payments_instrument_due_date",
                table: "payments",
                column: "instrument_due_date",
                filter: "instrument_status IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_expenses_cash_account_id",
                table: "expenses",
                column: "cash_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_driver_settlements_cash_account_id",
                table: "driver_settlements",
                column: "cash_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_cash_transfers_from_account_id",
                table: "cash_transfers",
                column: "from_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_cash_transfers_to_account_id",
                table: "cash_transfers",
                column: "to_account_id");

            migrationBuilder.AddForeignKey(
                name: "fk_driver_settlements_cash_accounts_cash_account_id",
                table: "driver_settlements",
                column: "cash_account_id",
                principalTable: "cash_accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_expenses_cash_accounts_cash_account_id",
                table: "expenses",
                column: "cash_account_id",
                principalTable: "cash_accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_payments_cash_accounts_cash_account_id",
                table: "payments",
                column: "cash_account_id",
                principalTable: "cash_accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_supplier_payments_cash_accounts_cash_account_id",
                table: "supplier_payments",
                column: "cash_account_id",
                principalTable: "cash_accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_driver_settlements_cash_accounts_cash_account_id",
                table: "driver_settlements");

            migrationBuilder.DropForeignKey(
                name: "fk_expenses_cash_accounts_cash_account_id",
                table: "expenses");

            migrationBuilder.DropForeignKey(
                name: "fk_payments_cash_accounts_cash_account_id",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "fk_supplier_payments_cash_accounts_cash_account_id",
                table: "supplier_payments");

            migrationBuilder.DropTable(
                name: "cash_transfers");

            migrationBuilder.DropTable(
                name: "cash_accounts");

            migrationBuilder.DropIndex(
                name: "ix_supplier_payments_cash_account_id",
                table: "supplier_payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_cash_account_id",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_instrument_due_date",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_expenses_cash_account_id",
                table: "expenses");

            migrationBuilder.DropIndex(
                name: "ix_driver_settlements_cash_account_id",
                table: "driver_settlements");

            migrationBuilder.DropColumn(
                name: "cash_account_id",
                table: "supplier_payments");

            migrationBuilder.DropColumn(
                name: "endorsed_from_payment_id",
                table: "supplier_payments");

            migrationBuilder.DropColumn(
                name: "bank",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "cash_account_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "endorsed_supplier_payment_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "instrument_due_date",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "instrument_no",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "instrument_status",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "cash_account_id",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "cash_account_id",
                table: "driver_settlements");

            migrationBuilder.DropColumn(
                name: "credit_limit",
                table: "customers");
        }
    }
}
