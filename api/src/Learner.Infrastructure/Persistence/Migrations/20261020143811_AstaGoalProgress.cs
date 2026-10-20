using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Learner.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AstaGoalProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "progress",
                schema: "learning",
                table: "chat_messages",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "progress",
                schema: "learning",
                table: "chat_messages");
        }
    }
}
