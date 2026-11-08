namespace Balancy.Services;

/// <summary>يطابق Phq9AssessmentCreateDto في الباك إند.</summary>
public sealed class Phq9AssessmentCreateRequest
{
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? AnswersJson { get; set; }
}

/// <summary>يطابق Phq9AssessmentResponseDto في الباك إند.</summary>
public sealed class Phq9AssessmentResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? AnswersJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}