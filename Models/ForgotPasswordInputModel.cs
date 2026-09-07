using System.ComponentModel.DataAnnotations;

namespace Balancy.Models
{
    public class ForgotPasswordInputModel
    {
        [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
        [EmailAddress(ErrorMessage = "صيغة البريد غير صحيحة")]
        public string Email { get; set; } = string.Empty;
    }
}
