namespace Balancy.DTOs
{
    public class AuditLogItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Action { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? UserName { get; set; } = string.Empty;
        public string? TargetUserId { get; set; }
        public bool IsSuccess { get; set; }
        public string? Details { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
