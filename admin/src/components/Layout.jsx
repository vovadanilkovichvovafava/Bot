import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { admin, logout } = useAuth()

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100">
      {/* Top bar */}
      <header className="bg-dark-900 border-b border-dark-700 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
            OP
          </div>
          <span className="font-semibold text-sm hidden sm:block">Ops Panel</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-dark-400">{admin?.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded">
            {admin?.role}
          </span>
          <button
            onClick={logout}
            className="text-xs text-dark-500 hover:text-red-400 transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav (future) */}
    </div>
  )
}
