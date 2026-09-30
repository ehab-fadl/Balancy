using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Balancy.Areas.Doctor.Pages
{
    public class PatientDetailsModel : PageModel
    {
        public int? Id { get; set; }

        public void OnGet(int? id)
        {
            Id = id;
        }
    }
}