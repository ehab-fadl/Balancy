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

    // ===== GAD-7 Assessments =====
    Task<JsonDocument?> GetLatestGad7AssessmentRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateGad7AssessmentAsync(Gad7AssessmentCreateRequest request, CancellationToken ct = default);

    // ===== PHQ-9 Assessments =====
    Task<JsonDocument?> GetLatestPhq9AssessmentRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreatePhq9AssessmentAsync(Phq9AssessmentCreateRequest request, CancellationToken ct = default);

    // ===== MDQ Assessments =====
    Task<JsonDocument?> GetLatestMdqAssessmentRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateMdqAssessmentAsync(MdqAssessmentCreateRequest request, CancellationToken ct = default);

    // ===== SDS Assessments =====
    Task<JsonDocument?> GetLatestSdsAssessmentRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateSdsAssessmentAsync(SdsAssessmentCreateRequest request, CancellationToken ct = default);

    // ===== C-SSRS Assessments =====
    Task<JsonDocument?> GetLatestCssrsAssessmentRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateCssrsAssessmentAsync(CssrsAssessmentCreateRequest request, CancellationToken ct = default);

    // ===== Diagnoses =====
    Task<JsonDocument?> GetDiagnosesRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateDiagnosisAsync(DiagnosisCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateDiagnosisAsync(string id, DiagnosisUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteDiagnosisAsync(string id, CancellationToken ct = default);

    // ===== Medications =====
    Task<JsonDocument?> GetMedicationsRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateMedicationAsync(MedicationCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateMedicationAsync(string id, MedicationUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteMedicationAsync(string id, CancellationToken ct = default);



    // ===== Treatment Plans =====
Task<JsonDocument?> GetTreatmentPlansRawAsync(string patientId, CancellationToken ct = default);
Task<JsonDocument?> CreateTreatmentPlanAsync(TreatmentPlanCreateRequest request, CancellationToken ct = default);
Task<JsonDocument?> UpdateTreatmentPlanAsync(string id, TreatmentPlanUpdateRequest request, CancellationToken ct = default);
Task<bool> DeleteTreatmentPlanAsync(string id, CancellationToken ct = default);

// ===== Treatment Problems =====
Task<JsonDocument?> CreateTreatmentProblemAsync(TreatmentProblemCreateRequest request, CancellationToken ct = default);
Task<JsonDocument?> UpdateTreatmentProblemAsync(string id, TreatmentProblemUpdateRequest request, CancellationToken ct = default);
Task<bool> DeleteTreatmentProblemAsync(string id, CancellationToken ct = default);

// ===== Treatment Goals =====
Task<JsonDocument?> CreateTreatmentGoalAsync(TreatmentGoalCreateRequest request, CancellationToken ct = default);
Task<JsonDocument?> UpdateTreatmentGoalAsync(string id, TreatmentGoalUpdateRequest request, CancellationToken ct = default);
Task<JsonDocument?> UpdateTreatmentGoalProgressAsync(string id, TreatmentGoalProgressRequest request, CancellationToken ct = default);
Task<JsonDocument?> AchieveTreatmentGoalAsync(string id, TreatmentGoalAchieveRequest request, CancellationToken ct = default);
Task<JsonDocument?> UnachieveTreatmentGoalAsync(string id, TreatmentGoalUnachieveRequest request, CancellationToken ct = default);
Task<bool> DeleteTreatmentGoalAsync(string id, CancellationToken ct = default);

// ===== Treatment Means =====
Task<JsonDocument?> CreateTreatmentMeanAsync(TreatmentMeanCreateRequest request, CancellationToken ct = default);
Task<JsonDocument?> UpdateTreatmentMeanAsync(string id, TreatmentMeanUpdateRequest request, CancellationToken ct = default);
Task<bool> DeleteTreatmentMeanAsync(string id, CancellationToken ct = default);

    // ===== Side Effects =====
    Task<JsonDocument?> GetSideEffectsRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateSideEffectAsync(SideEffectCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateSideEffectAsync(string id, SideEffectUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteSideEffectAsync(string id, CancellationToken ct = default);


    // ===== Visits =====
    Task<JsonDocument?> GetVisitsRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateVisitAsync(VisitCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateVisitAsync(string id, VisitUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteVisitAsync(string id, CancellationToken ct = default);


    // ===== Substance Use =====
    Task<JsonDocument?> GetSubstanceUsesRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateSubstanceUseAsync(SubstanceUseCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateSubstanceUseAsync(string id, SubstanceUseUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteSubstanceUseAsync(string id, CancellationToken ct = default);

    // ===== Listening Sessions =====
    Task<JsonDocument?> GetListeningSessionsRawAsync(string patientId, CancellationToken ct = default);
    Task<JsonDocument?> CreateListeningSessionAsync(ListeningSessionCreateRequest request, CancellationToken ct = default);
    Task<JsonDocument?> UpdateListeningSessionAsync(string id, ListeningSessionUpdateRequest request, CancellationToken ct = default);
    Task<bool> DeleteListeningSessionAsync(string id, CancellationToken ct = default);
}

public sealed class PatientSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Gender { get; set; }
}