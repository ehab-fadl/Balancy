using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages;

public class StatisticsModel : PageModel
{
    public string? PatientId { get; set; }

    public void OnGet(string? id = null, string? patientId = null)
    {
        // يدعم كلا من ?id= و ?patientId=
        PatientId = id ?? patientId;
    }
}