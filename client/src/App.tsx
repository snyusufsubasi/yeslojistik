import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { useAuth, type Permission } from './lib/auth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

const TripsPage = lazy(() => import('./pages/TripsPage'))
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'))
const DriversPage = lazy(() => import('./pages/DriversPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'))
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'))
const InvoiceCreatePage = lazy(() => import('./pages/InvoiceCreatePage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const PublicTrackingPage = lazy(() => import('./pages/PublicTrackingPage'))

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner className="h-screen items-center" />
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

function Guard({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const { can } = useAuth()
  return can(perm) ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/giris" element={<LoginPage />} />
        <Route path="/takip/:token" element={<PublicTrackingPage />} />
        <Route element={<RequireAuth />}>
          <Route index element={<DashboardPage />} />
          <Route path="seferler" element={<TripsPage />} />
          <Route path="araclar" element={<VehiclesPage />} />
          <Route path="harita" element={<MapPage />} />
          <Route path="soforler" element={<DriversPage />} />
          <Route path="musteriler" element={<CustomersPage />} />
          <Route path="musteriler/:id" element={<CustomerDetailPage />} />
          <Route path="faturalar" element={<InvoicesPage />} />
          <Route path="faturalar/yeni" element={<Guard perm="accounting"><InvoiceCreatePage /></Guard>} />
          <Route path="tahsilatlar" element={<PaymentsPage />} />
          <Route path="giderler" element={<ExpensesPage />} />
          <Route path="raporlar" element={<Guard perm="accounting"><ReportsPage /></Guard>} />
          <Route path="ayarlar" element={<SettingsPage />} />
          <Route path="yardim" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
