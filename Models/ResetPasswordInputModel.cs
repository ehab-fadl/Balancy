using System.ComponentModel.DataAnnotations;

namespace Balancy.Models
{
    public class ResetPasswordInputModel
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;

        [Required, Compare("NewPassword", ErrorMessage = "كلمات المرور غير متطابقة")]
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
