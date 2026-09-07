using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Balancy.DTOs;

namespace Balancy.Areas.Admin.Pages
{
    public class IndexModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public IndexModel(IHttpClientFactory httpClientFactory, IHttpContextAccessor httpContextAccessor)
        {
            _httpClientFactory = httpClientFactory;
            _httpContextAccessor = httpContextAccessor;
        }

        private List<UserDto> AllUsers { get; set; } = new();
        public List<UserDto> Users { get; private set; } = new();

        // خاصية البحث لتلقي النص المدخل من الـ URL
        [BindProperty(SupportsGet = true)]
        public string SearchQuery { get; set; } = string.Empty;

        [BindProperty(SupportsGet = true)]
        public int CurrentPage { get; set; } = 1;
        public int PageSize { get; set; } = 5;
        public int TotalPages => (int)Math.Ceiling((double)FilteredUsersCount / PageSize);

        // عدد المستخدمين بعد الفلترة بالبحث
        private int FilteredUsersCount => string.IsNullOrWhiteSpace(SearchQuery)
            ? AllUsers.Count
            : AllUsers.Count(u =>
                (u.FirstName + " " + u.LastName).Contains(SearchQuery, StringComparison.OrdinalIgnoreCase) ||
                u.Email.Contains(SearchQuery, StringComparison.OrdinalIgnoreCase));

        // الإحصائيات العامة (تظل تحسب على إجمالي النظام لتبقى الأعداد دقيقة في الكونتينرات)
        public int TotalUsers => AllUsers.Count;
        public int AdminCount => AllUsers.Count(u => string.Equals(u.Role, "Admin", StringComparison.OrdinalIgnoreCase));
        public int DoctorCount => AllUsers.Count(u => string.Equals(u.Role, "Doctor", StringComparison.OrdinalIgnoreCase));
        public int SearcherCount => AllUsers.Count(u => string.Equals(u.Role, "Searcher", StringComparison.OrdinalIgnoreCase));
        public int ActiveUsersCount => AllUsers.Count(u => u.IsActive);
        public int NullUserCount => AllUsers.Count(u => string.IsNullOrEmpty(u.Role) || string.Equals(u.Role, "NullUser", StringComparison.OrdinalIgnoreCase));

        public async Task<IActionResult> OnGetAsync()
        {
            await LoadUsersDataAsync();
            return Page();
        }

        public async Task<IActionResult> OnPostToggleStatusAsync(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                return RedirectToPage(new { CurrentPage, SearchQuery });
            }

            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");

                // تمرير الـ Cookie الخاصة بالمصادقة للـ Backend بأمان
                var httpContext = _httpContextAccessor.HttpContext;
                if (httpContext != null && httpContext.Request.Headers.ContainsKey("Cookie"))
                {
                    var cookieHeader = httpContext.Request.Headers["Cookie"].ToString();
                    if (!client.DefaultRequestHeaders.Contains("Cookie"))
                    {
                        client.DefaultRequestHeaders.Add("Cookie", cookieHeader);
                    }
                }

                var response = await client.PostAsync($"api/admin/toggle-status/{id}", null);

                if (response.IsSuccessStatusCode)
                {
                    TempData["SuccessMessage"] = "تم تحديث حالة الحساب بنجاح.";
                }
                else
                {
                    TempData["ErrorMessage"] = "فشل تحديث حالة الحساب من السيرفر.";
                }
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = $"حدث خطأ أثناء الاتصال بالخادم: {ex.Message}";
            }

            return RedirectToPage(new { CurrentPage, SearchQuery });
        }

        // دالة مساعدة لجلب بيانات المستخدمين وتطبيق الفلترة والـ Pagination
        private async Task LoadUsersDataAsync()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");

                // تمرير الـ Cookie أيضاً عند جلب المستخدمين إذا تطلب الـ API ذلك
                var httpContext = _httpContextAccessor.HttpContext;
                if (httpContext != null && httpContext.Request.Headers.ContainsKey("Cookie"))
                {
                    var cookieHeader = httpContext.Request.Headers["Cookie"].ToString();
                    if (!client.DefaultRequestHeaders.Contains("Cookie"))
                    {
                        client.DefaultRequestHeaders.Add("Cookie", cookieHeader);
                    }
                }

                var response = await client.GetAsync("api/admin/users");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    AllUsers = JsonSerializer.Deserialize<List<UserDto>>(content, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? new();
                }
            }
            catch
            {
                AllUsers = new();
            }

            // 1. تطبيق الفلترة حسب البحث أولاً
            var query = AllUsers.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(SearchQuery))
            {
                query = query.Where(u =>
                    (u.FirstName + " " + u.LastName).Contains(SearchQuery, StringComparison.OrdinalIgnoreCase) ||
                    u.Email.Contains(SearchQuery, StringComparison.OrdinalIgnoreCase));
            }

            var filteredList = query.ToList();

            // 2. ضبط أمان الصفحات
            if (CurrentPage < 1) CurrentPage = 1;
            int totalPagesCalc = (int)Math.Ceiling((double)filteredList.Count / PageSize);
            if (totalPagesCalc > 0 && CurrentPage > totalPagesCalc) CurrentPage = totalPagesCalc;

            // 3. تطبيق الباجينيشن على النتائج المفلترة
            Users = filteredList
                .Skip((CurrentPage - 1) * PageSize)
                .Take(PageSize)
                .ToList();
        }
    }
}