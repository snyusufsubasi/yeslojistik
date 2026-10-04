/**
 * Abonelik ekranındaki satıcı bilgileri ve paket tablosu: TEK YER.
 * DİKKAT: aşağıdaki iletişim bilgileri YER TUTUCUDUR. "Kim satacak?" kararı verilince (docs/SATIS-PLANI.md, karar 1) gerçek bilgiyle değiştirin.
 */
export const SUPPORT_EMAIL = 'destek@ORNEK-FIRMA.com' // YER TUTUCU: gerçek destek e-postasıyla değiştirin
export const SUPPORT_PHONE = '0 (000) 000 00 00' // YER TUTUCU: gerçek destek telefonuyla değiştirin

export interface PlanRow {
  /** Sunucudaki paket kodu (lisans anahtarındaki plan). */
  code: 'Baslangic' | 'Standart' | 'Profesyonel' | 'Kurumsal'
  name: string
  vehicles: string
  /** KDV hariç aylık; null = teklif. Kaynak: docs/SATIS-PLANI.md bölüm 4 (pilotta kesinleşir). */
  monthlyTl: number | null
  includes: string
}

export const PLANS: PlanRow[] = [
  { code: 'Baslangic', name: 'Başlangıç', vehicles: '5 araca kadar', monthlyTl: 990, includes: 'Sevkiyat, cari, fatura, tahsilat, şoför uygulaması' },
  { code: 'Standart', name: 'Standart', vehicles: '20 araca kadar', monthlyTl: 2490, includes: 'Başlangıç + e-Fatura, UETDS, raporlar, toplu işlem' },
  { code: 'Profesyonel', name: 'Profesyonel', vehicles: '50 araca kadar', monthlyTl: 4990, includes: 'Standart + GPS bağlantısı, müşteri portalı, öncelikli destek' },
  { code: 'Kurumsal', name: 'Kurumsal', vehicles: '50 araçtan fazla', monthlyTl: null, includes: 'Profesyonel + özel bağlantılar, ayrı sunucu' },
]
