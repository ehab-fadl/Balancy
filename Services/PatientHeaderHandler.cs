using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Balancy.Services;

/// <summary>
/// يضيف X-Doctor-Id لكل طلب رايح لخدمة Balancy Patient Service (5002).
/// الـ DoctorId مصدره:
///   1) claim مباشر باسم DoctorId / doctorId ...
///   2) أو الـ 'sub' من داخل JWT محفوظ في claim اسمه AccessToken.
/// </summary>
public sealed class PatientHeaderHandler : DelegatingHandler
{
    private const string HeaderName = "X-Doctor-Id";
    private const string AccessTokenClaim = "AccessToken";

    private readonly IHttpContextAccessor _httpContext;
    private readonly ILogger<PatientHeaderHandler> _logger;

    public PatientHeaderHandler(
        IHttpContextAccessor httpContext,
        ILogger<PatientHeaderHandler> logger)
    {
        _httpContext = httpContext;
        _logger = logger;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var doctorId = ResolveDoctorId();

        if (!string.IsNullOrWhiteSpace(doctorId))
        {
            request.Headers.Remove(HeaderName);
            request.Headers.TryAddWithoutValidation(HeaderName, doctorId);
            _logger.LogInformation(
                "✅ إرسال X-Doctor-Id={DoctorId} إلى {Uri}",
                doctorId, request.RequestUri);
        }
        else
        {
            _logger.LogWarning(
                "⚠️ لم يتم العثور على DoctorId — الطلب إلى {Uri} سيُرجع 401",
                request.RequestUri);
        }

        return base.SendAsync(request, cancellationToken);
    }

    private string? ResolveDoctorId()
    {
        var user = _httpContext.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            _logger.LogWarning("المستخدم غير مُصادَق");
            return null;
        }

        // 1) claim مباشر (لو موجود)
        var direct =
            user.FindFirst("DoctorId")?.Value
            ?? user.FindFirst("doctorId")?.Value
            ?? user.FindFirst("doctor_id")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("nameid")?.Value;

        if (Guid.TryParse(direct, out _))
        {
            _logger.LogInformation("DoctorId من claim مباشر");
            return direct;
        }

        // 2) من داخل الـ AccessToken (JWT) — هذا هو المصدر الفعلي عندك
        var accessToken = user.FindFirst(AccessTokenClaim)?.Value;
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            _logger.LogWarning("لا يوجد claim '{Claim}' في الكوكيز", AccessTokenClaim);
            return null;
        }

        try
        {
            var handler = new JwtSecurityTokenHandler();
            if (!handler.CanReadToken(accessToken))
            {
                _logger.LogWarning("قيمة claim '{Claim}' ليست JWT صالح", AccessTokenClaim);
                return null;
            }

            var jwt = handler.ReadJwtToken(accessToken);

            // sub هو اللي فيه الـ DoctorId في التوكن بتاعك
            var sub =
                jwt.Claims.FirstOrDefault(c => c.Type == "sub")?.Value
                ?? jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value
                ?? jwt.Claims.FirstOrDefault(c => c.Type == "nameid")?.Value
                ?? jwt.Claims.FirstOrDefault(c => c.Type == "doctorId")?.Value
                ?? jwt.Claims.FirstOrDefault(c => c.Type == "DoctorId")?.Value;

            if (Guid.TryParse(sub, out _))
            {
                _logger.LogInformation("تم استخراج DoctorId من JWT claim 'sub'");
                return sub;
            }

            _logger.LogWarning("JWT لا يحتوي على GUID صالح في sub/nameid/doctorId");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "فشل قراءة الـ AccessToken");
            return null;
        }
    }
}