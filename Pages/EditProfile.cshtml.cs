using Balancy.DTOs;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Json;
using System.Security.Claims;

namespace Balancy.Pages
{
    public class EditProfileModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public EditProfileModel(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [BindProperty]
        public UserProfileDto ProfileData { get; set; } = new();

        public string ErrorMessage { get; set; }

        [TempData]
        public string SuccessMessage { get; set; } // لإظهار رسالة النجاح بعد الحفظ

        public string CancelRedirectUrl { get; set; } = "/Index";

        public async Task<IActionResult> OnGetAsync()
        {
            var client = _httpClientFactory.CreateClient("BackendApi");

            try
            {
                // جلب التوكن المخزن في خصائص الكوكي وإرفاقه بالهيدر
                string token = await HttpContext.GetTokenAsync("access_token");
                if (string.IsNullOrEmpty(token))
                {
                    token = User.FindFirst("JWTToken")?.Value;
                }

                if (!string.IsNullOrEmpty(token))
                {
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                }

                var response = await client.GetAsync("api/auth/me");

                if (response.IsSuccessStatusCode)
                {
                    ProfileData = await response.Content.ReadFromJsonAsync<UserProfileDto>();

                    if (ProfileData != null && !string.IsNullOrEmpty(ProfileData.Role))
                    {
                        string targetArea = "";
                        var role = ProfileData.Role;

                        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) targetArea = "Admin";
                        else if (role.Equals("Doctor", StringComparison.OrdinalIgnoreCase)) targetArea = "Doctor";
                        else if (role.Equals("Searcher", StringComparison.OrdinalIgnoreCase)) targetArea = "Searcher";
                        else targetArea = "NullUser";

                        CancelRedirectUrl = Url.Page("/Index", new { area = targetArea }) ?? "/Index";
                    }
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    return RedirectToPage("/Login");
                }
                else
                {
                    ErrorMessage = "فشل في جلب بيانات البروفايل. يرجى المحاولة لاحقاً.";
                }
            }
            catch (HttpRequestException)
            {
                ErrorMessage = "انقطع الاتصال بالسيرفر أو الإنترنت. يرجى التحقق من اتصالك والمحاولة لاحقاً.";
            }
            catch (Exception ex)
            {
                ErrorMessage = "حدث خطأ غير متوقع أثناء الاتصال بالخادم.";
            }

            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            var client = _httpClientFactory.CreateClient("BackendApi");

            // 1. جلب التوكن الحالي قبل أي شيء
            string token = await HttpContext.GetTokenAsync("access_token");
            if (string.IsNullOrEmpty(token))
            {
                token = User.FindFirst("JWTToken")?.Value;
            }

            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            try
            {
                var getResponse = await client.GetAsync("api/auth/me");
                if (getResponse.IsSuccessStatusCode)
                {
                    var oldData = await getResponse.Content.ReadFromJsonAsync<UserProfileDto>();
                    if (oldData != null)
                    {
                        if (string.IsNullOrEmpty(ProfileData.Role)) ProfileData.Role = oldData.Role;
                        if (string.IsNullOrEmpty(ProfileData.Id)) ProfileData.Id = oldData.Id;
                    }
                }
            }
            catch { }

            if (!ModelState.IsValid)
            {
                ErrorMessage = "يرجى التأكد من تعبئة الحقول المطلوبة بشكل صحيح.";
                return Page();
            }

            try
            {
                var response = await client.PutAsJsonAsync("api/auth/me", ProfileData);

                if (response.IsSuccessStatusCode)
                {
                    TempData["SuccessMessage"] = "تم تحديث البيانات بنجاح!";

                    if (User.Identity is ClaimsIdentity identity && identity.IsAuthenticated)
                    {
                        var existingFirstName = identity.FindFirst("FirstName");
                        if (existingFirstName != null) identity.TryRemoveClaim(existingFirstName);

                        var existingLastName = identity.FindFirst("LastName");
                        if (existingLastName != null) identity.TryRemoveClaim(existingLastName);

                        var existingName = identity.FindFirst(ClaimTypes.Name);
                        if (existingName != null) identity.TryRemoveClaim(existingName);

                        identity.AddClaim(new Claim("FirstName", ProfileData.FirstName ?? ""));
                        identity.AddClaim(new Claim("LastName", ProfileData.LastName ?? ""));

                        string fullName = $"{ProfileData.FirstName} {ProfileData.LastName}".Trim();
                        identity.AddClaim(new Claim(ClaimTypes.Name, string.IsNullOrEmpty(fullName) ? "مستخدم" : fullName));

                        // 2. سحب التوكنات القديمة المخزنة في الكوكي لكي لا تضيع بعد التحديث
                        var authResult = await HttpContext.AuthenticateAsync(Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme);
                        var existingTokens = authResult.Properties?.GetTokens() ?? Enumerable.Empty<AuthenticationToken>();

                        var authProperties = new AuthenticationProperties
                        {
                            IsPersistent = true
                        };

                        // 3. إعادة تخزين التوكنات في الخصائص الجديدة للكوكي
                        authProperties.StoreTokens(existingTokens);

                        // احتياطياً: إذا كان التوكن مخزناً كـ Claim أيضاً
                        if (!string.IsNullOrEmpty(token) && !identity.HasClaim(c => c.Type == "JWTToken"))
                        {
                            identity.AddClaim(new Claim("JWTToken", token));
                        }

                        await HttpContext.SignInAsync(
                            Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme,
                            new ClaimsPrincipal(identity),
                            authProperties);
                    }

                    var userRole = ProfileData.Role;
                    string targetArea = "";

                    if (!string.IsNullOrEmpty(userRole))
                    {
                        if (userRole.Equals("Admin", StringComparison.OrdinalIgnoreCase)) targetArea = "Admin";
                        else if (userRole.Equals("Doctor", StringComparison.OrdinalIgnoreCase)) targetArea = "Doctor";
                        else if (userRole.Equals("Searcher", StringComparison.OrdinalIgnoreCase)) targetArea = "Searcher";
                        else targetArea = "NullUser";
                    }

                    if (!string.IsNullOrEmpty(targetArea))
                    {
                        TempData["RedirectUrl"] = Url.Page("/Index", new { area = targetArea, v = DateTime.Now.Ticks });
                    }
                    else
                    {
                        TempData["RedirectUrl"] = Url.Page("/Index", new { v = DateTime.Now.Ticks });
                    }

                    return RedirectToPage();
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    ErrorMessage = "فشل التحديث: " + errorContent;
                }
            }
            catch (HttpRequestException)
            {
                ErrorMessage = "انقطع الاتصال بالسيرفر أو الإنترنت. يرجى التحقق من اتصالك والمحاولة لاحقا.";
            }
            catch (Exception ex)
            {
                ErrorMessage = "حدث خطأ أثناء الاتصال بالخادم: " + ex.Message;
            }

            return Page();
        }
    }
}