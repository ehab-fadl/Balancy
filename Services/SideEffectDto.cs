namespace Balancy.Services;

/// <summary>يطابق SideEffectCreateDto في الباك إند.</summary>
public sealed class SideEffectCreateRequest
{
    public Guid PatientId { get; set; }
    public string MedicationName { get; set; } = string.Empty;
    public string Symptom { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق SideEffectUpdateDto في الباك إند.</summary>
public sealed class SideEffectUpdateRequest
{
    public Guid Id { get; set; }
    public string MedicationName { get; set; } = string.Empty;
    public string Symptom { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق SideEffectResponseDto في الباك إند.</summary>
public sealed class SideEffectResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string MedicationName { get; set; } = string.Empty;
    public string Symptom { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}