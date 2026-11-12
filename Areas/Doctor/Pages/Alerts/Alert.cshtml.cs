using Balancy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages.Alerts;

public class AlertModel : PageModel
{
    private readonly IPatientApiClient _patients;
    private readonly ILogger<AlertModel> _logger;

    public AlertModel(IPatientApiClient patients, ILogger<AlertModel> logger)
    {
        _patients = patients;
        _logger = logger;
    }

    public void OnGet() { }

    /* =================== GET: جلب التنبيهات النشطة =================== */
    public async Task<IActionResult> OnGetAlertsAsync(CancellationToken ct)
    {
        try
        {
            var doc = await _patients.GetAlertsRawAsync(ct);
            if (doc is null)
                return new JsonResult(new { alerts = Array.Empty<object>() });
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب التنبيهات");
            return new JsonResult(new { error = "تعذر الاتصال بخدمة التنبيهات", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب التنبيهات");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    /* =================== POST: إعادة توليد التنبيهات =================== */
    public async Task<IActionResult> OnPostRefreshAsync(CancellationToken ct)
    {
        try
        {
            var doc = await _patients.RefreshAlertsAsync(ct);
            if (doc is null)
                return new JsonResult(new { success = true });
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إعادة توليد التنبيهات");
            return new JsonResult(new { error = "تعذر إعادة توليد التنبيهات", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إعادة توليد التنبيهات");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    /* =================== PUT: تجاهل تنبيه واحد =================== */
    public async Task<IActionResult> OnPutDismissAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id) || !Guid.TryParse(id, out _))
            return new JsonResult(new { error = "معرّف التنبيه مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DismissAlertAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تجاهل التنبيه {Id}", id);
            return new JsonResult(new { error = "تعذر تجاهل التنبيه", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تجاهل التنبيه {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    /* =================== PUT: تجاهل كل التنبيهات =================== */
    public async Task<IActionResult> OnPutDismissAllAsync(CancellationToken ct)
    {
        try
        {
            await _patients.DismissAllAlertsAsync(ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تجاهل كل التنبيهات");
            return new JsonResult(new { error = "تعذر تجاهل التنبيهات", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تجاهل التنبيهات");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }
}