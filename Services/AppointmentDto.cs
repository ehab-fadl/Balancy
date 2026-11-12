namespace Balancy.Services;

public sealed class AppointmentCreateRequest
{
    public Guid PatientId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public string ScheduledTime { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? VisitType { get; set; }
    public string? VisitLocation { get; set; }
}