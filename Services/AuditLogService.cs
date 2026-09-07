using System.Collections.Concurrent;
using Balancy.DTOs;

namespace Balancy.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly ConcurrentBag<AuditLogItem> _logs = new();

        public Task LogAsync(string action, string? userId, string? userName, string? targetUserId, bool isSuccess, string? details)
        {
            var logItem = new AuditLogItem
            {
                Id = Guid.NewGuid().ToString("N"),
                Action = action,
                UserId = userId,
                UserName = userName,
                TargetUserId = targetUserId,
                IsSuccess = isSuccess,
                Details = details,
                Timestamp = DateTime.UtcNow
            };

            _logs.Add(logItem);
            return Task.CompletedTask;
        }

        public Task<IEnumerable<AuditLogItem>> GetAllLogsAsync()
        {
            // استخدام AsEnumerable لتوحيد النوع إلى IEnumerable
            IEnumerable<AuditLogItem> items = _logs.OrderByDescending(l => l.Timestamp).AsEnumerable();
            return Task.FromResult(items);
        }

        public Task<IEnumerable<AuditLogItem>> GetLogsByUserIdAsync(string userId)
        {
            IEnumerable<AuditLogItem> items = _logs.Where(l => l.UserId == userId)
                                                   .OrderByDescending(l => l.Timestamp)
                                                   .AsEnumerable();
            return Task.FromResult(items);
        }

        public Task<IEnumerable<AuditLogItem>> GetLogsByActionAsync(string action)
        {
            IEnumerable<AuditLogItem> items = _logs.Where(l => l.Action.Equals(action, StringComparison.OrdinalIgnoreCase))
                                                   .OrderByDescending(l => l.Timestamp)
                                                   .AsEnumerable();
            return Task.FromResult(items);
        }
    }
}