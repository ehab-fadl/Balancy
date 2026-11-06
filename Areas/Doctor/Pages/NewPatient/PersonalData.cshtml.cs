using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages.NewPatient;

public class PersonalDataModel : PageModel
{
    /// <summary>
    /// إذا فارغ → إضافة مريض جديد. إذا فيه قيمة → تعديل مريض موجود.
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? PatientId { get; set; }

    public bool IsEdit => !string.IsNullOrEmpty(PatientId);

    public void OnGet(string? id = null)
    {
        PatientId = id;
    }
}