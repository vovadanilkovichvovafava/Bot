import { Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
            OP
          </div>
          <span className="font-semibold text-sm hidden sm:block">Ops Panel</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{admin?.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded">
            {admin?.role}
          </span>
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
