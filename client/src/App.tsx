import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorState, Spinner } from './components/ui'
import { useAuth, type Permission } from './lib/auth'
import LoginPage from './pages/LoginPage'
import { useBranding } from './lib/branding'
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const TodayPage = lazy(() => import('./pages/TodayPage'))

const TripsPage = lazy(() => import('./pages/TripsPage'))
const JobRequestsPage = lazy(() => import('./pages/JobRequestsPage'))
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'))
const DriversPage = lazy(() => import('./pages/DriversPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const CariPage = lazy(() => import('./pages/CariPage'))
const StaffPage = lazy(() => import('./pages/StaffPage'))
const RecurringPaymentsPage = lazy(() => import('./pages/RecurringPaymentsPage'))
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'))
const SupplierPaymentsPage = lazy(() => import('./pages/SupplierPaymentsPage'))
const PurchaseInvoicesPage = lazy(() => import('./pages/PurchaseInvoicesPage'))
const SupplierDetailPage = lazy(() => import('./pages/SupplierDetailPage'))
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'))
const InvoiceCreatePage = lazy(() => import('./pages/InvoiceCreatePage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const FuelPage = lazy(() => import('./pages/FuelPage'))
const VehicleExpensesPage = lazy(() => import('./pages/VehicleExpensesPage'))
const ChecksPage = lazy(() => import('./pages/ChecksPage'))
const CashAccountsPage = lazy(() => import('./pages/CashAccountsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const PublicTrackingPage = lazy(() => import('./pages/PublicTrackingPage'))
const ForgotPasswordPage = lazy(() => import('./pages/PasswordResetPages').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/PasswordResetPages').then((m) => ({ default: m.ResetPasswordPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const AccountDeletionPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.AccountDeletionPage })))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const ImportPage = lazy(() => import('./pages/ImportPage'))

function RequireAuth() {
  const { user, loading, unreachable, retry } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner className="h-screen items-center" />
  if (unreachable) return <ErrorState error={unreachable} onRetry={retry} className="h-screen justify-center" />
  if (!user && location.pathname === '/') return <LandingPage />
  if (!user) return <Navigate to="/giris" replace state={{ from: location.pathname + location.search }} />
  if (user.role === 'Driver') return <DriverNotice />
  return <Layout />
}

function DriverNotice() {
  const { logout } = useAuth()
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-4">
      <div className="card max-w-sm p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-navy-900">Şoför hesabı</h1>
        <p className="mb-4 text-sm text-slate-600">Şoför hesapları web paneli yerine <b>YES Lojistik Şoför</b> mobil uygulamasını kullanır.
          Uygulamaya aynı e-posta ve şifreyle giriş yapabilirsiniz.</p>
        <button className="text-sm font-medium text-brand-600" onClick={logout}>Çıkış yap</button>
      </div>
    </div>
  )
}

/**
 * Girişten sonraki ilk ekran "Bugün" (istisna listesi). Rakam panosu "Genel Bakış" olarak /pano'da durur;
 * yeni görünümdeki "Onay Bekleyenler" sekmesi eski adresinde (`/?tab=approvals`) kalır.
 */
function HomePage() {
  const { search } = useLocation()
  return new URLSearchParams(search).get('tab') === 'approvals' ? <DashboardPage /> : <TodayPage />
}

function Guard({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const { can } = useAuth()
  return can(perm) ? children : <Navigate to="/" replace />
}

export default function App() {
  const { name } = useBranding()
  // Sekme başlığı: sayfalar kendi başlığını yazar; henüz yazmadıysa ürün/firma adı görünür (beyaz etiket).
  useEffect(() => {
    if (document.title.includes('Nakliye Takip Sistemi')) document.title = `${name} – Nakliye Takip Sistemi`
  }, [name])
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/giris" element={<LoginPage />} />
        <Route path="/takip/:token" element={<PublicTrackingPage />} />
        <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
        <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />
        <Route path="/gizlilik" element={<PrivacyPage />} />
        <Route path="/hesap-silme" element={<AccountDeletionPage />} />
        <Route element={<RequireAuth />}>
          <Route index element={<HomePage />} />
          <Route path="pano" element={<DashboardPage />} />
          <Route path="seferler" element={<TripsPage />} />
          <Route path="is-talepleri" element={<JobRequestsPage />} />
          <Route path="araclar" element={<VehiclesPage />} />
          <Route path="harita" element={<MapPage />} />
          <Route path="soforler" element={<DriversPage />} />
          <Route path="musteriler" element={<CustomersPage />} />
          <Route path="musteriler/:id" element={<CustomerDetailPage />} />
          <Route path="cari/musteriler" element={<Guard perm="accounting"><CariPage key="c" kind="customers" /></Guard>} />
          <Route path="cari/tedarikciler" element={<Guard perm="accounting"><CariPage key="s" kind="suppliers" /></Guard>} />
          <Route path="personel" element={<Guard perm="accounting"><StaffPage /></Guard>} />
          <Route path="sabit-odemeler" element={<Guard perm="accounting"><RecurringPaymentsPage /></Guard>} />
          <Route path="tedarikciler" element={<SuppliersPage />} />
          <Route path="tedarikciler/:id" element={<SupplierDetailPage />} />
          <Route path="faturalar" element={<InvoicesPage />} />
          <Route path="faturalar/yeni" element={<Guard perm="accounting"><InvoiceCreatePage /></Guard>} />
          <Route path="tahsilatlar" element={<PaymentsPage />} />
          <Route path="odemeler" element={<SupplierPaymentsPage />} />
          <Route path="alinan-faturalar" element={<PurchaseInvoicesPage />} />
          <Route path="giderler" element={<ExpensesPage />} />
          <Route path="mazotlar" element={<FuelPage />} />
          <Route path="arac-masraflari" element={<VehicleExpensesPage />} />
          <Route path="cek-senet" element={<ChecksPage />} />
          <Route path="kasa-banka" element={<Guard perm="accounting"><CashAccountsPage /></Guard>} />
          <Route path="raporlar" element={<Guard perm="accounting"><ReportsPage /></Guard>} />
          <Route path="ayarlar" element={<SettingsPage />} />
          <Route path="kurulum" element={<Guard perm="admin"><OnboardingPage /></Guard>} />
          <Route path="aktar" element={<ImportPage />} />
          <Route path="yardim" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
