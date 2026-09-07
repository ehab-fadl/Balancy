using Balancy.DTOs;
using Balancy.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Balancy.Pages
{
    public class RegisterModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private const string HttpClientName = "BackendApi";

        public RegisterModel(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [BindProperty]
        public RegisterDto Input { get; set; } = new();

        [TempData]
        public string? ErrorMessage { get; set; }

        public IActionResult OnGet()
        {
            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (Input.Password != Input.ConfirmPassword)
            {
                ModelState.AddModelError("Input.ConfirmPassword", "كلمتا المرور غير متطابقتين.");
                return Page();
            }

            HttpResponseMessage response;

            try
            {
                var client = _httpClientFactory.CreateClient(HttpClientName);

                // إرسال الطلب للـ API
                response = await client.PostAsJsonAsync("api/auth/register", new
                {
                    firstName = Input.FirstName,
                    lastName = Input.LastName,
                    email = Input.Email,
                    password = Input.Password,
                    confirmPassword = Input.ConfirmPassword,
                    phoneNumber = Input.PhoneNumber
                });
            }
            catch (HttpRequestException)
            {
                return RedirectToPage("/OfflineError"); 
            }
            catch (TaskCanceledException)
            {
                return RedirectToPage("/OfflineError");
            }
            catch (Exception)
            {
                return RedirectToPage("/OfflineError");
            }

            if (response.IsSuccessStatusCode)
            {
                var jsonResponse = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                string token = jsonResponse.TryGetProperty("token", out var tokenProp) ? tokenProp.GetString() ?? string.Empty : string.Empty;

                if (!string.IsNullOrEmpty(token))
                {
                    var handler = new JwtSecurityTokenHandler();
                    var jwtToken = handler.ReadJwtToken(token);

                    var claims = new List<Claim>();
                    string userRole = "NullUser";
                    string extractedUserId = string.Empty;

                    foreach (var claim in jwtToken.Claims)
                    {
                        if (claim.Type == "sub" || claim.Type == ClaimTypes.NameIdentifier || claim.Type.EndsWith("nameidentifier") || claim.Type == "id" || claim.Type == "nameid")
                        {
                            extractedUserId = claim.Value;
                        }

                        if (claim.Type == "role" || claim.Type.EndsWith("/role"))
                        {
                            userRole = claim.Value;
                            if (!claims.Any(c => c.Type == ClaimTypes.Role))
                            {
                                claims.Add(new Claim(ClaimTypes.Role, claim.Value));
                            }
                        }
                        else
                        {
                            if (!claims.Any(c => c.Type == claim.Type))
                            {
                                claims.Add(claim);
                            }
                        }
                    }

                    if (!string.IsNullOrEmpty(extractedUserId))
                    {
                        if (!claims.Any(c => c.Type == ClaimTypes.NameIdentifier))
                            claims.Add(new Claim(ClaimTypes.NameIdentifier, extractedUserId));

                        if (!claims.Any(c => c.Type == "sub"))
                            claims.Add(new Claim("sub", extractedUserId));
                    }

                    if (!claims.Any(c => c.Type == ClaimTypes.Name))
                    {
                        claims.Add(new Claim(ClaimTypes.Name, $"{Input.FirstName} {Input.LastName}"));
                    }
                    if (!claims.Any(c => c.Type == ClaimTypes.Email))
                    {
                        claims.Add(new Claim(ClaimTypes.Email, Input.Email));
                    }

                    var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                    var principal = new ClaimsPrincipal(identity);

                    var authProperties = new AuthenticationProperties
                    {
                        IsPersistent = true
                    };

                    authProperties.StoreTokens(new[]
                    {
                        new AuthenticationToken { Name = "access_token", Value = token },
                        new AuthenticationToken { Name = "JWTToken", Value = token }
                    });

                    await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, authProperties);

                    string redirectUrl = userRole switch
                    {
                        "Admin" => Url.Page("/Index", new { area = "Admin" }) ?? "/Admin/Index",
                        "Doctor" => Url.Page("/Index", new { area = "Doctor" }) ?? "/Doctor/Index",
                        "Searcher" => Url.Page("/Index", new { area = "Searcher" }) ?? "/Searcher/Index",
                        _ => Url.Page("/Index", new { area = "NullUser" }) ?? "/NullUser/Index"
                    };

                    TempData["SuccessMessage"] = "نجحت عملية التسجيل وتم تسجيل دخولك بنجاح!";

                    return Redirect(redirectUrl);
                }
            }

            var errorContent = await response.Content.ReadAsStringAsync();

            try
            {
                using var errorObj = System.Text.Json.JsonDocument.Parse(errorContent);

                if (errorObj.RootElement.TryGetProperty("errors", out var errorsProp))
                {
                    foreach (var error in errorsProp.EnumerateObject())
                    {
                        string fieldName = error.Name;
                        var messages = error.Value.EnumerateArray();

                        if (messages.MoveNext())
                        {
                            string arabicMessage = messages.Current.GetString() ?? "هذا الحقل غير صالح.";
                            ModelState.AddModelError($"Input.{fieldName}", arabicMessage);
                        }
                    }
                }
                else if (errorObj.RootElement.TryGetProperty("message", out var msgProp))
                {
                    ErrorMessage = msgProp.GetString();
                }
                else
                {
                    ErrorMessage = "فشلت عملية التسجيل، يرجى التأكد من المدخلات.";
                }
            }
            catch
            {
                ErrorMessage = "فشلت عملية التسجيل، يرجى التحقق من المدخلات وإعادة المحاولة.";
            }

            return Page();
        }
    }
}