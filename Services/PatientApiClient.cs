using System.Net.Http.Json;
using System.Text.Json;

namespace Balancy.Services;

public sealed class PatientApiClient : IPatientApiClient
{
    private readonly HttpClient _http;
    private readonly ILogger<PatientApiClient> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public PatientApiClient(IHttpClientFactory factory, ILogger<PatientApiClient> logger)
    {
        _http = factory.CreateClient("BalancyPatientApi");
        _logger = logger;
    }

    /* =================== Patients =================== */
    public async Task<IReadOnlyList<PatientSummaryDto>> GetAllPatientsAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("api/PatientPersonalInfo", ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("PatientApi returned {Status}", response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var list = await response.Content.ReadFromJsonAsync<List<PatientSummaryDto>>(JsonOpts, ct);
        return list ?? new List<PatientSummaryDto>();
    }

    public async Task<PatientSummaryDto?> GetPatientByIdAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/PatientPersonalInfo/{id}", ct);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<PatientSummaryDto>(JsonOpts, ct);
    }

    public async Task<JsonDocument> GetAllPatientsRawAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("api/PatientPersonalInfo", ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("PatientApi returned {Status}", response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    public async Task<JsonDocument?> GetPatientRawByIdAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/PatientPersonalInfo/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreatePatientAsync(PatientCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/PatientPersonalInfo", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdatePatientAsync(PatientUpdateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PutAsJsonAsync("api/PatientPersonalInfo", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    /* =================== Depression Story =================== */
    public async Task<JsonDocument?> GetDepressionStoryRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/DepressionStory/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateDepressionStoryAsync(DepressionStoryUpdateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PutAsJsonAsync("api/DepressionStory", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    /* =================== Chronic Diseases =================== */
    public async Task<JsonDocument?> GetChronicDiseasesRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/ChronicDiseases/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get chronic diseases for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateChronicDiseaseAsync(
      ChronicDiseaseCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/ChronicDiseases", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateChronicDiseaseAsync(
        string id, ChronicDiseaseUpdateRequest request, CancellationToken ct = default)
    {
        // ✅ ضمان إن Id في الـ body GUID مطابق للـ URL
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/ChronicDiseases/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }
    public async Task<bool> DeleteChronicDiseaseAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/ChronicDiseases/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

    /* =================== Chronic Psych Diseases =================== */
    public async Task<JsonDocument?> GetChronicPsychDiseasesRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/ChronicPsychDiseases/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get chronic psych diseases for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateChronicPsychDiseaseAsync(
        ChronicPsychDiseaseCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/ChronicPsychDiseases", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateChronicPsychDiseaseAsync(
        string id, ChronicPsychDiseaseUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/ChronicPsychDiseases/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteChronicPsychDiseaseAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/ChronicPsychDiseases/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }
    /* =================== Family History =================== */
    public async Task<JsonDocument?> GetFamilyHistoryRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/FamilyHistories/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get family history for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateFamilyHistoryAsync(
        FamilyHistoryCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/FamilyHistories", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateFamilyHistoryAsync(
        string id, FamilyHistoryUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/FamilyHistories/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteFamilyHistoryAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/FamilyHistories/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }





    /* =================== Vital Signs =================== */
    public async Task<JsonDocument?> GetVitalSignsRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/VitalSigns/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get vital signs for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateVitalSignAsync(
        VitalSignCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/VitalSigns", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateVitalSignAsync(
        string id, VitalSignUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/VitalSigns/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteVitalSignAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/VitalSigns/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }



    /* =================== GAD-7 Assessments =================== */
    public async Task<JsonDocument?> GetLatestGad7AssessmentRawAsync(string patientId, CancellationToken ct = default)
    {
        // نجرّب endpoint مخصص لآخر تقييم، ولو مش موجود نرجع للقائمة الكاملة
        var endpoints = new[]
        {
            $"api/Gad7Assessments/patient/{patientId}/latest",
            $"api/Gad7Assessments/patient/{patientId}"
        };

        foreach (var endpoint in endpoints)
        {
            try
            {
                var response = await _http.GetAsync(endpoint, ct);

                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    continue;

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Get GAD-7 latest for {PatientId} at {Endpoint} returned {Status}",
                        patientId, endpoint, response.StatusCode);
                    continue;
                }

                var raw = await response.Content.ReadAsStringAsync(ct);
                if (string.IsNullOrWhiteSpace(raw)) continue;

                return JsonDocument.Parse(raw);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "فشل محاولة جلب GAD-7 من {Endpoint}", endpoint);
            }
        }

        return null;
    }

    public async Task<JsonDocument?> CreateGad7AssessmentAsync(
        Gad7AssessmentCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/Gad7Assessments", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }


    /* =================== PHQ-9 Assessments =================== */
    public async Task<JsonDocument?> GetLatestPhq9AssessmentRawAsync(string patientId, CancellationToken ct = default)
    {
        var endpoints = new[]
        {
            $"api/Phq9Assessments/patient/{patientId}/latest",
            $"api/Phq9Assessments/patient/{patientId}"
        };

        foreach (var endpoint in endpoints)
        {
            try
            {
                var response = await _http.GetAsync(endpoint, ct);

                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    continue;

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Get PHQ-9 latest for {PatientId} at {Endpoint} returned {Status}",
                        patientId, endpoint, response.StatusCode);
                    continue;
                }

                var raw = await response.Content.ReadAsStringAsync(ct);
                if (string.IsNullOrWhiteSpace(raw)) continue;

                return JsonDocument.Parse(raw);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "فشل محاولة جلب PHQ-9 من {Endpoint}", endpoint);
            }
        }

        return null;
    }

    public async Task<JsonDocument?> CreatePhq9AssessmentAsync(
        Phq9AssessmentCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/Phq9Assessments", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }




    /* =================== MDQ Assessments =================== */
    public async Task<JsonDocument?> GetLatestMdqAssessmentRawAsync(string patientId, CancellationToken ct = default)
    {
        var endpoints = new[]
        {
            $"api/MdqAssessments/patient/{patientId}/latest",
            $"api/MdqAssessments/patient/{patientId}"
        };

        foreach (var endpoint in endpoints)
        {
            try
            {
                var response = await _http.GetAsync(endpoint, ct);

                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    continue;

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Get MDQ latest for {PatientId} at {Endpoint} returned {Status}",
                        patientId, endpoint, response.StatusCode);
                    continue;
                }

                var raw = await response.Content.ReadAsStringAsync(ct);
                if (string.IsNullOrWhiteSpace(raw)) continue;

                return JsonDocument.Parse(raw);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "فشل محاولة جلب MDQ من {Endpoint}", endpoint);
            }
        }

        return null;
    }

    public async Task<JsonDocument?> CreateMdqAssessmentAsync(
        MdqAssessmentCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/MdqAssessments", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }





    /* =================== SDS Assessments =================== */
    public async Task<JsonDocument?> GetLatestSdsAssessmentRawAsync(string patientId, CancellationToken ct = default)
    {
        var endpoints = new[]
        {
            $"api/SdsAssessments/patient/{patientId}/latest",
            $"api/SdsAssessments/patient/{patientId}"
        };

        foreach (var endpoint in endpoints)
        {
            try
            {
                var response = await _http.GetAsync(endpoint, ct);

                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    continue;

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Get SDS latest for {PatientId} at {Endpoint} returned {Status}",
                        patientId, endpoint, response.StatusCode);
                    continue;
                }

                var raw = await response.Content.ReadAsStringAsync(ct);
                if (string.IsNullOrWhiteSpace(raw)) continue;

                return JsonDocument.Parse(raw);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "فشل محاولة جلب SDS من {Endpoint}", endpoint);
            }
        }

        return null;
    }

    public async Task<JsonDocument?> CreateSdsAssessmentAsync(
        SdsAssessmentCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/SdsAssessments", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }




    /* =================== C-SSRS Assessments =================== */
    public async Task<JsonDocument?> GetLatestCssrsAssessmentRawAsync(string patientId, CancellationToken ct = default)
    {
        var endpoints = new[]
        {
            $"api/CssrsAssessments/patient/{patientId}/latest",
            $"api/CssrsAssessments/patient/{patientId}"
        };

        foreach (var endpoint in endpoints)
        {
            try
            {
                var response = await _http.GetAsync(endpoint, ct);

                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    continue;

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Get C-SSRS latest for {PatientId} at {Endpoint} returned {Status}",
                        patientId, endpoint, response.StatusCode);
                    continue;
                }

                var raw = await response.Content.ReadAsStringAsync(ct);
                if (string.IsNullOrWhiteSpace(raw)) continue;

                return JsonDocument.Parse(raw);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "فشل محاولة جلب C-SSRS من {Endpoint}", endpoint);
            }
        }

        return null;
    }

    public async Task<JsonDocument?> CreateCssrsAssessmentAsync(
        CssrsAssessmentCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/CssrsAssessments", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }



    /* =================== Diagnoses =================== */
    public async Task<JsonDocument?> GetDiagnosesRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/Diagnoses/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get diagnoses for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateDiagnosisAsync(
        DiagnosisCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/Diagnoses", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateDiagnosisAsync(
        string id, DiagnosisUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/Diagnoses/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteDiagnosisAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/Diagnoses/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }
    /* =================== Medications =================== */
    public async Task<JsonDocument?> GetMedicationsRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/Medications/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get medications for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateMedicationAsync(
        MedicationCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/Medications", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateMedicationAsync(
        string id, MedicationUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/Medications/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteMedicationAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/Medications/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

        /* =================== Treatment Plans =================== */
    public async Task<JsonDocument?> GetTreatmentPlansRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/TreatmentPlans/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateTreatmentPlanAsync(TreatmentPlanCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/TreatmentPlans", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateTreatmentPlanAsync(string id, TreatmentPlanUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed)) request.Id = parsed;
        var response = await _http.PutAsJsonAsync($"api/TreatmentPlans/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteTreatmentPlanAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/TreatmentPlans/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

    /* =================== Treatment Problems =================== */
    public async Task<JsonDocument?> CreateTreatmentProblemAsync(TreatmentProblemCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/TreatmentPlans/problems", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateTreatmentProblemAsync(string id, TreatmentProblemUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed)) request.Id = parsed;
        var response = await _http.PutAsJsonAsync($"api/TreatmentPlans/problems/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteTreatmentProblemAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/TreatmentPlans/problems/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

    /* =================== Treatment Goals =================== */
    public async Task<JsonDocument?> CreateTreatmentGoalAsync(TreatmentGoalCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/TreatmentPlans/goals", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateTreatmentGoalAsync(string id, TreatmentGoalUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed)) request.Id = parsed;
        var response = await _http.PutAsJsonAsync($"api/TreatmentPlans/goals/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateTreatmentGoalProgressAsync(string id, TreatmentGoalProgressRequest request, CancellationToken ct = default)
    {
        if (request.GoalId == Guid.Empty && Guid.TryParse(id, out var parsed)) request.GoalId = parsed;
        var response = await _http.PutAsJsonAsync($"api/TreatmentPlans/goals/{id}/progress", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> AchieveTreatmentGoalAsync(string id, TreatmentGoalAchieveRequest request, CancellationToken ct = default)
    {
        if (request.GoalId == Guid.Empty && Guid.TryParse(id, out var parsed)) request.GoalId = parsed;
        var response = await _http.PutAsJsonAsync($"api/TreatmentPlans/goals/{id}/achieve", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UnachieveTreatmentGoalAsync(string id, TreatmentGoalUnachieveRequest request, CancellationToken ct = default)
    {
        if (request.GoalId == Guid.Empty && Guid.TryParse(id, out var parsed)) request.GoalId = parsed;
        var response = await _http.PutAsJsonAsync($"api/TreatmentPlans/goals/{id}/unachieve", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteTreatmentGoalAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/TreatmentPlans/goals/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

    /* =================== Treatment Means =================== */
    public async Task<JsonDocument?> CreateTreatmentMeanAsync(TreatmentMeanCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/TreatmentPlans/means", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateTreatmentMeanAsync(string id, TreatmentMeanUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed)) request.Id = parsed;
        var response = await _http.PutAsJsonAsync($"api/TreatmentPlans/means/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteTreatmentMeanAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/TreatmentPlans/means/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

    /* =================== Side Effects =================== */
    public async Task<JsonDocument?> GetSideEffectsRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/SideEffects/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get side effects for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateSideEffectAsync(
        SideEffectCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/SideEffects", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateSideEffectAsync(
        string id, SideEffectUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/SideEffects/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteSideEffectAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/SideEffects/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }



    /* =================== Visits =================== */
    public async Task<JsonDocument?> GetVisitsRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/Visits/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get visits for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateVisitAsync(
        VisitCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/Visits", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateVisitAsync(
        string id, VisitUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/Visits/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteVisitAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/Visits/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }




    /* =================== Substance Use =================== */
    public async Task<JsonDocument?> GetSubstanceUsesRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/SubstanceUses/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get substance uses for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateSubstanceUseAsync(
        SubstanceUseCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/SubstanceUses", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateSubstanceUseAsync(
        string id, SubstanceUseUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/SubstanceUses/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteSubstanceUseAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/SubstanceUses/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }



    /* =================== Listening Sessions =================== */
    public async Task<JsonDocument?> GetListeningSessionsRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/ListeningSessions/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get listening sessions for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateListeningSessionAsync(
        ListeningSessionCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/ListeningSessions", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateListeningSessionAsync(
        string id, ListeningSessionUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/ListeningSessions/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteListeningSessionAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/ListeningSessions/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }


    /* =================== Doctor Notes =================== */
    public async Task<JsonDocument?> GetDoctorNotesRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/DoctorNotes/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get doctor notes for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreateDoctorNoteAsync(
        DoctorNoteCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/DoctorNotes", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateDoctorNoteAsync(
        string id, DoctorNoteUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/DoctorNotes/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeleteDoctorNoteAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/DoctorNotes/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }



    /* =================== Patient Notes =================== */
    public async Task<JsonDocument?> GetPatientNotesRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/PatientNotes/patient/{patientId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get patient notes for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> CreatePatientNoteAsync(
        PatientNoteCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/PatientNotes", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdatePatientNoteAsync(
        string id, PatientNoteUpdateRequest request, CancellationToken ct = default)
    {
        if (request.Id == Guid.Empty && Guid.TryParse(id, out var parsed))
            request.Id = parsed;

        var response = await _http.PutAsJsonAsync($"api/PatientNotes/{id}", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DeletePatientNoteAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/PatientNotes/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }


    /* =================== Statistics (Time-Series) =================== */
    public async Task<JsonDocument?> GetPatientStatisticsRawAsync(
        string patientId,
        string range = "week",
        string? startDate = null,
        string? endDate = null,
        CancellationToken ct = default)
    {
        var query = new List<string> { $"range={Uri.EscapeDataString(range ?? "week")}" };
        if (!string.IsNullOrWhiteSpace(startDate)) query.Add($"startDate={Uri.EscapeDataString(startDate)}");
        if (!string.IsNullOrWhiteSpace(endDate)) query.Add($"endDate={Uri.EscapeDataString(endDate)}");

        var url = $"api/Statistics/patient/{patientId}?{string.Join("&", query)}";

        var response = await _http.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            _logger.LogWarning("Get statistics for {PatientId} returned {Status}",
                patientId, response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var raw = await response.Content.ReadAsStringAsync(ct);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }


    public async Task<bool> DeletePatientAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("معرّف المريض مطلوب", nameof(id));

        var response = await _http.DeleteAsync($"api/PatientPersonalInfo/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

    /* =================== Clinic =================== */
    public async Task<JsonDocument?> GetClinicPatientsRawAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("api/Clinic/patients", ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Get clinic patients returned {Status}", response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    public async Task<JsonDocument?> GetClinicStatisticsRawAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("api/Clinic/statistics", ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Get clinic statistics returned {Status}", response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }


    /* =================== Alerts =================== */
    public async Task<JsonDocument?> GetAlertsRawAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("api/Alerts", ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Get alerts returned {Status}", response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    public async Task<JsonDocument?> RefreshAlertsAsync(CancellationToken ct = default)
    {
        var response = await _http.PostAsync("api/Alerts/refresh", null, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> DismissAlertAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.PutAsync($"api/Alerts/{id}/dismiss", null, ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

    public async Task<bool> DismissAllAlertsAsync(CancellationToken ct = default)
    {
        var response = await _http.PutAsync("api/Alerts/dismiss-all", null, ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }


    /* =================== Dashboard =================== */
    public async Task<JsonDocument?> GetDashboardRawAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("api/Dashboard", ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Get dashboard returned {Status}", response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }
    /* =================== Appointments (raw) =================== */
    public async Task<JsonDocument?> GetAppointmentsRawAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("api/Appointments", ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Get appointments returned {Status}", response.StatusCode);
            response.EnsureSuccessStatusCode();
        }
        var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }



    public async Task<JsonDocument?> CreateAppointmentAsync(AppointmentCreateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync("api/Appointments", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<bool> ConfirmAppointmentAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.PutAsync($"api/Appointments/{id}/confirm", null, ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

    public async Task<bool> DeleteAppointmentAsync(string id, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"api/Appointments/{id}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var raw = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"API returned {(int)response.StatusCode}: {raw}", null, response.StatusCode);
        }
        return true;
    }

}