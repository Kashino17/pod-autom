import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@src/contexts/AuthContext'
import { SubscriptionProvider } from '@src/contexts/SubscriptionContext'
import { ToastContainer } from '@src/components/ui/Toast'
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from '@src/components/ProtectedRoute'
import { ErrorBoundary } from '@src/components/ErrorBoundary'

// =====================================================
// LOADING FALLBACK
// =====================================================

function PageLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Lädt...</span>
      </div>
    </div>
  )
}

// =====================================================
// LAZY LOADED PAGES
// =====================================================

// Public Pages
const Landing = lazy(() => import('@src/pages/Landing'))
const Catalog = lazy(() => import('@src/pages/Catalog'))

// Auth Pages
const Login = lazy(() => import('@src/pages/Login'))
const Register = lazy(() => import('@src/pages/Register'))
const ForgotPassword = lazy(() => import('@src/pages/ForgotPassword'))
const VerifyEmail = lazy(() => import('@src/pages/VerifyEmail'))
const AuthCallback = lazy(() => import('@src/pages/AuthCallback'))
const ResetPassword = lazy(() => import('@src/pages/ResetPassword'))

// Dashboard Pages
const Dashboard = lazy(() => import('@src/pages/Dashboard'))
const DashboardNiches = lazy(() => import('@src/pages/DashboardNiches'))
const DashboardPrompts = lazy(() => import('@src/pages/DashboardPrompts'))
const DashboardProducts = lazy(() => import('@src/pages/DashboardProducts'))
const DashboardWinners = lazy(() => import('@src/pages/DashboardWinners'))
const DashboardCampaigns = lazy(() => import('@src/pages/DashboardCampaigns'))
const DashboardDesigns = lazy(() => import('@src/pages/DashboardDesigns'))
const DashboardAnalytics = lazy(() => import('@src/pages/DashboardAnalytics'))

// Other Protected Pages
const Onboarding = lazy(() => import('@src/pages/Onboarding'))
const Settings = lazy(() => import('@src/pages/Settings'))
const Help = lazy(() => import('@src/pages/Help'))

// Admin Pages
const AdminPanel = lazy(() => import('@src/pages/AdminPanel'))

// Checkout Pages
const Checkout = lazy(() => import('@src/pages/Checkout'))
const CheckoutSuccess = lazy(() => import('@src/pages/CheckoutSuccess'))
const CheckoutCancel = lazy(() => import('@src/pages/CheckoutCancel'))

// Pricing Page
const Pricing = lazy(() => import('@src/pages/Pricing'))

// =====================================================
// STATIC PAGES (small, no need for lazy loading)
// =====================================================

function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gradient mb-4">404</h1>
        <p className="text-zinc-400 mb-8">Seite nicht gefunden</p>
        <a href="/" className="btn-primary">Zur Startseite</a>
      </div>
    </div>
  )
}

// =====================================================
// QUERY CLIENT
// =====================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// =====================================================
// APP COMPONENT
// =====================================================

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AuthProvider>
            <SubscriptionProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/katalog" element={<Catalog />} />

                {/* Auth Routes (redirect if logged in) */}
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <Register />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicOnlyRoute>
                      <ForgotPassword />
                    </PublicOnlyRoute>
                  }
                />

                {/* Auth Callback (OAuth & Email Verification) */}
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/niches"
                  element={
                    <ProtectedRoute>
                      <DashboardNiches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/prompts"
                  element={
                    <ProtectedRoute>
                      <DashboardPrompts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/products"
                  element={
                    <ProtectedRoute>
                      <DashboardProducts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/winners"
                  element={
                    <ProtectedRoute>
                      <DashboardWinners />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/campaigns"
                  element={
                    <ProtectedRoute>
                      <DashboardCampaigns />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/designs"
                  element={
                    <ProtectedRoute>
                      <DashboardDesigns />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/analytics"
                  element={
                    <ProtectedRoute>
                      <DashboardAnalytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/help"
                  element={
                    <ProtectedRoute>
                      <Help />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminPanel />
                    </AdminRoute>
                  }
                />

                {/* Checkout Routes */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/success"
                  element={
                    <ProtectedRoute>
                      <CheckoutSuccess />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/cancel"
                  element={<CheckoutCancel />}
                />

                {/* Catch-all */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>

              {/* Toast Container */}
              <ToastContainer />
            </SubscriptionProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
