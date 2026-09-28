using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using YesLojistik.Api.Auth;
using YesLojistik.Api.Infrastructure;
using YesLojistik.Core.Abstractions;
using YesLojistik.Core.Entities;
using YesLojistik.Core.Validation;
using YesLojistik.Infrastructure;
using YesLojistik.Infrastructure.Data;
using YesLojistik.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration).WriteTo.Console());

// --- Veritabanı ve servisler ---
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default ayarlanmamış.");
builder.Services.AddInfrastructure(connectionString, builder.Configuration["Storage:Path"] ?? "data/uploads");
builder.Services.AddHostedService<LocationRetentionService>();
builder.Services.AddSingleton(builder.Configuration.GetSection("Smtp").Get<SmtpOptions>() ?? new SmtpOptions());
builder.Services.AddSingleton<YesLojistik.Core.Abstractions.IEmailSender, SmtpEmailSender>();
if (!builder.Configuration.GetValue("Push:Enabled", true))
    builder.Services.AddSingleton<YesLojistik.Core.Abstractions.IPushSender, YesLojistik.Infrastructure.Services.NullPushSender>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddExceptionHandler<ExceptionHandler>();
builder.Services.AddProblemDetails();

// --- Kimlik doğrulama: JWT, httpOnly cookie içinde ---
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Key.Length < 32)
    throw new InvalidOperationException("Jwt:Key en az 32 karakter olmalı (ortam değişkeni: Jwt__Key).");
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = jwt.Issuer,
        ValidAudience = jwt.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        ClockSkew = TimeSpan.FromSeconds(30),
        NameClaimType = System.Security.Claims.ClaimTypes.Name,
        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
    };
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            ctx.Token ??= ctx.Request.Cookies[TokenService.AccessCookie];
            return Task.CompletedTask;
        },
    };
});
builder.Services.AddAuthorizationBuilder()
    // Özel bir [Authorize] belirtilmeyen tüm uç noktalar yalnızca ofis kullanıcılarına açıktır (şoförler hariç).
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().RequireRole(Policies.StaffRoles).Build())
    .AddPolicy(Policies.Operations, p => p.RequireRole(Policies.OperationsRoles))
    .AddPolicy(Policies.Accounting, p => p.RequireRole(Policies.AccountingRoles))
    .AddPolicy(Policies.Admin, p => p.RequireRole(nameof(UserRole.Admin)));

// --- Giriş denemesi sınırı: IP başına dakikada 10 (RateLimit:LoginPerMinute) ---
var loginLimit = builder.Configuration.GetValue("RateLimit:LoginPerMinute", 10);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = loginLimit, Window = TimeSpan.FromMinutes(1) }));
    // Herkese açık takip sayfası: IP başına dakikada 60 istek.
    o.AddPolicy("public", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 60, Window = TimeSpan.FromMinutes(1) }));
    o.OnRejected = async (ctx, ct) =>
        await ctx.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = 429, Title = "Çok fazla giriş denemesi. Lütfen bir dakika sonra tekrar deneyin.",
        }, ct);
});

builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
if (corsOrigins.Length > 0)
    builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<CustomerSaveRequestValidator>();
ValidatorOptions.Global.PropertyNameResolver = (_, member, _) =>
    member == null ? null : char.ToLowerInvariant(member.Name[0]) + member.Name[1..];
builder.Services.Configure<ApiBehaviorOptions>(o => o.InvalidModelStateResponseFactory = ctx =>
{
    var problem = new ValidationProblemDetails(ctx.ModelState) { Title = "Lütfen formdaki hataları düzeltin.", Status = 400 };
    return new BadRequestObjectResult(problem);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// --- Migration ve ilk veriler ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var seed = app.Configuration.GetSection("Seed");
    var adminPassword = seed["AdminPassword"];
    if (!string.IsNullOrEmpty(adminPassword))
        await DbSeeder.SeedAdminAsync(db, seed["AdminEmail"] ?? "admin@yeslojistik.com", adminPassword, seed["AdminName"] ?? "Yönetici");
    else if (!await db.Users.AnyAsync())
        app.Logger.LogWarning("Hiç kullanıcı yok. İlk yöneticiyi oluşturmak için Seed__AdminPassword ortam değişkenini ayarlayın.");

    if (seed.GetValue<bool>("SampleData"))
        await DbSeeder.SeedSampleDataAsync(db, scope.ServiceProvider.GetRequiredService<InvoiceService>());
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseSerilogRequestLogging();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
if (corsOrigins.Length > 0) app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", async (AppDbContext db) =>
    await db.Database.CanConnectAsync() ? Results.Ok(new { status = "ok" }) : Results.StatusCode(503)).AllowAnonymous();
app.MapControllers();

app.Run();

public partial class Program;
