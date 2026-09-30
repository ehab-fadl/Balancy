using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages
{
    public class StatisticsModel : PageModel
    {
        public int? PatientId { get; set; }
        public string? PatientName { get; set; }

        public void OnGet(int? patientId, string? patientName)
        {
            PatientId = patientId;
            PatientName = patientName;
        }
    }
}