import React, { useState, useEffect, useMemo } from 'react'
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2,
  Calendar, Sun, Sunset, Moon, Coffee, AlertCircle, Check, HelpCircle
} from 'lucide-react'
import { addDays, format, startOfWeek, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import client from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// ─── Shift options details ───
const SHIFT_MAP = {
  '07H00-AP': { name: 'Matin AP', icon: Sun,      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40' },
  '15H00-FS': { name: 'Ap-Midi FS', icon: Sunset, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40' },
  'REST':     { name: 'Repos',         icon: Calendar, color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700/60' },
  'RCP':      { name: 'Récupération',  icon: Calendar, color: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-400 border-pink-200 dark:border-pink-900/40' },
  'CNG':      { name: 'Congé',         icon: Calendar, color: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border-red-200 dark:border-red-900/40' },
};

const SHIFT_ROWS = [
  { value: '07H00-AP', label: 'Matin AP (07H00-AP)' },
  { value: '15H00-FS', label: 'Ap-Midi FS (15H00-FS)' },
  { value: 'REST',     label: 'Repos (REST)' },
  { value: 'RCP',      label: 'Récupération (RCP)' },
  { value: 'CNG',      label: 'Congé (CNG)' },
];

const DAYS_FR = [
  { key: 'lundi', short: 'Lun', full: 'Lundi' },
  { key: 'mardi', short: 'Mar', full: 'Mardi' },
  { key: 'mercredi', short: 'Mer', full: 'Mercredi' },
  { key: 'jeudi', short: 'Jeu', full: 'Jeudi' },
  { key: 'vendredi', short: 'Ven', full: 'Vendredi' },
  { key: 'samedi', short: 'Sam', full: 'Samedi' },
  { key: 'dimanche', short: 'Dim', full: 'Dimanche' },
];

function getMondayOfCurrentWeek(offset = 0) {
  const today = new Date()
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  return addDays(monday, offset * 7)
}

function getDayDate(weekMonday, dayKey) {
  const idx = DAYS_FR.findIndex(d => d.key === dayKey)
  return addDays(weekMonday, idx)
}

export default function StaffPlanningView() {
  const { user } = useAuth()

  const [weekOffset, setWeekOffset] = useState(0)
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)

  const weekMonday = useMemo(() => getMondayOfCurrentWeek(weekOffset), [weekOffset])
  const weekSunday = useMemo(() => addDays(weekMonday, 6), [weekMonday])
  const isCurrentWeek = weekOffset === 0

  const weekLabel = useMemo(() => {
    const start = format(weekMonday, 'dd MMM', { locale: fr })
    const end = format(weekSunday, 'dd MMM yyyy', { locale: fr })
    return `${start} → ${end}`
  }, [weekMonday, weekSunday])

  const formattedWeekStart = useMemo(() => format(weekMonday, 'yyyy-MM-dd'), [weekMonday])

  // Today's day key
  const todayKey = useMemo(() => {
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
    return dayNames[new Date().getDay()]
  }, [])

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const response = await client.get(`/schedules?weekStart=${formattedWeekStart}`)
      setSchedule(response.data)
    } catch (err) {
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedule()
  }, [formattedWeekStart])

  // Find ONLY the connected staff member's schedule entry
  const myEntry = useMemo(() => {
    if (!schedule || !schedule.entries || !user) return null
    const targetId = user.employeeId?._id || user.employeeId
    return schedule.entries.find(e => e.employeeId?._id === targetId || e.employeeId === targetId)
  }, [schedule, user])

  // Personal statistics for the selected week
  const stats = useMemo(() => {
    if (!myEntry) return { worked: 0, off: 0, rcp: 0 }
    let worked = 0
    let off = 0
    DAYS_FR.forEach(d => {
      const val = myEntry[d.key] || 'REST'
      if (['REST', 'CNG', 'CPR'].includes(val)) {
        off++
      } else {
        worked++
      }
    })
    return {
      worked,
      off,
      rcp: myEntry.rcp || 0
    }
  }, [myEntry])

  if (!user?.employeeId) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center space-y-4">
        <AlertCircle size={44} className="mx-auto text-amber-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Compte non lié</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          Ce compte utilisateur n'est lié à aucune fiche d'employé. Veuillez contacter votre administrateur pour configurer la liaison.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Welcome Banner ── */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-between">
        <div>
          <p className="text-emerald-100 text-xs font-semibold mb-0.5 uppercase tracking-wide">Mon Espace Personnel</p>
          <h1 className="text-2xl font-extrabold tracking-tight capitalize">
            Bonjour, {user?.name || 'Collaborateur'} !
          </h1>
          {user?.pole && (
            <span className="inline-block mt-2 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-white/30">
              Pôle {user.pole}
            </span>
          )}
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <span className="text-emerald-100 text-xs">Semaine de travail</span>
          <span className="text-white text-sm font-bold">{weekLabel}</span>
          <span className="text-emerald-200 text-[11px]">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </span>
        </div>
      </div>

      {/* ── Controls Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm w-full md:w-fit">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-center px-3 min-w-[180px]">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">{weekLabel}</p>
            {isCurrentWeek && (
              <span className="text-[10px] text-emerald-500 font-semibold">● Semaine actuelle</span>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              Aujourd'hui
            </button>
          )}
        </div>

        {/* Legend indicators */}
        <div className="hidden lg:flex items-center gap-2">
          {Object.entries(SHIFT_MAP).slice(0, 5).map(([code, s]) => {
            const Icon = s.icon;
            return (
              <div key={code} className={cn("flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 border rounded-lg", s.color)}>
                <Icon size={12} />
                <span>{s.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Stats Summary Grid ── */}
      {myEntry && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
              {stats.worked}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jours Travaillés</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cette semaine</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-lg">
              {stats.off}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Repos / Congés</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cette semaine</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="h-10 w-10 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-lg">
              {stats.rcp}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Récupérations (RCP)</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total cumulé actuel</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Timetable Layout ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">

        {/* Timetable Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-emerald-500" />

          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">
            Planning Hebdomadaire
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-emerald-500 mb-3" />
            <p className="text-slate-400 text-sm">Chargement de votre planning...</p>
          </div>
        ) : !myEntry ? (
          <div className="py-20 text-center">
            <CalendarDays size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-bold text-base">Aucun planning trouvé</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              Vous n'avez aucun planning saisi pour cette semaine.
            </p>
          </div>
        ) : (
          <>
            {/* ── DESKTOP TIMETABLE VIEW (Shifts as columns, Days as rows) ── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-4 px-5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left w-52">
                      Jours de la semaine
                    </th>
                    {SHIFT_ROWS.map(col => (
                      <th
                        key={col.value}
                        className="py-3.5 px-2 text-center w-28 border-l border-slate-200 dark:border-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {DAYS_FR.map(day => {
                    const dayDate = getDayDate(weekMonday, day.key)
                    const isTodayRow = isCurrentWeek && day.key === todayKey
                    const val = myEntry[day.key] || 'REST'

                    return (
                      <tr
                        key={day.key}
                        className={cn(
                          "hover:bg-slate-50/[0.3] dark:hover:bg-slate-950/[0.1] transition-colors",
                          isTodayRow ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]' : ''
                        )}
                      >
                        {/* Row Header (Day & Date) */}
                        <td className="py-4 px-5 text-left border-r border-slate-200 dark:border-slate-800/80">
                          <div className="flex items-center gap-2">
                            {isTodayRow && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                            <div>
                              <span className={cn(
                                'block text-sm font-extrabold capitalize',
                                isTodayRow ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
                              )}>
                                {day.full}
                              </span>
                              <span className="block text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                                {format(dayDate, 'dd MMMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Shift columns */}
                        {SHIFT_ROWS.map(col => {
                          const isActiveCell = val === col.value
                          const shiftDetails = SHIFT_MAP[val] || SHIFT_MAP.REST
                          const ShiftIcon = shiftDetails.icon

                          return (
                            <td
                              key={col.value}
                              className="p-3 text-center border-l border-slate-200 dark:border-slate-800/80 relative"
                            >
                              {isActiveCell ? (
                                <div className={cn(
                                  "mx-auto flex flex-col items-center justify-center p-3.5 rounded-xl border shadow-sm transition-all duration-300 transform scale-105 animate-fade-in",
                                  shiftDetails.color
                                )}>
                                  <div className="absolute top-1 right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 border border-current shadow-xs">
                                    <Check size={9} className="stroke-[3]" />
                                  </div>
                                  <ShiftIcon size={18} className="mb-1 opacity-90 animate-pulse" />
                                  <span className="text-xs font-extrabold tracking-wider">{col.value === 'REST' ? 'Off' : col.value}</span>
                                  <span className="text-[10px] opacity-75 font-mono mt-0.5 font-bold">
                                    {shiftDetails.name}
                                  </span>
                                </div>
                              ) : (
                                <div className="h-14 flex items-center justify-center">
                                  <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-850" />
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE / TABLET VIEW (Responsive day cards) ── */}
            <div className="lg:hidden p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
              {DAYS_FR.map(day => {
                const dayDate = getDayDate(weekMonday, day.key)
                const val = myEntry[day.key] || 'REST'
                const isTodayRow = isCurrentWeek && day.key === todayKey
                const shiftDetails = SHIFT_MAP[val] || SHIFT_MAP.REST
                const ShiftIcon = shiftDetails.icon

                return (
                  <div
                    key={day.key}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all shadow-xs",
                      isTodayRow
                        ? "bg-white dark:bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80"
                    )}
                  >
                    {/* Day Info */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex flex-col items-center justify-center font-mono border",
                        isTodayRow
                          ? "bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/10"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60"
                      )}>
                        <span className="text-[10px] font-bold uppercase leading-none">{day.short}</span>
                        <span className="text-sm font-extrabold leading-none mt-0.5">{format(dayDate, 'd')}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {day.full}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {format(dayDate, 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>

                    {/* Shift card */}
                    <div className={cn(
                      "flex items-center gap-2 py-1.5 px-3 rounded-lg border text-xs font-bold shadow-xs",
                      shiftDetails.color
                    )}>
                      <ShiftIcon size={14} className="shrink-0" />
                      <div className="text-right">
                        <p className="leading-none">{val === 'REST' ? 'Non travaillé' : val}</p>
                        <p className="text-[9px] opacity-75 font-mono leading-none mt-0.5 font-bold">
                          {shiftDetails.name}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Notice notice ── */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1.5">
        <HelpCircle size={13} className="text-slate-400" />
        <span>Ce planning est en lecture seule. Pour tout changement, veuillez contacter votre responsable.</span>
      </p>
    </div>
  )
}
