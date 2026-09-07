namespace Balancy.DTOs
{
    public class RecentUserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // Admin, Doctor, Searcher, NullUser
        public bool IsActive { get; set; }
        public string CreatedAtFormatted { get; set; } = string.Empty;
    }
}
