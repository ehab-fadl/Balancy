using Balancy.DTOs;

namespace Balancy.Services // استبدل Balancy.Services بنطاق الأسماء المناسب لديك
{
    public interface IAuditLogService
    {
        Task LogAsync(string action, string? userId, string? userName, string? targetUserId, bool isSuccess, string? details);
        Task<IEnumerable<AuditLogItem>> GetAllLogsAsync();
        Task<IEnumerable<AuditLogItem>> GetLogsByUserIdAsync(string userId);
        Task<IEnumerable<AuditLogItem>> GetLogsByActionAsync(string action);
    }
}