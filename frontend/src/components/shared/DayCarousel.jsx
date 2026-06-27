import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, subDays, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function DayCarousel({ value, onChange }) {
  // value is 'YYYY-MM-DD'
  const currentDate = useMemo(() => {
    return value ? parseISO(value) : new Date()
  }, [value])

  // Generate 7 days around current date (-3 to +3)
  const days = useMemo(() => {
    const list = []
    for (let i = -3; i <= 3; i++) {
      const day = addDays(currentDate, i)
      list.push({
        date: day,
        key: format(day, 'yyyy-MM-dd'),
        dayName: format(day, 'eee', { locale: fr }), // lun, mar, etc
        dayNum: format(day, 'd'),
        monthName: format(day, 'MMM', { locale: fr })
      })
    }
    return list
  }, [currentDate])

  const handlePrevDay = () => {
    const prev = subDays(currentDate, 1)
    onChange(format(prev, 'yyyy-MM-dd'))
  }

  const handleNextDay = () => {
    const next = addDays(currentDate, 1)
    onChange(format(next, 'yyyy-MM-dd'))
  }

  return (
    <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm transition-colors duration-200">
      <button 
        onClick={handlePrevDay}
        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex items-center space-x-1 overflow-x-auto py-1 px-2">
        {days.map((d) => {
          const isSelected = d.key === value
          return (
            <button
              key={d.key}
              onClick={() => onChange(d.key)}
              className={`flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all duration-200 select-none ${
                isSelected
                  ? 'bg-emerald-600 dark:bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-105 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              <span className={`text-[10px] uppercase tracking-wider ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                {d.dayName}
              </span>
              <span className="text-lg font-bold leading-tight my-0.5">
                {d.dayNum}
              </span>
              <span className={`text-[9px] capitalize ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                {d.monthName}
              </span>
            </button>
          )
        })}
      </div>

      <button 
        onClick={handleNextDay}
        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
