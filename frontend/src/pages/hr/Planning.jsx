import React, { useState, useEffect, useMemo } from 'react'
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  FileDown
} from 'lucide-react'
import client from '@/api/client'
import { addDays, subDays, format, startOfWeek } from 'date-fns'
import { toast } from 'sonner'
import { exportPlanningExcel } from '@/utils/exportPlanningExcel'

const SHIFT_OPTIONS = [
  { value: 'REST',     label: 'Repos (***)',          color: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  { value: '07H00-AP', label: 'Matin AP (07H00-AP)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/35' },
  { value: '15H00-FS', label: '15H00-FS',             color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/35' },
  { value: 'RCP',      label: 'RCP (Récupération)',   color: 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-400 border border-pink-200/35' },
  { value: 'CNG',      label: 'CNG (Congé)',           color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200/35' }
]

const DAYS_OF_WEEK = [
  { key: 'lundi', label: 'Lun' },
  { key: 'mardi', label: 'Mar' },
  { key: 'mercredi', label: 'Mer' },
  { key: 'jeudi', label: 'Jeu' },
  { key: 'vendredi', label: 'Ven' },
  { key: 'samedi', label: 'Sam' },
  { key: 'dimanche', label: 'Dim' }
]

const POLES = ['All', 'Caisse', 'Bar', 'Service', 'Cuisine', 'Creperie', 'PDJ', 'Commis']

export default function Planning() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Normalise to monday of current week
    const today = new Date()
    const monday = startOfWeek(today, { weekStartsOn: 1 })
    return monday
  })
  const [selectedPole, setSelectedPole] = useState('All')

  // Schedule Data States
  const [schedule, setSchedule] = useState(null)
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [updatingCell, setUpdatingCell] = useState(null) // { empId, day }

  const formattedWeekStart = useMemo(() => {
    return format(selectedWeek, 'yyyy-MM-dd')
  }, [selectedWeek])

  // Fetch Schedule for current week
  const fetchSchedule = async () => {
    setLoadingSchedule(true)
    try {
      const response = await client.get(`/schedules?weekStart=${formattedWeekStart}&pole=${selectedPole}`)
      setSchedule(response.data)
    } catch (err) {
      console.error('Error fetching schedule:', err)
      toast.error('Erreur de chargement du planning')
    } finally {
      setLoadingSchedule(false)
    }
  }

  useEffect(() => {
    fetchSchedule()
  }, [formattedWeekStart, selectedPole])

  // Week navigation
  const handlePrevWeek = () => {
    setSelectedWeek(prev => subDays(prev, 7))
  }

  const handleNextWeek = () => {
    setSelectedWeek(prev => addDays(prev, 7))
  }

  // Update shift or RCP cell
  const handleUpdateShift = async (employeeId, day, value) => {
    setUpdatingCell({ employeeId, day })
    try {
      await client.put(`/schedules/${schedule._id}/shift`, {
        employeeId,
        day,
        value
      })
      
      // Update local schedule state without full reload
      setSchedule(prev => {
        const copy = { ...prev }
        const entries = copy.entries.map(ent => {
          if (ent.employeeId?._id === employeeId || ent.employeeId === employeeId) {
            return { ...ent, [day]: value }
          }
          return ent
        })
        return { ...copy, entries }
      })
    } catch (err) {
      console.error('Error updating shift:', err)
      toast.error('Erreur de mise à jour du créneau')
    } finally {
      setUpdatingCell(null)
    }
  }

  const handleUpdateRcp = async (employeeId, rcpVal) => {
    const rcpNum = Math.max(0, Number(rcpVal))
    try {
      await client.put(`/schedules/${schedule._id}/shift`, {
        employeeId,
        rcp: rcpNum
      })
      
      setSchedule(prev => {
        const copy = { ...prev }
        const entries = copy.entries.map(ent => {
          if (ent.employeeId?._id === employeeId || ent.employeeId === employeeId) {
            return { ...ent, rcp: rcpNum }
          }
          return ent
        })
        return { ...copy, entries }
      })
      toast.success('Compteur RCP mis à jour')
    } catch (err) {
      console.error('Error updating RCP:', err)
      toast.error('Erreur de mise à jour du RCP')
    }
  }

  const handleExportExcel = async () => {
    if (!schedule || schedule.entries.length === 0) {
      toast.error('Aucune donnée à exporter')
      return
    }
    try {
      await exportPlanningExcel(schedule.entries, schedule.weekLabel, selectedPole)
      toast.success('Planning exporté avec succès !')
    } catch (err) {
      console.error('Error exporting planning:', err)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
            <CalendarDays className="text-emerald-600 dark:text-emerald-500" />
            <span>Planning de Présence</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gérez les plannings hebdomadaires des équipes par pôle de service.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm">
          <button 
            onClick={handlePrevWeek}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-650 transition-colors"
            title="Semaine précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-4 min-w-[200px] text-center font-mono">
            {schedule?.weekLabel || 'Chargement...'}
          </span>
          <button 
            onClick={handleNextWeek}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-650 transition-colors"
            title="Semaine suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Filtrer par Pôle:</span>
            <div className="flex gap-1">
              {POLES.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPole(p)}
                  className={`py-1 px-3 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                    selectedPole === p
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {p === 'All' ? 'Tous' : (p === 'Creperie' ? 'Crêperie' : p)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={loadingSchedule || !schedule || schedule.entries.length === 0}
            className="flex items-center justify-center space-x-2 py-1.5 px-4 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-250/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0 self-start md:self-auto"
            title="Exporter le planning sous format Excel"
          >
            <FileDown size={14} />
            <span>Exporter Excel</span>
          </button>
        </div>

        {/* Planning Grid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loadingSchedule ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
              <p className="text-slate-400 text-sm">Chargement de la grille...</p>
            </div>
          ) : !schedule || schedule.entries.length === 0 ? (
            <div className="py-20 text-center text-slate-450 text-sm">
              Aucun employé actif trouvé pour ce pôle. Veuillez d'abord ajouter du personnel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-550 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 w-16">N°</th>
                    <th className="py-4 px-4">Nom & Prénom</th>
                    <th className="py-4 px-4 w-28">Pôle / Poste</th>
                    {DAYS_OF_WEEK.map(day => (
                      <th key={day.key} className="py-4 px-2 text-center w-24">{day.label}</th>
                    ))}
                    <th className="py-4 px-6 text-center w-24">RCP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {schedule.entries.filter(entry => entry.employeeId).map((entry) => {
                    const emp = entry.employeeId
                    return (
                      <tr key={entry._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-sm transition-colors">
                        <td className="py-4 px-6 font-mono text-slate-400 dark:text-slate-600 font-bold">
                          {emp.employeeNumber}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {emp.fullName}
                        </td>
                        <td className="py-4 px-4">
                          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-350">
                            {emp.pole === 'Creperie' ? 'Crêperie' : emp.pole}
                          </span>
                          <span className="block text-[10px] text-slate-400">{emp.position}</span>
                        </td>
                        
                        {/* Days Cells */}
                        {DAYS_OF_WEEK.map(day => {
                          const val = entry[day.key] || 'REST'
                          const opt = SHIFT_OPTIONS.find(o => o.value === val) || SHIFT_OPTIONS[0]
                          const isUpdating = updatingCell?.employeeId === emp._id && updatingCell?.day === day.key
                          
                          return (
                            <td key={day.key} className="py-2.5 px-1.5 text-center">
                              <div className="relative inline-block w-full">
                                {isUpdating ? (
                                  <div className="flex items-center justify-center py-1.5 bg-slate-550/5 dark:bg-slate-800 rounded-lg">
                                    <Loader2 size={12} className="animate-spin text-emerald-600" />
                                  </div>
                                ) : (
                                  <select
                                    value={val}
                                    onChange={(e) => handleUpdateShift(emp._id, day.key, e.target.value)}
                                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold text-center appearance-none focus:outline-none cursor-pointer ${opt.color}`}
                                  >
                                    {SHIFT_OPTIONS.map(o => (
                                      <option key={o.value} value={o.value}>
                                        {o.value === 'REST' ? '***' : o.value}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                          )
                        })}

                        {/* RCP counter */}
                        <td className="py-2.5 px-6 text-center">
                          <input
                            type="number"
                            value={entry.rcp || 0}
                            onChange={(e) => handleUpdateRcp(emp._id, e.target.value)}
                            className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center py-1 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-emerald-500"
                            min="0"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
