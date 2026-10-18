using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Learner.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SkillLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "assessed_level",
                schema: "learning",
                table: "skill_ratings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "target_level",
                schema: "learning",
                table: "skill_ratings",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "assessed_level",
                schema: "learning",
                table: "skill_ratings");

            migrationBuilder.DropColumn(
                name: "target_level",
                schema: "learning",
                table: "skill_ratings");
        }
    }
}
