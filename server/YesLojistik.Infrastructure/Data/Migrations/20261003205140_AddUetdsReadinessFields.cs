using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YesLojistik.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUetdsReadinessFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "consignee_tax_number",
                table: "trips",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "consignee_title",
                table: "trips",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "delivery_district",
                table: "trips",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "loading_district",
                table: "trips",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "loading_time",
                table: "trips",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "national_id",
                table: "drivers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(11)",
                oldMaxLength: 11,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "nationality",
                table: "drivers",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "consignee_tax_number",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "consignee_title",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "delivery_district",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "loading_district",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "loading_time",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "nationality",
                table: "drivers");

            migrationBuilder.AlterColumn<string>(
                name: "national_id",
                table: "drivers",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);
        }
    }
}
