using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Text.Json;
using Balancy.DTOs;

namespace Balancy.Areas.Admin.Pages
{
    public class AuditlogModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public AuditlogModel(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public IList<AuditLogItem> AuditLogs { get; set; } = new List<AuditLogItem>();

        // قائمة لتخزين المستخدمين الفريدين لتعبئة قائمة الـ Select ديناميكياً
        public List<string> AvailableUsers { get; set; } = new List<string>();

        public string ErrorMessage { get; set; } = string.Empty;

        [BindProperty(SupportsGet = true)]
        public string? SelectedAction { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? SelectedUser { get; set; }

        [BindProperty(SupportsGet = true)]
        public DateTime? SelectedDate { get; set; }

        public async Task OnGetAsync()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");
                string apiUrl = "api/auditlog";

                var response = await client.GetAsync(apiUrl);

                if (response.IsSuccessStatusCode)
                {
                    var jsonString = await response.Content.ReadAsStringAsync();
                    var allLogs = JsonSerializer.Deserialize<IList<AuditLogItem>>(jsonString, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? new List<AuditLogItem>();

                    // استخراج أسماء المستخدمين الفريدين للقائمة المنسدلة
                    AvailableUsers = allLogs
                        .Where(l => !string.IsNullOrEmpty(l.UserName))
                        .Select(l => l.UserName!)
                        .Distinct()
                        .OrderBy(u => u)
                        .ToList();

                    // تطبيق عوامل التصفية (Filtering)
                    var query = allLogs.AsQueryable();

                    if (!string.IsNullOrEmpty(SelectedAction))
                    {
                        query = query.Where(l => l.Action == SelectedAction);
                    }

                    if (!string.IsNullOrEmpty(SelectedUser))
                    {
                        query = query.Where(l => l.UserName == SelectedUser || l.UserId == SelectedUser);
                    }

                    if (SelectedDate.HasValue)
                    {
                        query = query.Where(l => l.Timestamp.Date == SelectedDate.Value.Date);
                    }

                    AuditLogs = query.ToList();
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    ErrorMessage = $"خطأ من السيرفر: {(int)response.StatusCode} - {response.ReasonPhrase} | التفاصيل: {errorContent}";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"استثناء أثناء الاتصال: {ex.Message}";
            }
        }
    }
}