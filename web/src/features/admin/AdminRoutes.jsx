import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext'
import AdminLayout from './components/AdminLayout'
import AdminLogin from './pages/AdminLogin'
import AdminRegister from './pages/AdminRegister'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminPredictions from './pages/AdminPredictions'
import AdminChats from './pages/AdminChats'
import AdminML from './pages/AdminML'
import AdminPro from './pages/AdminPro'
import AdminTraffic from './pages/AdminTraffic'
import AdminTeam from './pages/AdminTeam'

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
          <Route path="traffic" element={<AdminTraffic />} />
          <Route path="team" element={<AdminTeam />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  )
}
