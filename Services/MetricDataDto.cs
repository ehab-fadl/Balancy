namespace Balancy.Services;

/// <summary>يطابق MetricDataDto في الباك إند (للقراءة).</summary>
public sealed class MetricData
{
    public string Date { get; set; } = string.Empty;
    public int Food { get; set; }
    public decimal Sleep { get; set; }
    public int Medication { get; set; }
    public int Mood { get; set; }
    public int Negative { get; set; }
    public int Health { get; set; }
    public int Energy { get; set; }
    public int Motivation { get; set; }
    public int Concentration { get; set; }
    public int Guilt { get; set; }
    public int Hope { get; set; }
    public int Suicidal { get; set; }
}