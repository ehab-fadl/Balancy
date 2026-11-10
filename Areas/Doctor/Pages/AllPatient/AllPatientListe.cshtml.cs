using Balancy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages.AllPatient;

public class AllPatientListeModel : PageModel
{
    private readonly IPatientApiClient _patients;
    private readonly ILogger<AllPatientListeModel> _logger;

    public AllPatientListeModel(IPatientApiClient patients, ILogger<AllPatientListeModel> logger)
    {
        _patients = patients;
        _logger = logger;
    }

    public void OnGet() { }

    /* =================== GET: كل المرضى (Clinic) =================== */
    public async Task<IActionResult> OnGetPatientsAsync(CancellationToken ct)
    {
        try
        {
            var doc = await _patients.GetClinicPatientsRawAsync(ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب قائمة المرضى من خدمة العيادة");
            return new JsonResult(new { error = "تعذر الاتصال بخدمة المرضى", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب قائمة المرضى");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    /* =================== GET: مريض واحد =================== */
    public async Task<IActionResult> OnGetPatientAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetPatientRawByIdAsync(id, ct);
            if (doc is null)
                return new JsonResult(new { error = "المريض غير موجود" })
                { StatusCode = StatusCodes.Status404NotFound };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب المريض {Id}", id);
            return new JsonResult(new { error = "تعذر جلب بيانات المريض", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب المريض {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    /* =================== POST: حذف مريض =================== */
    public async Task<IActionResult> OnPostDeletePatientAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id) || !Guid.TryParse(id, out _))
            return new JsonResult(new { error = "معرّف المريض مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeletePatientAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف المريض {Id}", id);
            return new JsonResult(new { error = "تعذر حذف المريض", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف المريض {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }
}