namespace Balancy.Services;

/// <summary>يطابق VisitCreateDto في الباك إند.</summary>
public sealed class VisitCreateRequest
{
    public Guid PatientId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime VisitDate { get; set; }
    public string VisitType { get; set; } = string.Empty;
    public string VisitLocation { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? NextVisitDate { get; set; }
}

/// <summary>يطابق VisitUpdateDto في الباك إند.</summary>
public sealed class VisitUpdateRequest
{
    public Guid Id { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime VisitDate { get; set; }
    public string VisitType { get; set; } = string.Empty;
    public string VisitLocation { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? NextVisitDate { get; set; }
}

/// <summary>يطابق VisitResponseDto في الباك إند.</summary>
public sealed class VisitResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime VisitDate { get; set; }
    public string VisitType { get; set; } = string.Empty;
    public string VisitLocation { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? NextVisitDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}