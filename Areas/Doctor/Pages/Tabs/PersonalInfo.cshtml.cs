using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages.Tabs;

public class PersonalInfoModel : PageModel
{
    /// <summary>معرّف المريض (GUID) القادم من الرابط.</summary>
    public string? PatientId { get; set; }

    public void OnGet(string? patientId = null)
    {
        PatientId = patientId;
    }
}