using System.ComponentModel.DataAnnotations;

namespace Balancy.DTOs
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "الاسم الأول مطلوب.")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "الاسم الأخير مطلوب.")]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "البريد الإلكتروني مطلوب.")]
        [EmailAddress(ErrorMessage = "صيغة البريد الإلكتروني غير صالحة.")]
        public string Email { get; set; } = string.Empty; // تم تصحيح النقطة إلى فاصلة منقوطة

        [Required(ErrorMessage = "كلمة المرور مطلوبة.")]
        [MinLength(8, ErrorMessage = "كلمة المرور يجب أن تكون 8 أحرف على الأقل.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "تأكيد كلمة المرور مطلوب.")]
        [Compare("Password", ErrorMessage = "كلمتا المرور غير متطابقتين.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "رقم الهاتف مطلوب.")]
        public string PhoneNumber { get; set; } = string.Empty;
    }
}
