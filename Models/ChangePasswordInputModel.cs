using System.ComponentModel.DataAnnotations;

namespace Balancy.Models
{
    public class ChangePasswordInputModel
    {
        [Required(ErrorMessage = "كلمة المرور القديمة مطلوبة")]
        [DataType(DataType.Password)]
        public string OldPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "كلمة المرور الجديدة مطلوبة")]
        [DataType(DataType.Password)]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "تأكيد كلمة المرور مطلوب")]
        [DataType(DataType.Password)]
        [Compare("NewPassword", ErrorMessage = "كلمة المرور الجديدة وتأكيدها غير متطابقين")]
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
