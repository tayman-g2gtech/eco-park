import React, { useState, useEffect, useRef } from 'react'
import { Bell, Sun, Moon, Calendar, AlertTriangle, X, PackageSearch, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import client from '@/api/client'

// Badge de couleur selon le pôle
const POLE_COLORS = {
  PDJ:      'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  Bar:      'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  Creperie: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  All:      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
}

export default function TopBar() {
  const { user } = useAuth()
  const [currentTime, setCurrentTime]   = useState(new Date())
  const [darkMode, setDarkMode]         = useState(false)
  const [alertsCount, setAlertsCount]   = useState(0)
  const [alertProducts, setAlertProducts] = useState([])
  const [showPanel, setShowPanel]       = useState(false)

  // Ref pour détecter le clic en dehors du panel
  const panelRef = useRef(null)

  // ── Fermer le panel au clic en dehors ──────────────────────────────────────
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false)
      }
    }
    if (showPanel) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showPanel])

  // ── Horloge + fetch alertes ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)

    const fetchAlerts = async () => {
      try {
        const kpiRes = await client.get(`/dashboard/kpis?month=${new Date().toISOString().substring(0, 7)}`)
        if (kpiRes.data) {
          setAlertsCount(kpiRes.data.stockAlertCount ?? 0)
          setAlertProducts(kpiRes.data.stockAlerts   ?? [])
        }
      } catch (err) {
        console.error('Error fetching alerts count for TopBar', err)
      }
    }

    fetchAlerts()
    const alertTimer = setInterval(fetchAlerts, 5000) // ~temps réel : toutes les 5s

    return () => {
      clearInterval(timer)
      clearInterval(alertTimer)
    }
  }, [])

  // ── Dark mode toggle ───────────────────────────────────────────────────────
  const toggleDarkMode = () => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.remove('dark')
      root.classList.add('light')
      localStorage.setItem('theme', 'light')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
    setDarkMode(!darkMode)
  }

  const formatHeaderDate = (date) =>
    date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const formatHeaderTime = (date) =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-200">

      {/* Date & Time */}
      <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
        <Calendar size={18} className="text-emerald-600 dark:text-emerald-500" />
        <span className="text-sm font-medium capitalize">{formatHeaderDate(currentTime)}</span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-sm font-semibold font-mono">{formatHeaderTime(currentTime)}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4">

        {/* ── Alerts / Notifications ── */}
        <div className="relative" ref={panelRef}>

          {/* Bouton cloche */}
          <button
            onClick={() => setShowPanel(prev => !prev)}
            className={`relative p-2 rounded-full transition-colors ${
              showPanel
                ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
            title="Alertes de stock"
          >
            <Bell size={20} />
            {alertsCount > 0 && (
              <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {alertsCount}
              </span>
            )}
          </button>

          {/* ── Dropdown Panel ── */}
          {showPanel && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">

              {/* Header du panel */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Alertes de Stock
                  </span>
                  {alertsCount > 0 && (
                    <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {alertsCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Corps du panel */}
              <div className="max-h-72 overflow-y-auto">
                {alertProducts.length === 0 ? (
                  /* Aucune alerte */
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600 space-y-2">
                    <PackageSearch size={32} />
                    <p className="text-xs font-medium">Aucune alerte de stock aujourd'hui</p>
                  </div>
                ) : (
                  /* Liste des produits en alerte */
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {alertProducts.map((item, idx) => (
                      <li key={idx} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">

                          {/* Nom + pôle */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.productName}
                            </p>
                            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${POLE_COLORS[item.pole] || POLE_COLORS.All}`}>
                              {item.pole}
                            </span>
                          </div>

                          {/* Stock restant vs seuil */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">
                              {item.remainingStock} {item.unit}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              seuil : {item.quantityAlert} {item.unit}
                            </p>
                          </div>

                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer — lien vers la page stock */}
              <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                <Link
                  to="/stock/movements"
                  onClick={() => setShowPanel(false)}
                  className="flex items-center justify-center space-x-2 w-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <span>Voir tous les mouvements de stock</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
          title="Changer de thème"
        >
          {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} />}
        </button>

      </div>
    </header>
  )
}
