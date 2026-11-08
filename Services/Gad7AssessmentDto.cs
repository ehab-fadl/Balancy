namespace Balancy.Services;

/// <summary>يطابق Gad7AssessmentCreateDto في الباك إند.</summary>
public sealed class Gad7AssessmentCreateRequest
{
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? AnswersJson { get; set; }
}

/// <summary>يطابق Gad7AssessmentResponseDto في الباك إند.</summary>
public sealed class Gad7AssessmentResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? AnswersJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}