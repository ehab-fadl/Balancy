namespace Balancy.Services;

/// <summary>يطابق MdqAssessmentCreateDto في الباك إند.</summary>
public sealed class MdqAssessmentCreateRequest
{
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? AnswersJson { get; set; }
}

/// <summary>يطابق MdqAssessmentResponseDto في الباك إند.</summary>
public sealed class MdqAssessmentResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int TotalScore { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string? AnswersJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}