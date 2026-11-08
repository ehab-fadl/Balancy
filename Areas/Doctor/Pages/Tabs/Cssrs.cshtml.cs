using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages.Tabs;

public class CssrsModel : PageModel
{
    public string? PatientId { get; set; }

    public void OnGet(string? patientId = null)
    {
        PatientId = patientId;
    }
}