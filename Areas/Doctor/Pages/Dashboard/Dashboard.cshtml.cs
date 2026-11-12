using Balancy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages.Dashboard;

public class DashboardModel : PageModel
{
    private readonly IPatientApiClient _patients;
    private readonly ILogger<DashboardModel> _logger;

    public DashboardModel(IPatientApiClient patients, ILogger<DashboardModel> logger)
    {
        _patients = patients;
        _logger = logger;
    }

    public void OnGet() { }

    /* =================== GET: بيانات لوحة التحكم =================== */
    public async Task<IActionResult> OnGetDashboardAsync(CancellationToken ct)
    {
        try
        {
            var doc = await _patients.GetDashboardRawAsync(ct);
            if (doc is null)
                return new JsonResult(new { });
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب بيانات لوحة التحكم");
            return new JsonResult(new { error = "تعذر الاتصال بخدمة لوحة التحكم", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب بيانات لوحة التحكم");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    /* =================== GET: كل المواعيد (للفلترة في الفرونت) =================== */
    public async Task<IActionResult> OnGetTodayAppointmentsAsync(CancellationToken ct)
    {
        try
        {
            var doc = await _patients.GetAppointmentsRawAsync(ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب المواعيد");
            return new JsonResult(new { error = "تعذر جلب المواعيد", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }
}