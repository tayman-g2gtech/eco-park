import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, CalendarDays, Leaf } from 'lucide-react'
import logo from '@/assets/icon.png'

export default function StaffLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const POLE_COLORS = {
    'Bar': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    'Caisse': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    'Service': 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
    'Cuisine': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
    'Crep': 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400',
    'PDJ': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
    'Commis': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  }
  const poleColor = POLE_COLORS[user?.pole] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">

      {/* ── Compact Header ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Eco-Park"
              className="h-9 w-9 rounded-xl object-cover border border-emerald-500/30 shadow-sm"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Eco-Park</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Management System</p>
            </div>
          </div>

          {/* Right: User info + logout */}
          <div className="flex items-center gap-3">
            {/* User badge */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">
                {user?.name?.substring(0, 2) || 'ST'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize leading-tight">
                  {user?.name || 'Staff'}
                </p>
                {user?.pole && (
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md ${poleColor}`}>
                    Pôle {user.pole}
                  </span>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-red-500 transition-colors text-xs font-medium py-1.5 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
              title="Se déconnecter"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-3 text-center">
        <p className="text-[11px] text-slate-400">
          Eco-Park Management System — <span className="text-emerald-500">v1.0</span> · G2G Tech
        </p>
      </footer>
    </div>
  )
}
