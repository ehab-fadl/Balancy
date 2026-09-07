using System.Net;
using System.Net.Mail;

namespace Balancy.Services
{
    public interface IEmailService
    {
        Task SendVerificationCodeEmailAsync(string email, string code);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendVerificationCodeEmailAsync(string email, string code)
        {
            var senderEmail = "ehab.a.fadl@gmail.com";
            var senderPassword = "cvwegkfekdaoiorl"; // ضع الـ 16 حرفاً هنا بدون مسافات
            var smtpHost = "smtp.gmail.com";
            var smtpPort = 587;

            using var message = new MailMessage();
            message.From = new MailAddress(senderEmail, "منصة بالنسي");
            message.To.Add(email);
            message.Subject = "رمز إعادة تعيين كلمة المرور";
            message.Body = $"مرحباً،\n\nرمز التحقق الخاص بك لإعادة تعيين كلمة المرور هو: {code}\n\nينتهي هذا الرمز خلال 10 دقائق.";
            message.IsBodyHtml = false;

            using var smtpClient = new SmtpClient(smtpHost, smtpPort);
            smtpClient.Credentials = new NetworkCredential(senderEmail, senderPassword);
            smtpClient.EnableSsl = true;

            await smtpClient.SendMailAsync(message);
        }
    }
}