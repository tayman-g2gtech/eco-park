import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

// Context & Hooks
import { AuthProvider, useAuth } from '@/hooks/useAuth'

// Layout Components
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import StaffLayout from '@/components/layout/StaffLayout'

// Page Components
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import StockMovements from '@/pages/stock/StockMovements'
import Products from '@/pages/stock/Products'
import PurchaseList from '@/pages/purchases/PurchaseList'
import Expenses from '@/pages/expenses/Expenses'
import Personnel from '@/pages/hr/Personnel'
import Planning from '@/pages/hr/Planning'
import Salaries from '@/pages/hr/Salaries'
import SettingsPage from '@/pages/Settings'
import Documentation from '@/pages/admin/Documentation'
import UserManagement from '@/pages/admin/UserManagement'
import StaffPlanningView from '@/pages/staff/StaffPlanningView'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// ─── Admin Layout (full sidebar) ─────────────────────────────────────────────
function AppLayout() {
  const { user, loading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-semibold tracking-wide text-slate-400">Démarrage d'Eco-Park Management System...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  // Staff users must go through their own layout
  if (user.role === 'staff') return <Navigate to="/staff/planning" replace />

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'pl-20' : 'pl-64'}`}>
        <TopBar />
        <main className="flex-1 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ─── Staff Layout wrapper ─────────────────────────────────────────────────────
function StaffAppLayout() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'staff') return <Navigate to="/" replace />

  return <StaffLayout />
}

// ─── Public Route ─────────────────────────────────────────────────────────────
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (user) {
    // Redirect based on role after login
    return <Navigate to={user.role === 'staff' ? '/staff/planning' : '/'} replace />
  }

  return children
}

// ─── Admin-only Route guard ───────────────────────────────────────────────────
function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* ── Staff Routes (minimal layout) ── */}
            <Route element={<StaffAppLayout />}>
              <Route path="/staff/planning" element={<StaffPlanningView />} />
            </Route>

            {/* ── Admin / Gérant Routes (full layout) ── */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stock/movements" element={<StockMovements />} />
              <Route path="/stock/products" element={<Products />} />
              <Route path="/purchases" element={<PurchaseList />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/hr/personnel" element={<Personnel />} />
              <Route path="/hr/planning" element={<Planning />} />
              <Route path="/hr/salaries" element={<Salaries />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Admin-only Routes */}
              <Route
                path="/admin/documentation"
                element={
                  <RequireAdmin>
                    <Documentation />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequireAdmin>
                    <UserManagement />
                  </RequireAdmin>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>

        <Toaster richColors position="top-right" theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  )
}
