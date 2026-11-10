namespace Balancy.Services;

/// <summary>يطابق DoctorNoteCreateDto في الباك إند.</summary>
public sealed class DoctorNoteCreateRequest
{
    public Guid PatientId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime NoteDate { get; set; }
    public string NoteType { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Author { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string? RiskLevel { get; set; }
    public string? Icd10 { get; set; }
    public int MoodAtNote { get; set; }
    public string Visibility { get; set; } = "خاص";
    public string? Symptoms { get; set; }
    public string? LinkType { get; set; }
    public Guid? LinkItemId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? NextPlan { get; set; }
}

/// <summary>يطابق DoctorNoteUpdateDto في الباك إند.</summary>
public sealed class DoctorNoteUpdateRequest
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime NoteDate { get; set; }
    public string NoteType { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Author { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string? RiskLevel { get; set; }
    public string? Icd10 { get; set; }
    public int MoodAtNote { get; set; }
    public string Visibility { get; set; } = "خاص";
    public string? Symptoms { get; set; }
    public string? LinkType { get; set; }
    public Guid? LinkItemId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? NextPlan { get; set; }
}

/// <summary>يطابق DoctorNoteResponseDto في الباك إند.</summary>
public sealed class DoctorNoteResponse
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime NoteDate { get; set; }
    public string NoteType { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Author { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string? RiskLevel { get; set; }
    public string? Icd10 { get; set; }
    public int MoodAtNote { get; set; }
    public string Visibility { get; set; } = "خاص";
    public string? Symptoms { get; set; }
    public string? LinkType { get; set; }
    public Guid? LinkItemId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? NextPlan { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}