namespace Balancy.Services;

/// <summary>يطابق ListeningSessionCreateDto في الباك إند.</summary>
public sealed class ListeningSessionCreateRequest
{
    public Guid PatientId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime SessionDate { get; set; }
    public TimeSpan? SessionTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string? SessionType { get; set; }
    public string Status { get; set; } = string.Empty;

    public string? TherapyType { get; set; }
    public string? Format { get; set; }
    public string? TherapistName { get; set; }
    public Guid? LinkedTreatmentPlanId { get; set; }

    public int MoodBefore { get; set; }
    public int MoodAfter { get; set; }

    public string? TopicsDiscussed { get; set; }
    public string? TechniquesUsed { get; set; }

    public string? RiskLevel { get; set; }
    public bool HomeworkCompleted { get; set; }
    public string? HomeworkAssigned { get; set; }
    public string? NextSessionPlan { get; set; }

    public string? Notes { get; set; }
    public string? ClinicalNotes { get; set; }
}

/// <summary>يطابق ListeningSessionUpdateDto في الباك إند.</summary>
public sealed class ListeningSessionUpdateRequest
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime SessionDate { get; set; }
    public TimeSpan? SessionTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string? SessionType { get; set; }
    public string Status { get; set; } = string.Empty;

    public string? TherapyType { get; set; }
    public string? Format { get; set; }
    public string? TherapistName { get; set; }
    public Guid? LinkedTreatmentPlanId { get; set; }

    public int MoodBefore { get; set; }
    public int MoodAfter { get; set; }

    public string? TopicsDiscussed { get; set; }
    public string? TechniquesUsed { get; set; }

    public string? RiskLevel { get; set; }
    public bool HomeworkCompleted { get; set; }
    public string? HomeworkAssigned { get; set; }
    public string? NextSessionPlan { get; set; }

    public string? Notes { get; set; }
    public string? ClinicalNotes { get; set; }
}

/// <summary>يطابق ListeningSessionResponseDto في الباك إند.</summary>
public sealed class ListeningSessionResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime SessionDate { get; set; }
    public TimeSpan? SessionTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string? SessionType { get; set; }
    public string Status { get; set; } = string.Empty;

    public string? TherapyType { get; set; }
    public string? Format { get; set; }
    public string? TherapistName { get; set; }
    public Guid? LinkedTreatmentPlanId { get; set; }

    public int MoodBefore { get; set; }
    public int MoodAfter { get; set; }

    public string? TopicsDiscussed { get; set; }
    public string? TechniquesUsed { get; set; }

    public string? RiskLevel { get; set; }
    public bool HomeworkCompleted { get; set; }
    public string? HomeworkAssigned { get; set; }
    public string? NextSessionPlan { get; set; }

    public string? Notes { get; set; }
    public string? ClinicalNotes { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}