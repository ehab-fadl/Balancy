using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Balancy.DTOs;
namespace Balancy.Areas.Admin.Pages
{
    public class EditViewModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EditViewModel(IHttpClientFactory httpClientFactory, IHttpContextAccessor httpContextAccessor)
        {
            _httpClientFactory = httpClientFactory;
            _httpContextAccessor = httpContextAccessor;
        }

        [BindProperty(SupportsGet = true)]
        public string Id { get; set; } = string.Empty;

        [BindProperty]
        public UpdateUserDto Input { get; set; } = new();

        public async Task<IActionResult> OnGetAsync()
        {
            if (string.IsNullOrEmpty(Id))
            {
                return RedirectToPage("Index");
            }

            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");
                ForwardAuthCookie(client);

                var response = await client.GetAsync($"api/admin/user/{Id}");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var userData = JsonSerializer.Deserialize<UserDetailsDto>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (userData != null)
                    {
                        Input = new UpdateUserDto
                        {
                            FirstName = userData.FirstName,
                            LastName = userData.LastName,
                            Email = userData.Email,
                            PhoneNumber = userData.PhoneNumber
                        };
                    }
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
            if (!ModelState.IsValid)
            {
                TempData["ErrorMessage"] = "يرجى التأكد من تعبئة جميع الحقول بشكل صحيح.";
                return Page();
            }

            try
            {
                var client = _httpClientFactory.CreateClient("BackendApi");
                ForwardAuthCookie(client);

                // إرسال طلب التحديث مع وضع الـ Id في الرابط حسب توثيق الباك إند
                var response = await client.PutAsJsonAsync($"api/admin/update-user/{Id}", Input);

                if (response.IsSuccessStatusCode)
                {
                    TempData["SuccessMessage"] = "تم تحديث بيانات المستخدم بنجاح!";
                    TempData["RedirectUrl"] = Url.Page("ViewUser", new { id = Id });
                }
                else
                {
                    var errorDetails = await response.Content.ReadAsStringAsync();
                    TempData["ErrorMessage"] = $"فشل التحديث: {errorDetails}";
                }
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = $"حدث خطأ أثناء الاتصال بالخادم: {ex.Message}";
            }

            return Page();
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