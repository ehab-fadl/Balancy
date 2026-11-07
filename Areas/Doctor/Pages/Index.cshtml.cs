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
}