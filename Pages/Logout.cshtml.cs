using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Pages;

public class LogoutModel : PageModel
{
    private readonly IHttpClientFactory _httpClientFactory;

    public LogoutModel(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        try
        {
            var client = _httpClientFactory.CreateClient("BackendApi");

            await client.PostAsync("/api/auth/logout", null);
        }
        catch
        {
            // حتى لو فشل الاتصال بالـ Backend،
            // ننهي جلسة المستخدم محلياً.
        }

        await HttpContext.SignOutAsync();

        return RedirectToPage("/Login");
    }
}