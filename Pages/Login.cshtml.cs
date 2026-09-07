using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using System.Text;

namespace Balancy.Pages
{
    public class LoginModel : PageModel
    {
        private readonly HttpClient _httpClient;

        public LoginModel(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        [BindProperty]
        public InputModel Input { get; set; }

        public class InputModel
        {
            public string Email { get; set; }
            public string Password { get; set; }
            public bool RememberMe { get; set; }
        }

        public IActionResult OnGet()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                // إذا كان الحساب معطلاً، تجنب إعادة توجيهه للوحة التحكم واتركه في صفحة التعطيل
                if (User.FindFirst("IsDeactivated")?.Value == "true")
                {
                    return RedirectToPage("/AccountDeactivated");
                }

                var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
                return RedirectToArea(role);
            }
            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid) return Page();

            var loginData = new { email = Input.Email, password = Input.Password };
            var content = new StringContent(JsonSerializer.Serialize(loginData), Encoding.UTF8, "application/json");

            HttpResponseMessage response;

            try
            {
                response = await _httpClient.PostAsync("http://192.168.0.16:5000/api/auth/login", content);
            }
            catch (HttpRequestException)
            {
                ModelState.AddModelError(string.Empty, "عذراً، تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت ومحاولة اللاحقة.");
                return Page();
            }
            catch (TaskCanceledException)
            {
                ModelState.AddModelError(string.Empty, "استغرق الاتصال بالخادم وقتاً طويلاً، يرجى المحاولة مرة أخرى.");
                return Page();
            }

            var responseString = await response.Content.ReadAsStringAsync();

            TokenResponse result = null;
            try
            {
                result = JsonSerializer.Deserialize<TokenResponse>(responseString, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch { }

            if (result != null)
            {
                // الاعتماد الأساسي على وجود الـ Token لتسجيل الدخول بغض النظر عن قيمة IsSuccess
                if (!string.IsNullOrEmpty(result.Token))
                {
                    return await SignInAndRedirectAsync(result);
                }

                // إذا أرسل السيرفر رسالة خطأ واضحة (مثل خطأ كلمة المرور أو أن الحساب معطل)
                if (!string.IsNullOrEmpty(result.Message))
                {
                    ModelState.AddModelError(string.Empty, result.Message);
                    return Page();
                }

                // إذا كانت الأخطاء قادمة على هيئة قائمة Errors
                if (result.Errors != null && result.Errors.Any())
                {
                    foreach (var error in result.Errors)
                    {
                        ModelState.AddModelError(string.Empty, error);
                    }
                    return Page();
                }
            }

            // احتياطي في حال لم يُرجع السيرفر رسالة مفصلة
            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                ModelState.AddModelError(string.Empty, "هذا الحساب معطل ولا يمكن الإستفادة من خدمات النظام.");
            }
            else
            {
                ModelState.AddModelError(string.Empty, "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
            }

            return Page();
        }

        // دالة مساعدة لتسجيل الدخول وإنشاء الكوكيز والتوجيه
        private async Task<IActionResult> SignInAndRedirectAsync(TokenResponse result)
        {
            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(result.Token);

            var role = jwtToken.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == ClaimTypes.Role)?.Value;
            var email = jwtToken.Claims.FirstOrDefault(c => c.Type == "email" || c.Type == ClaimTypes.Email)?.Value;
            var firstName = jwtToken.Claims.FirstOrDefault(c => c.Type == "FirstName")?.Value ?? "مستخدم";
            var lastName = jwtToken.Claims.FirstOrDefault(c => c.Type == "LastName")?.Value ?? "";

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Email, email ?? Input.Email),
                new Claim(ClaimTypes.Role, role ?? "NullUser"),
                new Claim("FirstName", firstName),
                new Claim("LastName", lastName),
                new Claim(ClaimTypes.Name, $"{firstName} {lastName}".Trim()),
                new Claim("AccessToken", result.Token),
                new Claim("IsDeactivated", result.IsDeactivated.ToString().ToLower())
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

            var authProperties = new AuthenticationProperties
            {
                IsPersistent = Input.RememberMe,
                ExpiresUtc = Input.RememberMe ? DateTimeOffset.UtcNow.AddDays(30) : null
            };

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(claimsIdentity),
                authProperties);

            // إذا كان الحساب معطلاً، توجه فوراً لصفحة الحساب المعطل
            if (result.IsDeactivated)
            {
                return RedirectToPage("/AccountDeactivated");
            }

            return RedirectToArea(role);
        }

        private IActionResult RedirectToArea(string role)
        {
            return role switch
            {
                "Admin" => RedirectToPage("/Index", new { area = "Admin" }),
                "Searcher" => RedirectToPage("/Index", new { area = "Searcher" }),
                "Doctor" => RedirectToPage("/Index", new { area = "Doctor" }),
                "NullUser" => RedirectToPage("/Index", new { area = "NullUser" }),
                _ => RedirectToPage("/AccessDenied")
            };
        }

        public class TokenResponse
        {
            public bool IsSuccess { get; set; }
            public string Message { get; set; }
            public string Token { get; set; }
            public bool IsDeactivated { get; set; }
            public IEnumerable<string> Errors { get; set; }
        }
    }
}