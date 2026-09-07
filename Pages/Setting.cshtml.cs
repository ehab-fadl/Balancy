using Balancy.Models;
using Balancy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Caching.Memory;

namespace Balancy.Pages
{
    public class SettingModel : PageModel
    {
        private const string HttpClientName = "BackendApi";
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IEmailService _emailService;
        private readonly IMemoryCache _memoryCache;
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, object> _locks = new();

        public SettingModel(
            IHttpClientFactory httpClientFactory,
            IEmailService emailService,
            IMemoryCache memoryCache)
        {
            _httpClientFactory = httpClientFactory;
            _emailService = emailService;
            _memoryCache = memoryCache;
        }

        public bool IsAuthenticated => User.Identity?.IsAuthenticated ?? false;

        [BindProperty]
        public ChangePasswordInputModel Input { get; set; } = new();

        [BindProperty]
        public ForgotPasswordInputModel ForgotInput { get; set; } = new();

        [BindProperty]
        public ResetPasswordInputModel ResetInput { get; set; } = new();

        [TempData]
        public string? StatusMessage { get; set; }

        public IActionResult OnGet()
        {
            return Page();
        }

        public async Task<IActionResult> OnPostChangePasswordAsync()
        {
            if (!IsAuthenticated)
            {
                TempData["ErrorMessage"] = "يجب تسجيل الدخول أولاً لتغيير كلمة المرور.";
                return RedirectToPage("/Login");
            }

            ModelState.Clear();
            TryValidateModel(Input, nameof(Input));

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var client = _httpClientFactory.CreateClient(HttpClientName);
            var response = await client.PostAsJsonAsync("api/auth/change-password", new
            {
                oldPassword = Input.OldPassword,
                newPassword = Input.NewPassword,
                confirmNewPassword = Input.ConfirmNewPassword
            });

            if (response.IsSuccessStatusCode)
            {
                TempData["SuccessMessage"] = "تم تغيير كلمة المرور بنجاح.";
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

                string redirectUrl = userRole switch
                {
                    "Admin" => Url.Page("/Index", new { area = "Admin" }),
                    "Doctor" => Url.Page("/Index", new { area = "Doctor" }),
                    "Searcher" => Url.Page("/Index", new { area = "Searcher" }),
                    "NullUser" => Url.Page("/Index", new { area = "NullUser" }),
                    _ => Url.Page("/Index")
                };

                TempData["RedirectUrl"] = redirectUrl;
                return Page();
            }

            TempData["ErrorMessage"] = "فشل تغيير كلمة المرور. تأكد من صحة كلمة المرور القديمة والشروط.";
            return Page();
        }

        public async Task<IActionResult> OnPostForgotPasswordAsync([FromForm] string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest(new { success = false, message = "البريد الإلكتروني مطلوب" });
            }

            email = email.Trim().ToLower();
            var spamProtectionKey = "Lock_" + email;
            var emailLock = _locks.GetOrAdd(email, _ => new object());

            lock (emailLock)
            {
                if (_memoryCache.TryGetValue(spamProtectionKey, out _))
                {
                    return BadRequest(new { success = false, message = "لقد قمنا بإرسال رمز مسبقاً. يرجى الانتظار قليلًا." });
                }
                _memoryCache.Set(spamProtectionKey, true, TimeSpan.FromSeconds(30));
            }

            var client = _httpClientFactory.CreateClient(HttpClientName);
            var response = await client.PostAsJsonAsync("api/auth/forgot-password", new { email = email });

            if (!response.IsSuccessStatusCode)
            {
                _memoryCache.Remove(spamProtectionKey);
                return BadRequest(new { success = false, message = "عذراً، هذا البريد الإلكتروني غير مسجل في النظام." });
            }

            var jsonResponse = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            string serverResetToken = string.Empty;

            if (jsonResponse.TryGetProperty("resetToken", out var tokenProp) && tokenProp.ValueKind != System.Text.Json.JsonValueKind.Null)
            {
                serverResetToken = tokenProp.GetString() ?? string.Empty;
            }
            else if (jsonResponse.TryGetProperty("ResetToken", out var tokenPropAlt) && tokenPropAlt.ValueKind != System.Text.Json.JsonValueKind.Null)
            {
                serverResetToken = tokenPropAlt.GetString() ?? string.Empty;
            }

            var random = new Random();
            string shortNumericCode = random.Next(100000, 999999).ToString();
            var cacheKey = "OTP_" + shortNumericCode;

            _memoryCache.Set(cacheKey, new { Email = email, RealToken = serverResetToken }, TimeSpan.FromMinutes(10));

            try
            {
                await _emailService.SendVerificationCodeEmailAsync(email, shortNumericCode);
            }
            catch (Exception)
            {
                _memoryCache.Remove(spamProtectionKey);
                _memoryCache.Remove(cacheKey);
                return BadRequest(new { success = false, message = "فشل إرسال البريد الإلكتروني، يرجى المحاولة لاحقاً." });
            }

            return new JsonResult(new
            {
                success = true,
                message = "تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح."
            });
        }

        public async Task<IActionResult> OnPostResetPasswordAsync()
        {
            if (ResetInput == null ||
                string.IsNullOrEmpty(ResetInput.Token) ||
                string.IsNullOrEmpty(ResetInput.NewPassword) ||
                string.IsNullOrEmpty(ResetInput.ConfirmNewPassword))
            {
                TempData["ErrorMessage"] = "جميع الحقول مطلوبة، يرجى ملء كافة البيانات.";
                return Page();
            }

            if (ResetInput.NewPassword != ResetInput.ConfirmNewPassword)
            {
                TempData["ErrorMessage"] = "كلمة المرور الجديدة وتأكيدها غير متطابقين.";
                return Page();
            }

            var enteredCode = ResetInput.Token.Trim();
            var cacheKey = $"OTP_{enteredCode}";

            if (!_memoryCache.TryGetValue(cacheKey, out dynamic? cachedData) || cachedData == null)
            {
                TempData["ErrorMessage"] = "انتهت صلاحية رمز التحقق أو أن الرمز غير صحيح، يرجى طلب رمز جديد.";
                return Page();
            }

            string targetEmail = cachedData.Email;
            string realServerToken = cachedData.RealToken;

            var client = _httpClientFactory.CreateClient(HttpClientName);
            var response = await client.PostAsJsonAsync("api/auth/reset-password", new
            {
                email = targetEmail,
                token = realServerToken,
                newPassword = ResetInput.NewPassword,
                confirmNewPassword = ResetInput.ConfirmNewPassword
            });

            if (response.IsSuccessStatusCode)
            {
                _memoryCache.Remove(cacheKey);
                TempData["SuccessMessage"] = "تم إعادة تعيين كلمة المرور بنجاح.";
                return RedirectToPage("/Index");
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            TempData["ErrorMessage"] = $"فشل تحديث كلمة المرور: {errorContent}";
            return Page();
        }
    }
}