using Balancy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages.ClinicStatistics;

public class ClinicStatisticsModel : PageModel
{
    private readonly IPatientApiClient _patients;
    private readonly ILogger<ClinicStatisticsModel> _logger;

    public ClinicStatisticsModel(IPatientApiClient patients, ILogger<ClinicStatisticsModel> logger)
    {
        _patients = patients;
        _logger = logger;
    }

    public void OnGet() { }

    /* =================== GET: إحصائيات العيادة =================== */
    public async Task<IActionResult> OnGetStatisticsAsync(CancellationToken ct)
    {
        try
        {
            var doc = await _patients.GetClinicStatisticsRawAsync(ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب إحصائيات العيادة");
            return new JsonResult(new { error = "تعذر الاتصال بخدمة الإحصائيات", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب إحصائيات العيادة");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }
}