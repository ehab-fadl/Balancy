using System.ComponentModel.DataAnnotations;

namespace Balancy.DTOs
{
    public class AssignRoleDto
    {
        public string UserId { get; set; } = string.Empty;

        [Required(ErrorMessage = "يرجى اختيار الدور")]
        public string RoleName { get; set; } = string.Empty;
    }
}
