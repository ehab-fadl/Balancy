namespace Balancy.Services;

/// <summary>يطابق CssrsAssessmentCreateDto في الباك إند.</summary>
public sealed class CssrsAssessmentCreateRequest
{
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public bool IsCritical { get; set; }
    public string? AnswersJson { get; set; }
}

/// <summary>يطابق CssrsAssessmentResponseDto في الباك إند.</summary>
public sealed class CssrsAssessmentResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public bool IsCritical { get; set; }
    public string? AnswersJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}