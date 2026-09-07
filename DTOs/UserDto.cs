namespace Balancy.DTOs
{
    // نموذج تمثيل بيانات المستخدم القادمة من الباك إند[cite: 3]
    public class UserDto
    {
        public string Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string Role { get; set; }
        public bool IsActive { get; set; }
    }
}
