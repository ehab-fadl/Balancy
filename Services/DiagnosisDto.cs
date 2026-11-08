namespace Balancy.Services;

/// <summary>يطابق DiagnosisCreateDto في الباك إند.</summary>
public sealed class DiagnosisCreateRequest
{
    public Guid PatientId { get; set; }
    public string MainType { get; set; } = string.Empty;
    public string SubType { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق DiagnosisUpdateDto في الباك إند.</summary>
public sealed class DiagnosisUpdateRequest
{
    public Guid Id { get; set; }
    public string MainType { get; set; } = string.Empty;
    public string SubType { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق DiagnosisResponseDto في الباك إند.</summary>
public sealed class DiagnosisResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string MainType { get; set; } = string.Empty;
    public string SubType { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}