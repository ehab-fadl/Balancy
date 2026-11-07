namespace Balancy.Services;

/// <summary>يطابق ChronicPsychDiseaseCreateDto في الباك إند.</summary>
public sealed class ChronicPsychDiseaseCreateRequest
{
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Hospitalization { get; set; } = string.Empty;
    public string Medications { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق ChronicPsychDiseaseUpdateDto في الباك إند.</summary>
public sealed class ChronicPsychDiseaseUpdateRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Hospitalization { get; set; } = string.Empty;
    public string Medications { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق ChronicPsychDiseaseResponseDto في الباك إند.</summary>
public sealed class ChronicPsychDiseaseResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Hospitalization { get; set; } = string.Empty;
    public string Medications { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}