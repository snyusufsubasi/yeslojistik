using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExpenseFuelAndDriver : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "driver_id",
                table: "expenses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "liters",
                table: "expenses",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "odometer",
                table: "expenses",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_expenses_driver_id",
                table: "expenses",
                column: "driver_id");

            migrationBuilder.AddForeignKey(
                name: "fk_expenses_drivers_driver_id",
                table: "expenses",
                column: "driver_id",
                principalTable: "drivers",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_expenses_drivers_driver_id",
                table: "expenses");

            migrationBuilder.DropIndex(
                name: "ix_expenses_driver_id",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "driver_id",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "liters",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "odometer",
                table: "expenses");
        }
    }
}
