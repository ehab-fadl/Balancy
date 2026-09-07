namespace Balancy.DTOs
{
    public class UserDeactivatedDto
    {
        public string FullName { get; set; } = "مستخدم النظام";
        public string Email { get; set; } = string.Empty;
        public string ProfilePicture => $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(FullName)}&background=0891b2&color=fff&size=128&font-size=0.4&rounded=12";
    }
}
