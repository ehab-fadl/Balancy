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

// 2. تسجيل الـ Handlers
builder.Services.AddTransient<JwtTokenHandler>();
builder.Services.AddTransient<PatientHeaderHandler>();   // ✅ جديد: يضيف X-Doctor-Id

// 3. إعداد HttpClient مخصص يتضمن التوكن تلقائياً مع كل طلب للباك إند (الخدمة القديمة - 5000)
builder.Services.AddHttpClient("BackendApi", client =>
{
    client.BaseAddress = new Uri("http://192.168.0.16:5000/"); // رابط الباك إند الخاص بك
})
.AddHttpMessageHandler<JwtTokenHandler>();

// 4. إضافة HttpClient جديد لخدمة Balancy Patient Service (البورت 5002)
//    هذه الخدمة تتطلب ترويسة X-Doctor-Id (وليس Bearer JWT)
builder.Services.AddHttpClient("BalancyPatientApi", client =>
{
    client.BaseAddress = new Uri("http://192.168.0.16:5002/");
    client.Timeout = TimeSpan.FromSeconds(60); // مهلة أطول للـ ETL والتقارير
})
.AddHttpMessageHandler<PatientHeaderHandler>();          // ✅ يستخدم X-Doctor-Id

builder.Services.AddSingleton<IAuditLogService, AuditLogService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IPatientApiClient, PatientApiClient>();

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