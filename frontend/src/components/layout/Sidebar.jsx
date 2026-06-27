import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Receipt,
  CalendarDays,
  Banknote,
  Settings,
  LogOut,
  UtensilsCrossed,
  BookOpen,
  Lock,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import logo from '@/assets/icon.png'

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sections = [
    {
      title: "Navigation",
      items: [
        { name: "Dashboard", path: "/", icon: LayoutDashboard }
      ]
    },
    {
      title: "Stocks",
      items: [
        { name: "Mouvements de Stock", path: "/stock/movements", icon: Package },
        { name: "Catalogue Produits", path: "/stock/products", icon: Tag }
      ]
    },
    {
      title: "Achats & Finances",
      items: [
        { name: "Achats Fournisseurs", path: "/purchases", icon: ShoppingCart },
        { name: "Charges Fixes & CA", path: "/expenses", icon: Receipt }
      ]
    },
    {
      title: "Ressources Humaines",
      items: [
        { name: "Personnel", path: "/hr/personnel", icon: Users },
        { name: "Planning", path: "/hr/planning", icon: CalendarDays },
        { name: "Masse Salariale", path: "/hr/salaries", icon: Banknote }
      ]
    }
  ]

  return (
    <aside className={cn(
      "bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-20 transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        className="absolute top-6 -right-3 h-6 w-6 rounded-full border border-slate-700 bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-slate-800 transition-all z-30 animate-in fade-in zoom-in"
        title={collapsed ? "Déplier la barre" : "Replier la barre"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header / Brand */}
      <div className={cn(
        "p-5 border-b border-slate-800 flex items-center transition-all duration-300",
        collapsed ? "justify-center" : "space-x-3"
      )}>
        <img src={logo} alt="Eco-Park Logo" className="h-10 w-10 rounded-xl object-cover border border-emerald-500/30 shadow-md shadow-emerald-950/20 shrink-0" />
        {!collapsed && (
          <div className="transition-all duration-300 opacity-100 whitespace-nowrap">
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Eco-Park</h1>
            <p className="text-xs text-slate-400">MANAGEMENT SYSTEM</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-2">
            {collapsed ? (
              <div className="border-t border-slate-800/60 my-4" />
            ) : (
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-3 block mb-2">
                {section.title}
              </span>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      title={collapsed ? item.name : undefined}
                      className={({ isActive }) => cn(
                        "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                        collapsed ? "justify-center h-10 w-10 mx-auto" : "space-x-3 px-3 py-2.5",
                        isActive
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/20"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      )}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Admin Links — pinned just above sign-out */}
      {user?.role === 'admin' && (
        <div className="px-4 pb-3 border-t border-slate-800/60 pt-3">
          {collapsed ? (
            <div className="border-t border-slate-800/60 my-4 flex justify-center text-amber-500/60 py-1" title="Administration">
              <Lock size={12} />
            </div>
          ) : (
            <p className="text-[10px] font-bold tracking-wider text-amber-500/60 uppercase px-1 mb-2 flex items-center gap-1.5">
              <Lock size={9} />
              Administration
            </p>
          )}
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/admin/users"
                title={collapsed ? "Gestion Utilisateurs" : undefined}
                className={({ isActive }) => cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center h-10 w-10 mx-auto" : "space-x-3 px-3 py-2.5",
                  isActive
                    ? "bg-amber-600/80 text-white shadow-lg shadow-amber-950/30"
                    : "text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10"
                )}
              >
                <Users size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">Gestion Utilisateurs</span>}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/documentation"
                title={collapsed ? "Centre de Documentation" : undefined}
                className={({ isActive }) => cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center h-10 w-10 mx-auto" : "space-x-3 px-3 py-2.5",
                  isActive
                    ? "bg-amber-600/80 text-white shadow-lg shadow-amber-950/30"
                    : "text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10"
                )}
              >
                <BookOpen size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">Centre de Documentation</span>}
              </NavLink>
            </li>
          </ul>
        </div>
      )}

      {/* User Footer */}
      <div className={cn(
        "p-4 border-t border-slate-800 bg-slate-950/40 flex transition-all duration-300",
        collapsed ? "flex-col items-center gap-4" : "items-center justify-between"
      )}>
        <div className={cn("flex min-w-0", collapsed ? "justify-center" : "items-center space-x-3")}>
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold uppercase shrink-0">
            {(user?.name || user?.username || 'Gérant').substring(0, 2)}
          </div>
          {!collapsed && (
            <div className="min-w-0 transition-all duration-300">
              <p className="text-xs font-semibold text-slate-200 truncate capitalize">{user?.name || user?.username || 'Gérant'}</p>
              <p className="text-[10px] text-slate-500 truncate">Administrateur</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800/80 transition-colors shrink-0"
          title="Se déconnecter"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
