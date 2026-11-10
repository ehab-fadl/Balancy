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

    /* =================== Chronic Diseases =================== */

    public async Task<IActionResult> OnGetChronicDiseasesAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetChronicDiseasesRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب الأمراض المزمنة للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب الأمراض المزمنة", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب الأمراض المزمنة");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    // ✅ POST — يستخدم ChronicDiseaseCreateRequest (يطابق ChronicDiseaseCreateDto)
    public async Task<IActionResult> OnPostCreateChronicDiseaseAsync(
        [FromBody] ChronicDiseaseCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
            return new JsonResult(new { error = "بيانات غير صالحة — اسم المرض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateChronicDiseaseAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إضافة المرض المزمن");
            return new JsonResult(new { error = "تعذر إضافة المرض المزمن", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إضافة المرض المزمن");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    // ✅ PUT — يستخدم ChronicDiseaseUpdateRequest (يطابق ChronicDiseaseUpdateDto)
    // الباك إند بيتوقع Id في الـ body (Guid)، فنستخدمه لو الـ URL فاضي أو كـ fallback
    public async Task<IActionResult> OnPutUpdateChronicDiseaseAsync(
        string id, [FromBody] ChronicDiseaseUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        // ✅ جرّب id من الـ URL، وإلا من الـ body
        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف المرض (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var diseaseId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateChronicDiseaseAsync(diseaseId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل المرض المزمن {Id}", diseaseId);
            return new JsonResult(new { error = "تعذر تعديل المرض المزمن", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل المرض المزمن {Id}", diseaseId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteChronicDiseaseAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف المرض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteChronicDiseaseAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف المرض المزمن {Id}", id);
            return new JsonResult(new { error = "تعذر حذف المرض المزمن", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف المرض المزمن {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    /* =================== Chronic Psych Diseases =================== */

    public async Task<IActionResult> OnGetChronicPsychDiseasesAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetChronicPsychDiseasesRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب الأمراض النفسية المزمنة للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب الأمراض النفسية المزمنة", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب الأمراض النفسية");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateChronicPsychDiseaseAsync(
        [FromBody] ChronicPsychDiseaseCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
            return new JsonResult(new { error = "بيانات غير صالحة — اسم المرض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateChronicPsychDiseaseAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إضافة المرض النفسي");
            return new JsonResult(new { error = "تعذر إضافة المرض النفسي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إضافة المرض النفسي");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateChronicPsychDiseaseAsync(
        string id, [FromBody] ChronicPsychDiseaseUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف المرض (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var diseaseId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateChronicPsychDiseaseAsync(diseaseId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل المرض النفسي {Id}", diseaseId);
            return new JsonResult(new { error = "تعذر تعديل المرض النفسي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل المرض النفسي {Id}", diseaseId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteChronicPsychDiseaseAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف المرض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteChronicPsychDiseaseAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف المرض النفسي {Id}", id);
            return new JsonResult(new { error = "تعذر حذف المرض النفسي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف المرض النفسي {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }




    /* =================== Family History =================== */

    public async Task<IActionResult> OnGetFamilyHistoryAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetFamilyHistoryRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب التاريخ العائلي للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب التاريخ العائلي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب التاريخ العائلي");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateFamilyHistoryAsync(
        [FromBody] FamilyHistoryCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Relation))
            return new JsonResult(new { error = "بيانات غير صالحة — صلة القرابة مطلوبة" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateFamilyHistoryAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إضافة سجل عائلي");
            return new JsonResult(new { error = "تعذر إضافة سجل عائلي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إضافة سجل عائلي");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateFamilyHistoryAsync(
        string id, [FromBody] FamilyHistoryUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف السجل (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var recordId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateFamilyHistoryAsync(recordId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل السجل العائلي {Id}", recordId);
            return new JsonResult(new { error = "تعذر تعديل السجل العائلي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل السجل العائلي {Id}", recordId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteFamilyHistoryAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف السجل مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteFamilyHistoryAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف السجل العائلي {Id}", id);
            return new JsonResult(new { error = "تعذر حذف السجل العائلي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف السجل العائلي {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }




    /* =================== Vital Signs =================== */

    public async Task<IActionResult> OnGetVitalSignsAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetVitalSignsRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب المؤشرات الحيوية للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب المؤشرات الحيوية", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب المؤشرات الحيوية");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateVitalSignAsync(
        [FromBody] VitalSignCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.VitalType))
            return new JsonResult(new { error = "بيانات غير صالحة — نوع القياس مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateVitalSignAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إضافة القراءة الحيوية");
            return new JsonResult(new { error = "تعذر إضافة القراءة الحيوية", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إضافة القراءة الحيوية");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateVitalSignAsync(
        string id, [FromBody] VitalSignUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف القراءة (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var vitalId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateVitalSignAsync(vitalId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل القراءة الحيوية {Id}", vitalId);
            return new JsonResult(new { error = "تعذر تعديل القراءة الحيوية", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل القراءة الحيوية {Id}", vitalId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteVitalSignAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف القراءة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteVitalSignAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف القراءة الحيوية {Id}", id);
            return new JsonResult(new { error = "تعذر حذف القراءة الحيوية", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف القراءة الحيوية {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== GAD-7 Assessments =================== */

    public async Task<IActionResult> OnGetLatestGad7Async(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetLatestGad7AssessmentRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(new { error = "لا توجد تقييمات GAD-7 لهذا المريض" })
                { StatusCode = StatusCodes.Status404NotFound };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب آخر تقييم GAD-7 للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب تقييم GAD-7", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب تقييم GAD-7");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateGad7Async(
        [FromBody] Gad7AssessmentCreateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateGad7AssessmentAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء تقييم GAD-7");
            return new JsonResult(new { error = "تعذر حفظ تقييم GAD-7", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء تقييم GAD-7");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }


    /* =================== PHQ-9 Assessments =================== */

    public async Task<IActionResult> OnGetLatestPhq9Async(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetLatestPhq9AssessmentRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(new { error = "لا توجد تقييمات PHQ-9 لهذا المريض" })
                { StatusCode = StatusCodes.Status404NotFound };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب آخر تقييم PHQ-9 للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب تقييم PHQ-9", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب تقييم PHQ-9");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreatePhq9Async(
        [FromBody] Phq9AssessmentCreateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreatePhq9AssessmentAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء تقييم PHQ-9");
            return new JsonResult(new { error = "تعذر حفظ تقييم PHQ-9", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء تقييم PHQ-9");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }


    /* =================== MDQ Assessments =================== */

    public async Task<IActionResult> OnGetLatestMdqAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetLatestMdqAssessmentRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(new { error = "لا توجد تقييمات MDQ لهذا المريض" })
                { StatusCode = StatusCodes.Status404NotFound };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب آخر تقييم MDQ للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب تقييم MDQ", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب تقييم MDQ");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateMdqAsync(
        [FromBody] MdqAssessmentCreateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateMdqAssessmentAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء تقييم MDQ");
            return new JsonResult(new { error = "تعذر حفظ تقييم MDQ", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء تقييم MDQ");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== SDS Assessments =================== */

    public async Task<IActionResult> OnGetLatestSdsAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetLatestSdsAssessmentRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(new { error = "لا توجد تقييمات SDS لهذا المريض" })
                { StatusCode = StatusCodes.Status404NotFound };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب آخر تقييم SDS للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب تقييم SDS", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب تقييم SDS");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateSdsAsync(
        [FromBody] SdsAssessmentCreateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateSdsAssessmentAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء تقييم SDS");
            return new JsonResult(new { error = "تعذر حفظ تقييم SDS", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء تقييم SDS");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }




    /* =================== C-SSRS Assessments =================== */

    public async Task<IActionResult> OnGetLatestCssrsAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetLatestCssrsAssessmentRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(new { error = "لا توجد تقييمات C-SSRS لهذا المريض" })
                { StatusCode = StatusCodes.Status404NotFound };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب آخر تقييم C-SSRS للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب تقييم C-SSRS", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب تقييم C-SSRS");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateCssrsAsync(
        [FromBody] CssrsAssessmentCreateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateCssrsAssessmentAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء تقييم C-SSRS");
            return new JsonResult(new { error = "تعذر حفظ تقييم C-SSRS", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء تقييم C-SSRS");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }


    /* =================== Diagnoses =================== */

    public async Task<IActionResult> OnGetDiagnosesAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetDiagnosesRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب التشخيصات للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب التشخيصات", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب التشخيصات");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateDiagnosisAsync(
        [FromBody] DiagnosisCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.MainType))
            return new JsonResult(new { error = "بيانات غير صالحة — النوع الرئيسي مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateDiagnosisAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء التشخيص");
            return new JsonResult(new { error = "تعذر إنشاء التشخيص", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء التشخيص");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateDiagnosisAsync(
        string id, [FromBody] DiagnosisUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف التشخيص (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var diagnosisId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateDiagnosisAsync(diagnosisId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل التشخيص {Id}", diagnosisId);
            return new JsonResult(new { error = "تعذر تعديل التشخيص", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل التشخيص {Id}", diagnosisId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteDiagnosisAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف التشخيص مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteDiagnosisAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف التشخيص {Id}", id);
            return new JsonResult(new { error = "تعذر حذف التشخيص", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف التشخيص {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== Medications =================== */

    public async Task<IActionResult> OnGetMedicationsAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetMedicationsRawAsync(patientId, ct);
            if (doc is null)
                return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب الأدوية للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب الأدوية", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب الأدوية");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateMedicationAsync(
        [FromBody] MedicationCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
            return new JsonResult(new { error = "بيانات غير صالحة — اسم الدواء مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateMedicationAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء الدواء");
            return new JsonResult(new { error = "تعذر إنشاء الدواء", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء الدواء");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateMedicationAsync(
        string id, [FromBody] MedicationUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف الدواء (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var medicationId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateMedicationAsync(medicationId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل الدواء {Id}", medicationId);
            return new JsonResult(new { error = "تعذر تعديل الدواء", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل الدواء {Id}", medicationId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteMedicationAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف الدواء مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteMedicationAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف الدواء {Id}", id);
            return new JsonResult(new { error = "تعذر حذف الدواء", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف الدواء {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }


        /* =================== Treatment Plans =================== */

    public async Task<IActionResult> OnGetTreatmentPlansAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetTreatmentPlansRawAsync(patientId, ct);
            if (doc is null) return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب الخطط العلاجية");
            return new JsonResult(new { error = "تعذر جلب الخطط العلاجية", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateTreatmentPlanAsync([FromBody] TreatmentPlanCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name) || request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.CreateTreatmentPlanAsync(request, ct);
            return doc is null
                ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway }
                : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء الخطة");
            return new JsonResult(new { error = "تعذر إنشاء الخطة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnPutUpdateTreatmentPlanAsync(string id, [FromBody] TreatmentPlanUpdateRequest request, CancellationToken ct)
    {
        if (request is null) return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var p)) request.Id = p;
        if (request.Id == Guid.Empty) return new JsonResult(new { error = "Id مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.UpdateTreatmentPlanAsync(request.Id.ToString(), request, ct);
            return doc is null
                ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway }
                : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل الخطة");
            return new JsonResult(new { error = "تعذر تعديل الخطة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnDeleteTreatmentPlanAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id)) return new JsonResult(new { error = "Id مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            await _patients.DeleteTreatmentPlanAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف الخطة");
            return new JsonResult(new { error = "تعذر حذف الخطة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    // Problems
    public async Task<IActionResult> OnPostCreateTreatmentProblemAsync([FromBody] TreatmentProblemCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Text) || request.TreatmentPlanId == Guid.Empty)
            return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.CreateTreatmentProblemAsync(request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إضافة المشكلة");
            return new JsonResult(new { error = "تعذر إضافة المشكلة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnPutUpdateTreatmentProblemAsync(string id, [FromBody] TreatmentProblemUpdateRequest request, CancellationToken ct)
    {
        if (request is null) return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var p)) request.Id = p;
        if (request.Id == Guid.Empty) return new JsonResult(new { error = "Id مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.UpdateTreatmentProblemAsync(request.Id.ToString(), request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل المشكلة");
            return new JsonResult(new { error = "تعذر تعديل المشكلة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnDeleteTreatmentProblemAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id)) return new JsonResult(new { error = "Id مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try { await _patients.DeleteTreatmentProblemAsync(id, ct); return new JsonResult(new { success = true }); }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف المشكلة");
            return new JsonResult(new { error = "تعذر حذف المشكلة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    // Goals
    public async Task<IActionResult> OnPostCreateTreatmentGoalAsync([FromBody] TreatmentGoalCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Text) || request.TreatmentProblemId == Guid.Empty)
            return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.CreateTreatmentGoalAsync(request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إضافة الهدف");
            return new JsonResult(new { error = "تعذر إضافة الهدف", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnPutUpdateTreatmentGoalAsync(string id, [FromBody] TreatmentGoalUpdateRequest request, CancellationToken ct)
    {
        if (request is null) return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var p)) request.Id = p;
        if (request.Id == Guid.Empty) return new JsonResult(new { error = "Id مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.UpdateTreatmentGoalAsync(request.Id.ToString(), request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل الهدف");
            return new JsonResult(new { error = "تعذر تعديل الهدف", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnPutProgressTreatmentGoalAsync(string id, [FromBody] TreatmentGoalProgressRequest request, CancellationToken ct)
    {
        if (request is null) return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        if (request.GoalId == Guid.Empty && Guid.TryParse(id, out var p)) request.GoalId = p;
        if (request.GoalId == Guid.Empty) return new JsonResult(new { error = "GoalId مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.UpdateTreatmentGoalProgressAsync(request.GoalId.ToString(), request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تحديث التقدم");
            return new JsonResult(new { error = "تعذر تحديث التقدم", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnPutAchieveTreatmentGoalAsync(string id, [FromBody] TreatmentGoalAchieveRequest request, CancellationToken ct)
    {
        if (request is null) return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        if (request.GoalId == Guid.Empty && Guid.TryParse(id, out var p)) request.GoalId = p;
        if (request.GoalId == Guid.Empty) return new JsonResult(new { error = "GoalId مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.AchieveTreatmentGoalAsync(request.GoalId.ToString(), request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تحقق الهدف");
            return new JsonResult(new { error = "تعذر تحقق الهدف", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnPutUnachieveTreatmentGoalAsync(string id, [FromBody] TreatmentGoalUnachieveRequest request, CancellationToken ct)
    {
        if (request is null) return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        if (request.GoalId == Guid.Empty && Guid.TryParse(id, out var p)) request.GoalId = p;
        if (request.GoalId == Guid.Empty) return new JsonResult(new { error = "GoalId مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.UnachieveTreatmentGoalAsync(request.GoalId.ToString(), request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إلغاء التحقق");
            return new JsonResult(new { error = "تعذر إلغاء التحقق", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnDeleteTreatmentGoalAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id)) return new JsonResult(new { error = "Id مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try { await _patients.DeleteTreatmentGoalAsync(id, ct); return new JsonResult(new { success = true }); }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف الهدف");
            return new JsonResult(new { error = "تعذر حذف الهدف", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    // Means
    public async Task<IActionResult> OnPostCreateTreatmentMeanAsync([FromBody] TreatmentMeanCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Text) || request.TreatmentGoalId == Guid.Empty)
            return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.CreateTreatmentMeanAsync(request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إضافة الوسيلة");
            return new JsonResult(new { error = "تعذر إضافة الوسيلة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnPutUpdateTreatmentMeanAsync(string id, [FromBody] TreatmentMeanUpdateRequest request, CancellationToken ct)
    {
        if (request is null) return new JsonResult(new { error = "بيانات غير صالحة" }) { StatusCode = StatusCodes.Status400BadRequest };
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var p)) request.Id = p;
        if (request.Id == Guid.Empty) return new JsonResult(new { error = "Id مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try
        {
            var doc = await _patients.UpdateTreatmentMeanAsync(request.Id.ToString(), request, ct);
            return doc is null ? new JsonResult(new { error = "لا استجابة" }) { StatusCode = StatusCodes.Status502BadGateway } : new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل الوسيلة");
            return new JsonResult(new { error = "تعذر تعديل الوسيلة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }

    public async Task<IActionResult> OnDeleteTreatmentMeanAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id)) return new JsonResult(new { error = "Id مطلوب" }) { StatusCode = StatusCodes.Status400BadRequest };
        try { await _patients.DeleteTreatmentMeanAsync(id, ct); return new JsonResult(new { success = true }); }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف الوسيلة");
            return new JsonResult(new { error = "تعذر حذف الوسيلة", detail = ex.Message }) { StatusCode = StatusCodes.Status502BadGateway };
        }
    }




    /* =================== Side Effects =================== */

    public async Task<IActionResult> OnGetSideEffectsAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetSideEffectsRawAsync(patientId, ct);
            if (doc is null) return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب الأعراض الجانبية للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب الأعراض الجانبية", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب الأعراض الجانبية");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateSideEffectAsync(
        [FromBody] SideEffectCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.MedicationName) || string.IsNullOrWhiteSpace(request.Symptom))
            return new JsonResult(new { error = "بيانات غير صالحة — اسم الدواء والأعراض مطلوبة" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateSideEffectAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء العرض الجانبي");
            return new JsonResult(new { error = "تعذر إنشاء العرض الجانبي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء العرض الجانبي");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateSideEffectAsync(
        string id, [FromBody] SideEffectUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف العرض (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var sideEffectId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateSideEffectAsync(sideEffectId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل العرض الجانبي {Id}", sideEffectId);
            return new JsonResult(new { error = "تعذر تعديل العرض الجانبي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل العرض الجانبي {Id}", sideEffectId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteSideEffectAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف العرض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteSideEffectAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف العرض الجانبي {Id}", id);
            return new JsonResult(new { error = "تعذر حذف العرض الجانبي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف العرض الجانبي {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== Visits =================== */

    public async Task<IActionResult> OnGetVisitsAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetVisitsRawAsync(patientId, ct);
            if (doc is null) return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب الزيارات للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب الزيارات", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب الزيارات");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateVisitAsync(
        [FromBody] VisitCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Reason))
            return new JsonResult(new { error = "بيانات غير صالحة — سبب الزيارة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateVisitAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء الزيارة");
            return new JsonResult(new { error = "تعذر إنشاء الزيارة", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء الزيارة");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateVisitAsync(
        string id, [FromBody] VisitUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف الزيارة (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var visitId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateVisitAsync(visitId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل الزيارة {Id}", visitId);
            return new JsonResult(new { error = "تعذر تعديل الزيارة", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل الزيارة {Id}", visitId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteVisitAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف الزيارة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteVisitAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف الزيارة {Id}", id);
            return new JsonResult(new { error = "تعذر حذف الزيارة", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف الزيارة {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== Substance Use =================== */

    public async Task<IActionResult> OnGetSubstanceUsesAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetSubstanceUsesRawAsync(patientId, ct);
            if (doc is null) return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب سجلات التعاطي للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب سجلات التعاطي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب سجلات التعاطي");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateSubstanceUseAsync(
        [FromBody] SubstanceUseCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
            return new JsonResult(new { error = "بيانات غير صالحة — اسم المادة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateSubstanceUseAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء سجل تعاطي");
            return new JsonResult(new { error = "تعذر إنشاء سجل التعاطي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء سجل تعاطي");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateSubstanceUseAsync(
        string id, [FromBody] SubstanceUseUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف السجل (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var substanceId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateSubstanceUseAsync(substanceId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل سجل التعاطي {Id}", substanceId);
            return new JsonResult(new { error = "تعذر تعديل سجل التعاطي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل سجل التعاطي {Id}", substanceId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteSubstanceUseAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف السجل مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteSubstanceUseAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف سجل التعاطي {Id}", id);
            return new JsonResult(new { error = "تعذر حذف سجل التعاطي", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف سجل التعاطي {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== Listening Sessions =================== */

    public async Task<IActionResult> OnGetListeningSessionsAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetListeningSessionsRawAsync(patientId, ct);
            if (doc is null) return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب جلسات الاستماع للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب جلسات الاستماع", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب جلسات الاستماع");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateListeningSessionAsync(
        [FromBody] ListeningSessionCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
            return new JsonResult(new { error = "بيانات غير صالحة — عنوان الجلسة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateListeningSessionAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء جلسة استماع");
            return new JsonResult(new { error = "تعذر إنشاء جلسة الاستماع", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء جلسة استماع");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateListeningSessionAsync(
        string id, [FromBody] ListeningSessionUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف الجلسة (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var sessionId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateListeningSessionAsync(sessionId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل جلسة الاستماع {Id}", sessionId);
            return new JsonResult(new { error = "تعذر تعديل جلسة الاستماع", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل جلسة الاستماع {Id}", sessionId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteListeningSessionAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف الجلسة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteListeningSessionAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف جلسة الاستماع {Id}", id);
            return new JsonResult(new { error = "تعذر حذف جلسة الاستماع", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف جلسة الاستماع {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== Doctor Notes =================== */

    public async Task<IActionResult> OnGetDoctorNotesAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetDoctorNotesRawAsync(patientId, ct);
            if (doc is null) return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب ملاحظات الطبيب للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب ملاحظات الطبيب", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب ملاحظات الطبيب");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreateDoctorNoteAsync(
        [FromBody] DoctorNoteCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
            return new JsonResult(new { error = "بيانات غير صالحة — عنوان الملاحظة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreateDoctorNoteAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء ملاحظة طبيب");
            return new JsonResult(new { error = "تعذر إنشاء ملاحظة الطبيب", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء ملاحظة طبيب");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdateDoctorNoteAsync(
        string id, [FromBody] DoctorNoteUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف الملاحظة (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var noteId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdateDoctorNoteAsync(noteId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل ملاحظة الطبيب {Id}", noteId);
            return new JsonResult(new { error = "تعذر تعديل ملاحظة الطبيب", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل ملاحظة الطبيب {Id}", noteId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeleteDoctorNoteAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف الملاحظة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeleteDoctorNoteAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف ملاحظة الطبيب {Id}", id);
            return new JsonResult(new { error = "تعذر حذف ملاحظة الطبيب", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف ملاحظة الطبيب {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== Patient Notes =================== */

    public async Task<IActionResult> OnGetPatientNotesAsync(string patientId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetPatientNotesRawAsync(patientId, ct);
            if (doc is null) return new JsonResult(Array.Empty<object>());
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب ملاحظات المريض للمريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب ملاحظات المريض", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب ملاحظات المريض");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPostCreatePatientNoteAsync(
        [FromBody] PatientNoteCreateRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title))
            return new JsonResult(new { error = "بيانات غير صالحة — عنوان الملاحظة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.PatientId == Guid.Empty)
            return new JsonResult(new { error = "PatientId مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.CreatePatientNoteAsync(request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر إنشاء ملاحظة مريض");
            return new JsonResult(new { error = "تعذر إنشاء ملاحظة المريض", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في إنشاء ملاحظة مريض");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnPutUpdatePatientNoteAsync(
        string id, [FromBody] PatientNoteUpdateRequest request, CancellationToken ct)
    {
        if (request is null)
            return new JsonResult(new { error = "بيانات غير صالحة (body غير صالح)" })
            { StatusCode = StatusCodes.Status400BadRequest };

        if (request.Id == Guid.Empty)
        {
            if (Guid.TryParse(id, out var parsed))
                request.Id = parsed;
        }

        if (request.Id == Guid.Empty)
            return new JsonResult(new { error = "معرّف الملاحظة (Id) مطلوب وصالح" })
            { StatusCode = StatusCodes.Status400BadRequest };

        var noteId = request.Id.ToString();

        try
        {
            var doc = await _patients.UpdatePatientNoteAsync(noteId, request, ct);
            if (doc is null)
                return new JsonResult(new { error = "لم يتم استلام استجابة" })
                { StatusCode = StatusCodes.Status502BadGateway };
            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر تعديل ملاحظة المريض {Id}", noteId);
            return new JsonResult(new { error = "تعذر تعديل ملاحظة المريض", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في تعديل ملاحظة المريض {Id}", noteId);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }

    public async Task<IActionResult> OnDeletePatientNoteAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return new JsonResult(new { error = "معرّف الملاحظة مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            await _patients.DeletePatientNoteAsync(id, ct);
            return new JsonResult(new { success = true });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر حذف ملاحظة المريض {Id}", id);
            return new JsonResult(new { error = "تعذر حذف ملاحظة المريض", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في حذف ملاحظة المريض {Id}", id);
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }



    /* =================== Statistics (Time-Series) =================== */

    public async Task<IActionResult> OnGetStatisticsAsync(
        string patientId,
        string range = "week",
        string? startDate = null,
        string? endDate = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(patientId))
            return new JsonResult(new { error = "معرّف المريض مطلوب" })
            { StatusCode = StatusCodes.Status400BadRequest };

        try
        {
            var doc = await _patients.GetPatientStatisticsRawAsync(
                patientId, range, startDate, endDate, ct);

            if (doc is null)
                return new JsonResult(Array.Empty<object>());

            return new JsonResult(doc.RootElement);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "تعذر جلب إحصائيات المريض {PatientId}", patientId);
            return new JsonResult(new { error = "تعذر جلب الإحصائيات", detail = ex.Message })
            { StatusCode = StatusCodes.Status502BadGateway };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطأ غير متوقع في جلب الإحصائيات");
            return new JsonResult(new { error = ex.Message })
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }
}