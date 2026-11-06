namespace Balancy.Services;

/// <summary>
/// يطابق الـ DTO المتوقع لـ POST /api/PatientPersonalInfo في خدمة Balancy.
/// عدّل أسماء الخصائص لو الـ API بياخد شكل مختلف.
/// </summary>
public sealed class PatientCreateRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; } = string.Empty;            // "ذكر" / "أنثى"
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? MaritalStatus { get; set; }                    // "أعزب" / "متزوج" / ...
}