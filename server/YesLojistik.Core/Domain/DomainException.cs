namespace YesLojistik.Core.Domain;

/// <summary>İş kuralı ihlali. API katmanında 400 olarak döner, mesaj kullanıcıya gösterilir.</summary>
public class DomainException(string message) : Exception(message);

public class NotFoundException(string message = "Kayıt bulunamadı.") : Exception(message);
