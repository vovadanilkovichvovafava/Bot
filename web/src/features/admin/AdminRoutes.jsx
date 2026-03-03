import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext'
import AdminLayout from './components/AdminLayout'

// Lazy load all admin pages — each becomes a separate chunk
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminRegister = lazy(() => import('./pages/AdminRegister'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminPredictions = lazy(() => import('./pages/AdminPredictions'))
const AdminChats = lazy(() => import('./pages/AdminChats'))
const AdminML = lazy(() => import('./pages/AdminML'))
const AdminPro = lazy(() => import('./pages/AdminPro'))
const AdminFunnels = lazy(() => import('./pages/AdminFunnels'))
const AdminTraffic = lazy(() => import('./pages/AdminTraffic'))
const AdminTeam = lazy(() => import('./pages/AdminTeam'))

function AdminProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth()
  if (loading) return <AdminSplash />
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return children
}

function AdminGuestRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth()
  if (loading) return <AdminSplash />
  if (isAuthenticated) return <Navigate to="/admin" replace />
  return children
}

function AdminSplash() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<AdminSplash />}>
        <Routes>
          <Route path="login" element={<AdminGuestRoute><AdminLogin /></AdminGuestRoute>} />
          <Route path="registration" element={<AdminRegister />} />
          <Route path="" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="predictions" element={<AdminPredictions />} />
            <Route path="chats" element={<AdminChats />} />
            <Route path="ml" element={<AdminML />} />
            <Route path="pro" element={<AdminPro />} />
            <Route path="funnels" element={<AdminFunnels />} />
            <Route path="traffic" element={<AdminTraffic />} />
            <Route path="team" element={<AdminTeam />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminAuthProvider>
  )
}
