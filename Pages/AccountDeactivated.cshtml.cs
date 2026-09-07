using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Balancy.DTOs;

namespace Balancy.Pages
{
    [Authorize] // يجب أن يكون مسجلاً لدخوله ولكنه معطل
    public class AccountDeactivatedModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AccountDeactivatedModel(IHttpClientFactory httpClientFactory, IHttpContextAccessor httpContextAccessor)
        {
            _httpClientFactory = httpClientFactory;
            _httpContextAccessor = httpContextAccessor;
        }

        public UserDeactivatedDto UserData { get; set; } = new();

        public async Task<IActionResult> OnGetAsync()
        {
            // يمكنك جلب بيانات المستخدم الأساسية من الـ Claims أو من الـ API
            // هنا نجلبها من الـ API الخاص بملف المستخدم الحالي أو الـ Claims مباشرة
            var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "غير متوفر";
            var name = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "مستخدم النظام";

            UserData = new UserDeactivatedDto
            {
                FullName = name,
                Email = email
            };

            return Page();
        }

        // دالة تسجيل الخروج لكي يتمكن المستخدم من الخروج والعودة لصفحة تسجيل الدخول
        public async Task<IActionResult> OnPostLogoutAsync()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToPage("/Account/Login"); // عدل مسار صفحة تسجيل الدخول حسب مشروعك
        }

        private void ForwardAuthCookie(HttpClient client)
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext != null && httpContext.Request.Headers.ContainsKey("Cookie"))
            {
                var cookieHeader = httpContext.Request.Headers["Cookie"].ToString();
                if (!client.DefaultRequestHeaders.Contains("Cookie"))
                {
                    client.DefaultRequestHeaders.Add("Cookie", cookieHeader);
                }
            }
        }
    }

    
}