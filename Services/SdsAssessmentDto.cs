namespace Balancy.Services;

/// <summary>يطابق SdsAssessmentCreateDto في الباك إند.</summary>
public sealed class SdsAssessmentCreateRequest
{
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? AnswersJson { get; set; }
}

/// <summary>يطابق SdsAssessmentResponseDto في الباك إند.</summary>
public sealed class SdsAssessmentResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? AnswersJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}