using System.Text.Json;

namespace Balancy.Services;

public interface IPatientApiClient
{
    // ===== Patients =====
    Task<IReadOnlyList<PatientSummaryDto>> GetAllPatientsAsync(CancellationToken ct = default);
    Task<PatientSummaryDto?> GetPatientByIdAsync(string id, CancellationToken ct = default);
    Task<JsonDocument> GetAllPatientsRawAsync(CancellationToken ct = default);
    Task<JsonDocument?> GetPatientRawByIdAsync(string id, CancellationToken ct = default);
    Task<JsonDocument?> CreatePatientAsync(PatientCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdatePatientAsync(PatientUpdateRequest request, CancellationToken ct = default);

    // ===== Depression Story =====
    /// <summary>جلب قصة الاكتئاب لمريض (JSON خام، أو null لو مش موجودة).</summary>
    Task<JsonDocument?> GetDepressionStoryRawAsync(string patientId, CancellationToken ct = default);

    /// <summary>تحديث قصة الاكتئاب.</summary>
    Task<JsonDocument?> UpdateDepressionStoryAsync(DepressionStoryUpdateRequest request, CancellationToken ct = default);
}

public sealed class PatientSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Gender { get; set; }
}