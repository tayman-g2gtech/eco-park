import React from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

export default function MonthCarousel({ value, onChange }) {
  // value is YYYY-MM
  const date = value ? new Date(value + '-02') : new Date() // use 02 to avoid timezone shifts
  
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ]

  const currentYear = date.getFullYear()
  const currentMonthIdx = date.getMonth()

  const handlePrevMonth = () => {
    let newMonth = currentMonthIdx - 1
    let newYear = currentYear
    if (newMonth < 0) {
      newMonth = 11
      newYear -= 1
    }
    const formattedMonth = String(newMonth + 1).padStart(2, '0')
    onChange(`${newYear}-${formattedMonth}`)
  }

  const handleNextMonth = () => {
    let newMonth = currentMonthIdx + 1
    let newYear = currentYear
    if (newMonth > 11) {
      newMonth = 0
      newYear += 1
    }
    const formattedMonth = String(newMonth + 1).padStart(2, '0')
    onChange(`${newYear}-${formattedMonth}`)
  }

  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm max-w-sm transition-colors duration-200">
      <button 
        onClick={handlePrevMonth}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center space-x-2 px-4">
        <Calendar size={16} className="text-emerald-600 dark:text-emerald-500" />
        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[140px] text-center">
          {months[currentMonthIdx]} {currentYear}
        </span>
      </div>

      <button 
        onClick={handleNextMonth}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
