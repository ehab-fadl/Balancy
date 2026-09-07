using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace Balancy.Services
{
    public class JwtTokenHandler : DelegatingHandler
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ITempDataDictionaryFactory _tempDataFactory;

        public JwtTokenHandler(IHttpContextAccessor httpContextAccessor, ITempDataDictionaryFactory tempDataFactory)
        {
            _httpContextAccessor = httpContextAccessor;
            _tempDataFactory = tempDataFactory;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var token = _httpContextAccessor.HttpContext?.User?.Claims
                .FirstOrDefault(c => c.Type == "AccessToken")?.Value;

            if (!string.IsNullOrEmpty(token))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }

            try
            {
                return await base.SendAsync(request, cancellationToken);
            }
            catch (Exception)
            {
                // إذا وجدنا HttpContext، يمكننا حقن رسالة خطأ موحدة لتظهر في أي صفحة تقوم بالطلب
                if (_httpContextAccessor.HttpContext != null)
                {
                    var tempData = _tempDataFactory.GetTempData(_httpContextAccessor.HttpContext);
                    tempData["ConnectionError"] = "عذراً، انقطع الاتصال بالخادم. يرجى التحقق من عمل السيرفر والمحاولة لاحقاً.";
                }

                return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
                {
                    Content = new StringContent("Server is offline")
                };
            }
        }
    }
}