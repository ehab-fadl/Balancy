using Balancy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages.Appointments;

public class AppointmentsModel : PageModel
{
    private readonly IPatientApiClient _patients;
    private readonly ILogger<AppointmentsModel> _logger;

    public AppointmentsModel(IPatientApiClient patients, ILogger<AppointmentsModel> logger)
    {
        _patients = patients;
        _logger = logger;
    }

    public void OnGet() { }

    /* =================== GET: جلب كل المواعيد =================== */
    public async Task<IActionResult> OnGetAppointmentsAsync(CancellationToken ct)
    {
        try
        {
            var doc = await _patients.GetAppointmentsRawAsync(ct);
            if (doc is null) return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "تعذر جلب المواعيد");
            return new JsonResult(new { error = "تعذر جلب المواعيد", detail = ex.Message }) { StatusCode = 502 };
        }
    }

    /* =================== POST: إضافة موعد جديد =================== */
    public async Task<IActionResult> OnPostCreateAsync([FromBody] AppointmentCreateRequest request, CancellationToken ct)
    {
        if (request == null || request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = 400 };

        try
        {
            var doc = await _patients.CreateAppointmentAsync(request, ct);
            return doc is null
                ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = 502 }
                : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء الموعد");
            return new JsonResult(new { error = "تعذر إنشاء الموعد", detail = ex.Message }) { StatusCode = 502 };
        }
    }

    /* =================== PUT: تأكيد الموعد =================== */
    public async Task<IActionResult> OnPutConfirmAsync(string id, CancellationToken ct)
    {
        try
        {
            await _patients.ConfirmAppointmentAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "تعذر تأكيد الموعد {Id}", id);
            return new JsonResult(new { error = "تعذر التأكيد", detail = ex.Message }) { StatusCode = 502 };
        }
    }

    /* =================== DELETE: حذف الموعد =================== */
    public async Task<IActionResult> OnPostDeleteAsync(string id, CancellationToken ct)
    {
        try
        {
            await _patients.DeleteAppointmentAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "تعذر حذف الموعد {Id}", id);
            return new JsonResult(new { error = "تعذر الحذف", detail = ex.Message }) { StatusCode = 502 };
        }
    }
}