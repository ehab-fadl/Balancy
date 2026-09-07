using Balancy.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.IdentityModel.Tokens.Jwt; // 1. أضف هذا الاستخدام في الأعلى

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login";
        options.AccessDeniedPath = "/AccessDenied";
    });

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminPolicy", policy => policy.RequireRole("Admin"));
    options.AddPolicy("SearcherPolicy", policy => policy.RequireRole("Searcher"));
    options.AddPolicy("DoctorPolicy", policy => policy.RequireRole("Doctor"));
    options.AddPolicy("NullUserPolicy", policy => policy.RequireRole("NullUser"));
});

builder.Services.AddTransient<Balancy.Services.IEmailService, Balancy.Services.EmailService>();
builder.Services.AddMemoryCache(); // لتخزين الرمز مؤقتاً

// 2. تسجيل الـ Handler
builder.Services.AddTransient<JwtTokenHandler>();

// 3. إعداد HttpClient مخصص يتضمن التوكن تلقائياً مع كل طلب للباك إند
builder.Services.AddHttpClient("BackendApi", client =>
{
    client.BaseAddress = new Uri("http://192.168.0.16:5000/"); // رابط الباك إند الخاص بك
})
.AddHttpMessageHandler<JwtTokenHandler>();

builder.Services.AddSingleton<IAuditLogService, AuditLogService>();
builder.Services.AddHttpContextAccessor();

// 3. تطبيق السياسات على مجلدات الـ Areas
builder.Services.AddRazorPages(options =>
{
    options.Conventions.AuthorizeAreaFolder("Admin", "/", "AdminPolicy");
    options.Conventions.AuthorizeAreaFolder("Searcher", "/", "SearcherPolicy");
    options.Conventions.AuthorizeAreaFolder("Doctor", "/", "DoctorPolicy");
    options.Conventions.AuthorizeAreaFolder("NullUser", "/", "NullUserPolicy");
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

// 5. يجب أن تكون Authentication قبل Authorization بالترتيب تماماً
app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages()
   .WithStaticAssets();

app.Run();