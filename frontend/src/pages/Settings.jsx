import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  UtensilsCrossed, 
  Server, 
  Check, 
  HelpCircle,
  AlertOctagon,
  Moon,
  Sun,
  Laptop
} from 'lucide-react'
import client from '@/api/client'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [dbStatus, setDbStatus] = useState('Checking...')
  const [sysInfo, setSysInfo] = useState({
    version: '1.0.0',
    environment: 'Production (MERN)',
    uptime: 'N/A'
  })
  const [loading, setLoading] = useState(false)
  const [themeMode, setThemeMode] = useState('light')

  useEffect(() => {
    // Check backend health
    const checkHealth = async () => {
      try {
        const response = await client.get('/health')
        if (response.data.status === 'OK') {
          setDbStatus('Connecté 🟢')
        } else {
          setDbStatus('Inconnu 🟡')
        }
      } catch (err) {
        setDbStatus('Déconnecté 🔴')
      }
    }
    
    checkHealth()

    // Theme check
    const currentTheme = localStorage.getItem('theme') || 'light'
    setThemeMode(currentTheme)
  }, [])

  const handleToggleTheme = (mode) => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.remove('light')
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      localStorage.setItem('theme', 'light')
    }
    setThemeMode(mode)
    toast.success(`Thème ${mode === 'dark' ? 'sombre' : 'clair'} activé`)
  }

  return (
    <div className="space-y-8 p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
          <Settings className="text-emerald-600 dark:text-emerald-500" />
          <span>Configuration Système</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gérez l'apparence, diagnostiquez les statuts et visualisez les paramètres système.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Appearance Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base flex items-center space-x-2">
            <Sun size={18} className="text-emerald-600" />
            <span>Thème & Apparence</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personnalisez l'affichage de l'interface d'Eco-Park.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => handleToggleTheme('light')}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2 transition-all duration-200 ${
                themeMode === 'light'
                  ? 'bg-emerald-50/50 border-emerald-500 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sun size={24} />
              <span className="text-xs font-semibold">Mode Clair</span>
            </button>

            <button
              onClick={() => handleToggleTheme('dark')}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2 transition-all duration-200 ${
                themeMode === 'dark'
                  ? 'bg-emerald-50/50 border-emerald-500 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
              }`}
            >
              <Moon size={24} />
              <span className="text-xs font-semibold">Mode Sombre</span>
            </button>
          </div>
        </div>

        {/* Database Status Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base flex items-center space-x-2">
            <Database size={18} className="text-emerald-600" />
            <span>Statut Réseau & Serveurs</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vérifiez l'interconnexion avec les bases de données Cloud Atlas.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
              <div className="flex items-center space-x-3">
                <Server size={18} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-650 dark:text-slate-350">API Backend</span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                {dbStatus}
              </span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
              <div className="flex items-center space-x-3">
                <ShieldCheck size={18} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-650 dark:text-slate-350">Sécurité (SSL)</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Activé (AES-256)
              </span>
            </div>
          </div>
        </div>

        {/* System Diagnostics Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 md:col-span-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base flex items-center space-x-2">
            <UtensilsCrossed size={18} className="text-emerald-600" />
            <span>À propos de l'Application Eco-Park</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Version Logiciel</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono mt-1 block">v{sysInfo.version}</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Environnement</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 block">{sysInfo.environment}</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Base de données</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 block">MongoDB Atlas</span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-emerald-500/10 rounded-2xl text-xs text-emerald-800 dark:text-emerald-400 border border-emerald-500/15 leading-relaxed">
            💡 <strong>Rappel Gérant :</strong> Les données de stock et les calculs de salaire de cette plateforme sont stockés de manière sécurisée et mis à jour en temps réel. En cas de réinitialisation de la base de données, contactez le support ou lancez la commande de seeder du serveur pour charger à nouveau les 200+ produits et les 48 employés de départ.
          </div>
        </div>
      </div>
    </div>
  )
}
