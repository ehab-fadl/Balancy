using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Text.Json;
using System.Threading.Tasks;
using Balancy.DTOs;
namespace Balancy.Areas.Admin.Pages
{
    public class ViewUserModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ViewUserModel(IHttpClientFactory httpClientFactory, IHttpContextAccessor httpContextAccessor)
        {
            _httpClientFactory = httpClientFactory;
            _httpContextAccessor = httpContextAccessor;
        }

        [BindProperty(SupportsGet = true)]
        public string Id { get; set; } = string.Empty;

        // كلاس يمثل بيانات المستخدم القادمة من الـ API
        public UserDetailsDto UserData { get; set; } = new();

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

                // المسار الصحيح لجلب تفاصيل مستخدم حسب الوثائق
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