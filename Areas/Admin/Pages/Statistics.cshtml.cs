using Balancy.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Text.Json;

namespace Balancy.Areas.Admin.Pages
{
    public class StatisticsModel : PageModel
    {
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<StatisticsModel> _logger;

        public StatisticsModel(IHttpClientFactory clientFactory, ILogger<StatisticsModel> logger)
        {
            _clientFactory = clientFactory;
            _logger = logger;
        }

        public UserStatisticsDto Stats { get; set; } = new();
        public List<RecentUserDto> RecentUsers { get; set; } = new();

        public async Task<IActionResult> OnGetAsync()
        {
            try
            {
                var client = _clientFactory.CreateClient("BackendApi");

                // جلب جميع المستخدمين من الـ API المتاح: /api/admin/users
                var response = await client.GetAsync("api/admin/users");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var allUsers = JsonSerializer.Deserialize<List<ApiUserDto>>(content, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? new();

                    // 1. حساب الإحصائيات العامة
                    Stats.TotalUsers = allUsers.Count;
                    Stats.ActiveUsers = allUsers.Count(u => u.IsActive);
                    Stats.InactiveUsers = allUsers.Count(u => !u.IsActive);

                    // (افتراض أن لديك حقل تاريخ إنشاء أو يمكنك تعديله حسب الـ DTO الفعلي للمستخدم)
                    Stats.NewUsersThisWeek = allUsers.Count; // أو حسابها بناءً على التاريخ

                    // 2. حساب توزيع الأدوار
                    var roleCounts = new RoleCountDto();
                    foreach (var u in allUsers)
                    {
                        if (u.Role == "Admin") roleCounts.AdminCount++;
                        else if (u.Role == "Doctor") roleCounts.DoctorCount++;
                        else if (u.Role == "Searcher") roleCounts.SearcherCount++;
                        else roleCounts.NullUserCount++;
                    }
                    Stats.RolesCount = roleCounts;

                    // 3. تجهيز قائمة آخر المستخدمين المسجلين (مثلاً أحدث 5 مستخدمين)
                    RecentUsers = allUsers
                        .Select(u => new RecentUserDto
                        {
                            Name = $"{u.FirstName} {u.LastName}",
                            Email = u.Email,
                            Role = string.IsNullOrEmpty(u.Role) ? "NullUser" : u.Role,
                            IsActive = u.IsActive,
                            CreatedAtFormatted = "حديث" // أو تنسيق تاريخ التسجيل إذا كان متوفراً
                        })
                        .Take(5)
                        .ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "حدث خطأ أثناء جلب أو معالجة إحصائيات المستخدمين.");
            }

            return Page();
        }
    }
}