namespace Balancy.Models
{
    public class ForgotPasswordApiResponse
    {
        public string Message { get; set; } = string.Empty;
        public string ResetToken { get; set; } = string.Empty;
    }
}
