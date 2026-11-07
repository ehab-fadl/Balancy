namespace Balancy.Services;

/// <summary>يطابق ChronicDiseaseCreateDto في الباك إند.</summary>
public sealed class ChronicDiseaseCreateRequest
{
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Medications { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق ChronicDiseaseUpdateDto في الباك إند.</summary>
public sealed class ChronicDiseaseUpdateRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Medications { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق ChronicDiseaseResponseDto في الباك إند.</summary>
public sealed class ChronicDiseaseResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Medications { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}