namespace Balancy.DTOs
{
    public class UserStatisticsDto
    {
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public int NewUsersThisWeek { get; set; }

        public double TotalChangePercentage { get; set; }
        public int ActiveChangeCount { get; set; }
        public int InactiveChangeCount { get; set; }

        public RoleCountDto RolesCount { get; set; } = new();
    }
}
