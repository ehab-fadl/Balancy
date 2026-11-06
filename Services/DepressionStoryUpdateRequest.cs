namespace Balancy.Services;

/// <summary>
/// الـ DTO المتوقع لـ PUT /api/DepressionStory.
/// الـ API بيولّد نسخة جديدة تلقائياً عند كل تحديث.
/// </summary>
public sealed class DepressionStoryUpdateRequest
{
    public string PatientId { get; set; } = string.Empty;
    public string Story { get; set; } = string.Empty;
}