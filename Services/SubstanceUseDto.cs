namespace Balancy.Services;

/// <summary>يطابق SubstanceUseCreateDto في الباك إند.</summary>
public sealed class SubstanceUseCreateRequest
{
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Amount { get; set; } = string.Empty;
    public double? DurationYears { get; set; }
    public int? AgeOfOnset { get; set; }
    public string? Reason { get; set; }
    public DateTime LastUseDate { get; set; }
    public string CurrentStatus { get; set; } = string.Empty;
    public int CravingLevel { get; set; }
    public string Severity { get; set; } = string.Empty;
    public bool PhysicalDependence { get; set; }
    public bool PsychologicalDependence { get; set; }
    public bool ImpactWork { get; set; }
    public bool ImpactRelationships { get; set; }
    public bool ImpactHealth { get; set; }
    public bool ImpactLegal { get; set; }
    public int? QuitAttempts { get; set; }
    public DateTime? LastQuitDate { get; set; }
    public string? Notes { get; set; }
}

/// <summary>يطابق SubstanceUseUpdateDto في الباك إند.</summary>
public sealed class SubstanceUseUpdateRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Amount { get; set; } = string.Empty;
    public double? DurationYears { get; set; }
    public int? AgeOfOnset { get; set; }
    public string? Reason { get; set; }
    public DateTime LastUseDate { get; set; }
    public string CurrentStatus { get; set; } = string.Empty;
    public int CravingLevel { get; set; }
    public string Severity { get; set; } = string.Empty;
    public bool PhysicalDependence { get; set; }
    public bool PsychologicalDependence { get; set; }
    public bool ImpactWork { get; set; }
    public bool ImpactRelationships { get; set; }
    public bool ImpactHealth { get; set; }
    public bool ImpactLegal { get; set; }
    public int? QuitAttempts { get; set; }
    public DateTime? LastQuitDate { get; set; }
    public string? Notes { get; set; }
}

/// <summary>يطابق SubstanceUseResponseDto في الباك إند.</summary>
public sealed class SubstanceUseResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public string Amount { get; set; } = string.Empty;
    public double? DurationYears { get; set; }
    public int? AgeOfOnset { get; set; }
    public string? Reason { get; set; }
    public DateTime LastUseDate { get; set; }
    public string CurrentStatus { get; set; } = string.Empty;
    public int CravingLevel { get; set; }
    public string Severity { get; set; } = string.Empty;
    public bool PhysicalDependence { get; set; }
    public bool PsychologicalDependence { get; set; }
    public bool ImpactWork { get; set; }
    public bool ImpactRelationships { get; set; }
    public bool ImpactHealth { get; set; }
    public bool ImpactLegal { get; set; }
    public int? QuitAttempts { get; set; }
    public DateTime? LastQuitDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}