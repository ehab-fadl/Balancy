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
    Task<JsonDocument?> GetDepressionStoryRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> UpdateDepressionStoryAsync(DepressionStoryUpdateRequest request, CancellationToken ct = default);

    // ===== Chronic Diseases =====
    Task<JsonDocument?> GetChronicDiseasesRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateChronicDiseaseAsync(ChronicDiseaseCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateChronicDiseaseAsync(string id, ChronicDiseaseUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteChronicDiseaseAsync(string id, CancellationToken ct = default);

    // ===== Chronic Psych Diseases =====
    Task<JsonDocument?> GetChronicPsychDiseasesRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateChronicPsychDiseaseAsync(ChronicPsychDiseaseCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateChronicPsychDiseaseAsync(string id, ChronicPsychDiseaseUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteChronicPsychDiseaseAsync(string id, CancellationToken ct = default);

    // ===== Family History =====
    Task<JsonDocument?> GetFamilyHistoryRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateFamilyHistoryAsync(FamilyHistoryCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateFamilyHistoryAsync(string id, FamilyHistoryUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteFamilyHistoryAsync(string id, CancellationToken ct = default);

    // ===== Vital Signs =====
    Task<JsonDocument?> GetVitalSignsRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateVitalSignAsync(VitalSignCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateVitalSignAsync(string id, VitalSignUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteVitalSignAsync(string id, CancellationToken ct = default);
}

public sealed class PatientSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Gender { get; set; }
}