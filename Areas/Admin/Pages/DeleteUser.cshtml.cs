using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Text.Json;
using System.Threading.Tasks;
using Balancy.DTOs;

namespace Balancy.Areas.Admin.Pages
{
    public class DeleteUserModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IHttpContextAccessor _httpContextAccessor;
       
        [TempData]
        public string ErrorMessage { get; set; }
        public DeleteUserModel(IHttpClientFactory httpClientFactory, IHttpContextAccessor httpContextAccessor)
        {
            _httpClientFactory = httpClientFactory;
            _httpContextAccessor = httpContextAccessor;
        }

        [BindProperty(SupportsGet = true)]
        public string Id { get; set; } = string.Empty;

        public string UserName { get; set; } = "المستخدم المحدد";

        public async Task<IActionResult> OnGetAsync()
        {
            if (string.IsNullOrEmpty(Id)) return RedirectToPage("Index");

            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");

                // تمرير الـ Cookie لجلب بيانات المستخدم حتى في الـ GET
                ForwardAuthCookie(client);

                var response = await client.GetAsync($"api/admin/users/{Id}");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var user = JsonSerializer.Deserialize<UserDto>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (user != null)
                    {
                        UserName = $"{user.FirstName} {user.LastName}";
                    }
                }
            }
            catch
            {
                UserName = "مستخدم نظام";
            }

            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (string.IsNullOrEmpty(Id)) return RedirectToPage("Index");

            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");
                ForwardAuthCookie(client);

                var response = await client.DeleteAsync($"api/admin/delete-user/{Id}");

                if (response.IsSuccessStatusCode)
                {
                    return RedirectToPage("Index");
                }
                else
                {
                    // قراءة رسالة الخطأ التي يرسلها الباك إند
                    var errorContent = await response.Content.ReadAsStringAsync();
                    ErrorMessage = $"فشل الحذف (Code {(int)response.StatusCode}): {errorContent}";
                    // مؤقتاً: سنقوم بالخروج للـ Index حتى لا تعلق في الحلقة، وتستطيع رؤية الخطأ
                    return RedirectToPage("Index");
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"حدث استثناء: {ex.Message}";
                return RedirectToPage("Index");
            }
        }

        // دالة مساعدة لنقل الـ Cookie من المتصفح إلى الـ HttpClient
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