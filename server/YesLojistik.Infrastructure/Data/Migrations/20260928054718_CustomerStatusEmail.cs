using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CustomerStatusEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "notify_status_by_email",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "notify_status_by_email",
                table: "customers");
        }
    }
}
