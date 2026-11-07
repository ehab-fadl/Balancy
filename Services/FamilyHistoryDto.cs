namespace Balancy.Services;

/// <summary>يطابق FamilyHistoryCreateDto في الباك إند.</summary>
public sealed class FamilyHistoryCreateRequest
{
    public Guid PatientId { get; set; }
    public string Relation { get; set; } = string.Empty;
    public string? RelativeName { get; set; }
    public int? Age { get; set; }
    public string? Status { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string ConditionType { get; set; } = string.Empty;
    public string Conditions { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق FamilyHistoryUpdateDto في الباك إند.</summary>
public sealed class FamilyHistoryUpdateRequest
{
    public Guid Id { get; set; }
    public string Relation { get; set; } = string.Empty;
    public string? RelativeName { get; set; }
    public int? Age { get; set; }
    public string? Status { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string ConditionType { get; set; } = string.Empty;
    public string Conditions { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق FamilyHistoryResponseDto في الباك إند.</summary>
public sealed class FamilyHistoryResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Relation { get; set; } = string.Empty;
    public string? RelativeName { get; set; }
    public int? Age { get; set; }
    public string? Status { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string ConditionType { get; set; } = string.Empty;
    public string Conditions { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}