namespace Balancy.Services;

// ===== Plan =====
public sealed class TreatmentPlanCreateRequest
{
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PlanDoctorName { get; set; }
    public string? Notes { get; set; }
}

public sealed class TreatmentPlanUpdateRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PlanDoctorName { get; set; }
    public string? Notes { get; set; }
}

// ===== Problem =====
public sealed class TreatmentProblemCreateRequest
{
    public Guid TreatmentPlanId { get; set; }
    public string Text { get; set; } = string.Empty;
}

public sealed class TreatmentProblemUpdateRequest
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
}

// ===== Goal =====
public sealed class TreatmentGoalCreateRequest
{
    public Guid TreatmentProblemId { get; set; }
    public string Text { get; set; } = string.Empty;
}

public sealed class TreatmentGoalUpdateRequest
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal? Baseline { get; set; }
    public decimal? TargetValue { get; set; }
}

public sealed class TreatmentGoalProgressRequest
{
    public Guid GoalId { get; set; }
    public decimal Value { get; set; }
    public string? Note { get; set; }
}

public sealed class TreatmentGoalAchieveRequest
{
    public Guid GoalId { get; set; }
    public string? Note { get; set; }
}

public sealed class TreatmentGoalUnachieveRequest
{
    public Guid GoalId { get; set; }
}

// ===== Mean =====
public sealed class TreatmentMeanCreateRequest
{
    public Guid TreatmentGoalId { get; set; }
    public string Text { get; set; } = string.Empty;
}

public sealed class TreatmentMeanUpdateRequest
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
}