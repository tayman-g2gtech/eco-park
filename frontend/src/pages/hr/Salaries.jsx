import React, { useState, useEffect } from 'react'
import {
  Banknote,
  ChevronRight,
  Download,
  Printer,
  RefreshCw,
  Calculator,
  DollarSign,
  Loader2,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Check
} from 'lucide-react'
import client from '@/api/client'
import { formatCurrency } from '@/lib/utils'
import MonthCarousel from '@/components/shared/MonthCarousel'
import { toast } from 'sonner'
import { exportSalariesExcel } from '@/utils/exportSalariesExcel'

export default function Salaries() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7) // YYYY-MM
  })

  const [salaries, setSalaries] = useState([])
  const [totalNet, setTotalNet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingExpense, setGeneratingExpense] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [editingAdvances, setEditingAdvances] = useState({}) // salaryId -> number

  const fetchSalaries = async () => {
    setLoading(true)
    try {
      const response = await client.get(`/salaries?month=${selectedMonth}`)
      setSalaries(response.data.salaries || [])
      setTotalNet(response.data.totalNetToPay || 0)
    } catch (err) {
      console.error('Error fetching salaries:', err)
      toast.error('Erreur lors du chargement des fiches de paie')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalaries()
  }, [selectedMonth])

  // Generate payroll for the month
  const handleGeneratePayroll = async () => {
    setGenerating(true)
    try {
      await client.post(`/salaries/generate?month=${selectedMonth}`)
      toast.success('Fiches de paie générées avec succès !')
      fetchSalaries()
    } catch (err) {
      console.error('Error generating payroll:', err)
      toast.error(err.response?.data?.message || 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  // Update salary advance value
  const handleAdvanceChange = (salaryId, val) => {
    const num = val === '' ? '' : Math.max(0, Number(val))
    setEditingAdvances(prev => ({
      ...prev,
      [salaryId]: num
    }))
  }

  // Save changes (Advances / worked days) to a salary payment
  const handleSaveSalaryChanges = async (sal) => {
    const newVal = editingAdvances[sal._id]
    if (newVal === undefined) return

    try {
      const response = await client.put(`/salaries/${sal._id}`, {
        advances: Number(newVal)
      })
      toast.success('Avance sur salaire enregistrée')

      // Update local state
      setSalaries(prev => prev.map(s => s._id === sal._id ? response.data : s))

      // Clear edit cache
      setEditingAdvances(prev => {
        const copy = { ...prev }
        delete copy[sal._id]
        return copy
      })

      // Recalculate total
      const updatedSals = salaries.map(s => s._id === sal._id ? response.data : s)
      const sum = updatedSals.reduce((acc, curr) => acc + curr.netToPay, 0)
      setTotalNet(sum)
    } catch (err) {
      console.error('Error saving salary updates:', err)
      toast.error('Erreur de mise à jour')
    }
  }

  // Generate Fixed Expense for Dashboard
  const handleGenerateExpense = async () => {
    if (salaries.length === 0) {
      toast.error('Aucune fiche de paie à comptabiliser')
      return
    }

    setGeneratingExpense(true)
    try {
      await client.post(`/salaries/generate-expense?month=${selectedMonth}`)
      toast.success('Charge masse salariale générée et imputée au Dashboard !')
    } catch (err) {
      console.error('Error generating expense for salaries:', err)
      toast.error("Erreur d'écriture de la charge")
    } finally {
      setGeneratingExpense(false)
    }
  }

  // Export payroll list to Excel
  const handleExportExcel = async () => {
    if (salaries.length === 0) {
      toast.warning('Aucune fiche de paie à exporter pour ce mois.')
      return
    }
    setExportingExcel(true)
    try {
      await exportSalariesExcel(salaries, selectedMonth)
      toast.success('Export Excel généré avec succès !')
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'export Excel")
    } finally {
      setExportingExcel(false)
    }
  }

  // Print Layout
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto printable">
      {/* Print-only Header */}
      <div className="print-only border-b-2 border-slate-900 pb-4 mb-12 mt-20">
        <h1 className="text-2xl font-bold text-slate-900">ECO-PARK — MASSE SALARIALE</h1>
        <p className="text-sm text-slate-600 mt-1 capitalize font-medium">
          Mois : {(() => {
            if (!selectedMonth) return ''
            const [y, m] = selectedMonth.split('-')
            const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
            return `${months[parseInt(m, 10) - 1]} ${y}`
          })()} &nbsp;|&nbsp; Généré le : {new Date().toLocaleDateString('fr-MA')}
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 non-printable">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
            <Banknote className="text-emerald-600 dark:text-emerald-500" />
            <span>Masse Salariale</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Visualisez et validez les calculs de paie mensuels des équipes (prorata automatique).
          </p>
        </div>

        <MonthCarousel value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Action buttons panel */}
      {salaries.length > 0 && (
        <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm items-center justify-between non-printable">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleGenerateExpense}
              disabled={generatingExpense}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl py-2.5 px-5 shadow-sm active:scale-[0.98] transition-all flex items-center space-x-2 shrink-0"
            >
              {generatingExpense ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileCheck size={16} />
              )}
              <span>Générer la Charge de Paie</span>
            </button>

            <button
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 font-semibold text-sm rounded-xl py-2.5 px-5 transition-all flex items-center space-x-2 shrink-0"
              title="Recalculer les jours travaillés à partir du planning"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              <span>Recalculer depuis le Planning</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center space-x-2 disabled:opacity-60"
              title="Exporter vers Excel (.xlsx)"
            >
              {exportingExcel ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Exporter Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center space-x-2"
              title="Imprimer cette page"
            >
              <Printer size={14} />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
            <p className="text-slate-400 text-sm">Calcul de la paie en cours...</p>
          </div>
        ) : salaries.length === 0 ? (
          <div className="py-20 text-center space-y-6 max-w-md mx-auto non-printable">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <Calculator size={32} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Aucune fiche de paie générée</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Les fiches de paie de ce mois n'ont pas encore été calculées. L'application va extraire les présences de tous les plannings du mois ({selectedMonth}) pour générer les paies de base.
              </p>
            </div>
            <button
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-3 text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              <span>Générer et Calculer la Paie</span>
            </button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-550 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 w-16">N°</th>
                    <th className="py-4 px-4">Nom & Prénom</th>
                    <th className="py-4 px-4 w-28">Pôle / Poste</th>
                    <th className="py-4 px-4">Paiement</th>
                    <th className="py-4 px-4 text-right">Taux Net</th>
                    <th className="py-4 px-4 text-center">Jours Travaillés</th>
                    <th className="py-4 px-4 text-center">Repos</th>
                    <th className="py-4 px-4 text-center w-28 non-printable">Avances (DH)</th>
                    <th className="py-4 px-4 text-right">Net à Payer</th>
                    <th className="py-4 px-6 text-center w-24 non-printable">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {salaries.map((s) => {
                    const emp = s.employeeId
                    if (!emp) return null

                    const isEditing = editingAdvances[s._id] !== undefined
                    const advancesVal = isEditing ? editingAdvances[s._id] : s.advances

                    return (
                      <tr key={s._id} className="hover:bg-slate-550/5 text-sm">
                        <td className="py-4 px-6 font-mono text-slate-400 font-bold">
                          {emp.employeeNumber}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-850 dark:text-slate-200">
                          {emp.fullName}
                        </td>
                        <td className="py-4 px-4">
                          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-350">{emp.pole}</span>
                          <span className="block text-[10px] text-slate-400">{emp.position}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${emp.paymentType === 'Mensuel'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                            {emp.paymentType}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          {emp.paymentType === 'Journalier'
                            ? `${emp.dailyRate} DH/j`
                            : `${emp.baseSalaryNet} DH/m`}
                        </td>
                        <td className="py-4 px-4 text-center font-semibold font-mono text-slate-750 dark:text-slate-300">
                          {s.daysWorked} jours
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-500">
                          {s.restDays} j
                        </td>

                        {/* Advances Input (non printable or inputs read-only on print) */}
                        <td className="py-2.5 px-4 text-center bg-slate-100/10 dark:bg-slate-950/10 non-printable">
                          <input
                            type="number"
                            value={advancesVal === 0 && !isEditing ? '' : advancesVal}
                            placeholder="0"
                            onChange={(e) => handleAdvanceChange(s._id, e.target.value)}
                            className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 text-center py-1.5 px-2 rounded-lg text-sm font-mono focus:outline-none"
                            min="0"
                          />
                        </td>

                        {/* Net to pay */}
                        <td className="py-4 px-4 text-right font-extrabold font-mono text-slate-900 dark:text-slate-100">
                          {formatCurrency(s.netToPay)}
                        </td>

                        <td className="py-3 px-6 text-center non-printable">
                          <div className="flex items-center justify-center">
                            {isEditing ? (
                              <button
                                onClick={() => handleSaveSalaryChanges(s)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg hover:shadow-sm transition-all"
                                title="Sauvegarder l'avance"
                              >
                                <Check size={14} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                Validé
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Masse Salariale Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-650 dark:text-slate-400 uppercase tracking-wider">
                Total Masse Salariale Mensuelle
              </span>
              <span className="font-extrabold text-2xl text-emerald-650 dark:text-emerald-400 font-mono">
                {formatCurrency(totalNet)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Printing stylesheet overrides */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .non-printable {
            display: none !important;
          }
          .printable {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          table {
            border: 1px solid #ddd !important;
          }
          th, td {
            border-bottom: 1px solid #ddd !important;
            padding: 8px !important;
          }
        }
      `}</style>
    </div>
  )
}
