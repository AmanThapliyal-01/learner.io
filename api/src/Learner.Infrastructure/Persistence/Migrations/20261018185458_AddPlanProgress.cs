using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Learner.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "progress",
                schema: "plans",
                table: "plans",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "progress",
                schema: "plans",
                table: "plans");
        }
    }
}
