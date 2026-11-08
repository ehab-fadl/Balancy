namespace Balancy.Services;

/// <summary>يطابق MedicationCreateDto في الباك إند.</summary>
public sealed class MedicationCreateRequest
{
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Dose { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string IntakePeriod { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق MedicationUpdateDto في الباك إند.</summary>
public sealed class MedicationUpdateRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Dose { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string IntakePeriod { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق MedicationResponseDto في الباك إند.</summary>
public sealed class MedicationResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Dose { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string IntakePeriod { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}