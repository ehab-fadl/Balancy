using Balancy.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

namespace Balancy.Areas.Admin.Pages
{
    public class AssignRoleModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AssignRoleModel(IHttpClientFactory httpClientFactory, IHttpContextAccessor httpContextAccessor)
        {
            _httpClientFactory = httpClientFactory;
            _httpContextAccessor = httpContextAccessor;
        }

        [BindProperty(SupportsGet = true)]
        public string Id { get; set; } = string.Empty;

        public UserDetailsDto UserData { get; set; } = new();

        [BindProperty]
        public AssignRoleDto Input { get; set; } = new();

        public async Task<IActionResult> OnGetAsync()
        {
            if (string.IsNullOrEmpty(Id))
            {
                return RedirectToPage("Index");
            }

            try
            {
                // استخدام CreateClient بالطريقة الصحيحة
                var client = _httpClientFactory.CreateClient("BackendApi");
                ForwardAuthCookie(client);

                var response = await client.GetAsync($"api/admin/user/{Id}");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    UserData = JsonSerializer.Deserialize<UserDetailsDto>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                }
                else
                {
                    return RedirectToPage("Index");
                }
            }
            catch
            {
                return RedirectToPage("Index");
            }

            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (string.IsNullOrEmpty(Id))
            {
                return RedirectToPage("Index");
            }

            Input.UserId = Id;

            if (!ModelState.IsValid)
            {
                TempData["ErrorMessage"] = "يرجى اختيار الدور بشكل صحيح.";
                await LoadUserDataAsync();
                return Page();
            }

            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");
                ForwardAuthCookie(client);

                var response = await client.PostAsJsonAsync("api/admin/assign-role", Input);

                if (response.IsSuccessStatusCode)
                {
                    TempData["SuccessMessage"] = "تم تعيين الدور بنجاح!";
                    // التوجيه إلى صفحة ViewUser مع تمرير الـ Id عند النجاح
                    return RedirectToPage("ViewUser", new { id = Id });
                }
                else
                {
                    var errorDetails = await response.Content.ReadAsStringAsync();
                    TempData["ErrorMessage"] = $"فشل تعيين الدور: {errorDetails}";

                }
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = $"حدث خطأ أثناء الاتصال بالخادم: {ex.Message}";
            }

            await LoadUserDataAsync();
            return Page();
        }

        // دالة مساعدة لجلب بيانات المستخدم لتجنب تكرار الكود
        private async Task LoadUserDataAsync()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");
                ForwardAuthCookie(client);

                var response = await client.GetAsync($"api/admin/user/{Id}");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    UserData = JsonSerializer.Deserialize<UserDetailsDto>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                }
            }
            catch { }
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
