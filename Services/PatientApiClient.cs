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
}