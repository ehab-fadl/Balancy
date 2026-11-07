namespace Balancy.Services;

/// <summary>يطابق VitalSignCreateDto في الباك إند.</summary>
public sealed class VitalSignCreateRequest
{
    public Guid PatientId { get; set; }
    public string VitalType { get; set; } = string.Empty;
    public DateTime MeasurementDate { get; set; }
    public decimal Value1 { get; set; }
    public decimal? Value2 { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق VitalSignUpdateDto في الباك إند.</summary>
public sealed class VitalSignUpdateRequest
{
    public Guid Id { get; set; }
    public string VitalType { get; set; } = string.Empty;
    public DateTime MeasurementDate { get; set; }
    public decimal Value1 { get; set; }
    public decimal? Value2 { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

/// <summary>يطابق VitalSignResponseDto في الباك إند.</summary>
public sealed class VitalSignResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string VitalType { get; set; } = string.Empty;
    public DateTime MeasurementDate { get; set; }
    public decimal Value1 { get; set; }
    public decimal? Value2 { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}