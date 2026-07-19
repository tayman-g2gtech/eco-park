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
  const [initializing, setInitializing] = useState(false)  // Nouvel état pour l'init manuelle
  const [generatingExpense, setGeneratingExpense] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  // editingRows: { [salaryId]: { daysWorked?: number, advances?: number } }
  const [editingRows, setEditingRows] = useState({})

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

  const isGenerationAllowed = true // La génération de charge est toujours disponible en mode saisie manuelle

  useEffect(() => {
    fetchSalaries()
  }, [selectedMonth])

  // Initialise les fiches de paie vides pour la saisie manuelle
  const handleInitPayroll = async () => {
    if (!window.confirm(`Initialiser / réinitialiser toutes les fiches de paie à zéro pour ${selectedMonth} ?\nLes valeurs actuelles seront écrasées.`)) return
    setInitializing(true)
    try {
      const response = await client.post(`/salaries/init?month=${selectedMonth}`)
      toast.success(response.data.message || 'Fiches initialisées !')
      fetchSalaries()
    } catch (err) {
      console.error('Error initializing payroll:', err)
      toast.error(err.response?.data?.message || 'Erreur lors de l\'initialisation')
    } finally {
      setInitializing(false)
    }
  }

  // Generate payroll for the month from planning
  const handleGeneratePayroll = async () => {
    setGenerating(true)
    try {
      await client.post(`/salaries/generate?month=${selectedMonth}`)
      toast.success('Fiches de paie calculées depuis le planning !')
      fetchSalaries()
    } catch (err) {
      console.error('Error generating payroll:', err)
      toast.error(err.response?.data?.message || 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  // Update a row field (daysWorked or advances) in edit state
  const handleRowFieldChange = (salaryId, field, val) => {
    const num = val === '' ? '' : Math.max(0, Number(val))
    setEditingRows(prev => ({
      ...prev,
      [salaryId]: { ...prev[salaryId], [field]: num }
    }))
  }

  // Save all pending changes for a salary row
  const handleSaveSalaryChanges = async (sal) => {
    const edits = editingRows[sal._id]
    if (!edits || Object.keys(edits).length === 0) return

    try {
      const payload = {
        daysWorked: edits.daysWorked ?? sal.daysWorked,
        advances:   edits.advances   ?? sal.advances
      }
      const response = await client.put(`/salaries/${sal._id}`, payload)
      toast.success('Modifications enregistrées')

      // Update local state
      setSalaries(prev => prev.map(s => s._id === sal._id ? response.data : s))

      // Clear edit cache for this row
      setEditingRows(prev => {
        const copy = { ...prev }
        delete copy[sal._id]
        return copy
      })

      // Recalculate total
      const updatedSals = salaries.map(s => s._id === sal._id ? response.data : s)
      setTotalNet(updatedSals.reduce((acc, curr) => acc + curr.netToPay, 0))
    } catch (err) {
      console.error('Error saving salary updates:', err)
      toast.error('Erreur de mise à jour')
    }
  }

  // Toggle payment status of a salary
  const handleTogglePayStatus = async (sal) => {
    try {
      const response = await client.put(`/salaries/${sal._id}`, {
        isPaid: !sal.isPaid
      })
      toast.success(response.data.isPaid ? 'Marqué comme payé !' : 'Paiement annulé')

      // Update local state
      setSalaries(prev => prev.map(s => s._id === sal._id ? response.data : s))

      // Recalculate total
      const updatedSals = salaries.map(s => s._id === sal._id ? response.data : s)
      setTotalNet(updatedSals.reduce((acc, curr) => acc + curr.netToPay, 0))
    } catch (err) {
      console.error('Error toggling pay status:', err)
      toast.error('Erreur lors du changement de statut')
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
        <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm items-start md:items-center justify-between non-printable">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            {/* Bouton principal : Générer la Charge */}
            <button
              onClick={handleGenerateExpense}
              disabled={generatingExpense}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl py-2.5 px-5 shadow-sm active:scale-[0.98] transition-all flex items-center space-x-2 shrink-0"
              title="Imputer la charge de paie vers le Dashboard"
            >
              {generatingExpense ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileCheck size={16} />
              )}
              <span>Générer la Charge de Paie</span>
            </button>

            {/* Bouton secondaire : Recalculer depuis le Planning */}
            <button
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 font-semibold text-sm rounded-xl py-2.5 px-5 transition-all flex items-center space-x-2 shrink-0"
              title="Recalculer les jours travaillés depuis le planning (si actif)"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              <span>Recalculer depuis Planning</span>
            </button>

            {/* Bouton réinitialisation manuelle */}
            <button
              onClick={handleInitPayroll}
              disabled={initializing}
              className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 font-semibold text-sm rounded-xl py-2.5 px-5 transition-all flex items-center space-x-2 shrink-0"
              title="Réinitialiser toutes les fiches à 0 pour la saisie manuelle"
            >
              {initializing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Calculator size={16} />
              )}
              <span>Réinit. Saisie Manuelle</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
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
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Aucune fiche de paie pour ce mois</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Choisissez le mode de génération : <strong>Saisie manuelle</strong> (recommandé si le planning n'est pas utilisé) ou <strong>depuis le Planning</strong>.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleInitPayroll}
                disabled={initializing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-3 text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                {initializing ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                <span>Initialiser les fiches (Saisie Manuelle)</span>
              </button>
              <button
                onClick={handleGeneratePayroll}
                disabled={generating}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl py-3 text-sm transition-all flex items-center justify-center space-x-2"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>Calculer depuis le Planning</span>
              </button>
            </div>
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

                    const rowEdits = editingRows[s._id] || {}
                    const isEditing = Object.keys(rowEdits).length > 0

                    const daysWorkedVal = rowEdits.daysWorked !== undefined ? rowEdits.daysWorked : s.daysWorked
                    const advancesVal   = rowEdits.advances   !== undefined ? rowEdits.advances   : s.advances

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

                        {/* Jours Travaillés — éditable manuellement */}
                        <td className="py-2.5 px-4 text-center bg-slate-100/10 dark:bg-slate-950/10 non-printable">
                          <input
                            type="number"
                            value={daysWorkedVal === 0 && rowEdits.daysWorked === undefined ? '' : daysWorkedVal}
                            placeholder="0"
                            onChange={(e) => handleRowFieldChange(s._id, 'daysWorked', e.target.value)}
                            className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 text-center py-1.5 px-2 rounded-lg text-sm font-mono focus:outline-none"
                            min="0"
                            max="31"
                            step="1"
                          />
                        </td>

                        <td className="py-4 px-4 text-center font-mono text-slate-500">
                          {s.restDays} j
                        </td>

                        {/* Avances — éditable */}
                        <td className="py-2.5 px-4 text-center bg-slate-100/10 dark:bg-slate-950/10 non-printable">
                          <input
                            type="number"
                            value={advancesVal === 0 && rowEdits.advances === undefined ? '' : advancesVal}
                            placeholder="0"
                            onChange={(e) => handleRowFieldChange(s._id, 'advances', e.target.value)}
                            className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 text-center py-1.5 px-2 rounded-lg text-sm font-mono focus:outline-none"
                            min="0"
                          />
                        </td>

                        {/* Net à payer */}
                        <td className="py-4 px-4 text-right font-extrabold font-mono text-slate-900 dark:text-slate-100">
                          {formatCurrency(s.netToPay)}
                        </td>

                        <td className="py-3 px-6 text-center non-printable">
                          <div className="flex items-center justify-center">
                            {isEditing ? (
                              <button
                                onClick={() => handleSaveSalaryChanges(s)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg hover:shadow-sm transition-all"
                                title="Sauvegarder les modifications"
                              >
                                <Check size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePayStatus(s)}
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all border ${
                                  s.isPaid
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-250/20 dark:border-emerald-800/40 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-950/20 dark:hover:text-red-400 hover:border-red-200'
                                    : 'bg-slate-50 text-slate-550 dark:bg-slate-950 dark:text-slate-450 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                                }`}
                                title={s.isPaid ? "Cliquer pour marquer comme À payer" : "Cliquer pour marquer comme Payé"}
                              >
                                {s.isPaid ? 'Payé' : 'À payer'}
                              </button>
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
