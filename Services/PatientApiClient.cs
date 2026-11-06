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
            _logger.LogWarning("Get patient {Id} returned {Status}", id, response.StatusCode);
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
        {
            _logger.LogWarning("Create patient failed {Status}: {Body}",
                (int)response.StatusCode, raw);
            throw new HttpRequestException(
                $"API returned {(int)response.StatusCode}: {raw}",
                null, response.StatusCode);
        }

        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdatePatientAsync(PatientUpdateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PutAsJsonAsync("api/PatientPersonalInfo", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Update patient failed {Status}: {Body}",
                (int)response.StatusCode, raw);
            throw new HttpRequestException(
                $"API returned {(int)response.StatusCode}: {raw}",
                null, response.StatusCode);
        }

        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }

    /* =================== Depression Story =================== */

    public async Task<JsonDocument?> GetDepressionStoryRawAsync(string patientId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"api/DepressionStory/patient/{patientId}", ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Get depression story for {PatientId} returned {Status}",
                patientId, response.StatusCode);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return null;

            response.EnsureSuccessStatusCode();
        }

        var raw = await response.Content.ReadAsStringAsync(ct);
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return JsonDocument.Parse(raw);
    }

    public async Task<JsonDocument?> UpdateDepressionStoryAsync(DepressionStoryUpdateRequest request, CancellationToken ct = default)
    {
        var response = await _http.PutAsJsonAsync("api/DepressionStory", request, JsonOpts, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Update depression story failed {Status}: {Body}",
                (int)response.StatusCode, raw);
            throw new HttpRequestException(
                $"API returned {(int)response.StatusCode}: {raw}",
                null, response.StatusCode);
        }

        return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw);
    }
}