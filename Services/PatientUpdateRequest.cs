namespace Balancy.Services;

/// <summary>
/// يطابق الـ DTO المتوقع لـ PUT /api/PatientPersonalInfo.
/// ملاحظة: الـ API بياخد الـ Id في الـ body عشان يعرف أي مريض يعدّل.
/// </summary>
public sealed class PatientUpdateRequest
{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? MaritalStatus { get; set; }
}