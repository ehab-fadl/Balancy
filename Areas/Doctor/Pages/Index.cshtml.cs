using Balancy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages;

public class IndexModel : PageModel
{
    private readonly IPatientApiClient _patients;
    private readonly ILogger<IndexModel> _logger;

    public IndexModel(IPatientApiClient patients, ILogger<IndexModel> logger)
    {
        _patients = patients;
        _logger = logger;
    }

    public void OnGet() { }

    /* =================== Patients =================== */

    public async Task<IActionResult> OnGetPatientsAsync(CancellationToken ct)
    {
        try
        {
            var doc = await _patients.GetAllPatientsRawAsync(ct);
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر الاتصال بخدمة المرضى");
            return new JsonResult(new { error = "تعذر الاتصال بخدمة المرضى", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب المرضى");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

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

    public async Task<IActionResult> OnPostCreatePatientAsync(
        [FromBody] PatientCreateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreatePatientAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة من الخدمة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء المريض");
            return new JsonResult(new { error = "تعذر إنشاء المريض", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء المريض");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdatePatientAsync(
        [FromBody] PatientUpdateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Id))
            return new JsonResult(new { error = "بيانات غير صالحة (Id مفقود)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.UpdatePatientAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة من الخدمة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تحديث المريض {Id}", request.Id);
            return new JsonResult(new { error = "تعذر تحديث المريض", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تحديث المريض {Id}", request.Id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    /* =================== Depression Story =================== */

    // GET: جلب قصة الاكتئاب لمريض
    public async Task<IActionResult> OnGetDepressionStoryAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetDepressionStoryRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(new { error = "لا توجد قصة اكتئاب لهذا المريض" })
                { StatusCode = StatusCodes.Status404NotFound };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب قصة الاكتئاب للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب قصة الاكتئاب", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب قصة الاكتئاب للمريض {PatientId}", patientId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    // PUT: تحديث قصة الاكتئاب
    public async Task<IActionResult> OnPutUpdateDepressionStoryAsync(
        [FromBody] DepressionStoryUpdateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.PatientId))
            return new JsonResult(new { error = "بيانات غير صالحة (PatientId مفقود)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.UpdateDepressionStoryAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة من الخدمة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تحديث قصة الاكتئاب للمريض {PatientId}", request.PatientId);
            return new JsonResult(new { error = "تعذر تحديث قصة الاكتئاب", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تحديث قصة الاكتئاب للمريض {PatientId}", request.PatientId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }
}