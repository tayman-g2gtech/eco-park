import React, { useState, useEffect } from 'react'
import { 
  Receipt, 
  Coins, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Calendar,
  DollarSign,
  TrendingUp,
  Tag,
  CoinsIcon,
  FileDown
} from 'lucide-react'
import client from '@/api/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import MonthCarousel from '@/components/shared/MonthCarousel'
import { toast } from 'sonner'
import { exportExpensesExcel } from '@/utils/exportExpensesExcel'
import { exportRevenueExcel } from '@/utils/exportRevenueExcel'

export default function Expenses() {
  const [activeTab, setActiveTab] = useState('expenses') // 'expenses' | 'revenues'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7) // YYYY-MM
  })

  // Data states
  const [expenses, setExpenses] = useState([])
  const [revenues, setRevenues] = useState([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [loadingRevenues, setLoadingRevenues] = useState(true)

  // Expense Form state
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    category: 'fixed', // 'fixed' | 'variable'
    amount: '',
    paidAt: new Date().toISOString().split('T')[0],
    description: ''
  })
  const [submittingExpense, setSubmittingExpense] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingRevenueExcel, setExportingRevenueExcel] = useState(false)

  // Revenue Form state
  const [revenueForm, setRevenueForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: ''
  })
  const [submittingRevenue, setSubmittingRevenue] = useState(false)
  const [editingRevenueId, setEditingRevenueId] = useState(null)

  // Fetch Expenses
  const fetchExpenses = async () => {
    setLoadingExpenses(true)
    try {
      const response = await client.get(`/expenses?month=${selectedMonth}`)
      setExpenses(response.data.expenses || [])
    } catch (err) {
      console.error('Error fetching expenses:', err)
      toast.error('Erreur lors du chargement des charges')
    } finally {
      setLoadingExpenses(false)
    }
  }

  // Excel Export
  const handleExportExcel = async () => {
    if (expenses.length === 0) {
      toast.warning('Aucune charge à exporter pour ce mois.')
      return
    }
    setExportingExcel(true)
    try {
      await exportExpensesExcel(expenses, selectedMonth)
      toast.success('Export Excel généré avec succès !')
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'export Excel")
    } finally {
      setExportingExcel(false)
    }
  }
  const handleExportRevenueExcel = async () => {
    if (revenues.length === 0) {
      toast.warning('Aucun revenu CA à exporter pour ce mois.')
      return
    }
    setExportingRevenueExcel(true)
    try {
      await exportRevenueExcel(revenues, selectedMonth)
      toast.success('Export Excel du CA généré avec succès !')
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'export Excel")
    } finally {
      setExportingRevenueExcel(false)
    }
  }

  // Fetch Revenues
  const fetchRevenues = async () => {
    setLoadingRevenues(true)
    try {
      const response = await client.get(`/revenues?month=${selectedMonth}`)
      setRevenues(response.data.revenues || [])
    } catch (err) {
      console.error('Error fetching revenues:', err)
      toast.error('Erreur lors du chargement des revenus CA')
    } finally {
      setLoadingRevenues(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
    fetchRevenues()
  }, [selectedMonth])

  // Expense Actions
  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    if (!expenseForm.name.trim() || !expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.error('Veuillez remplir le nom et un montant valide')
      return
    }

    setSubmittingExpense(true)
    try {
      const payload = {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        month: selectedMonth
      }

      if (editingExpenseId) {
        await client.put(`/expenses/${editingExpenseId}`, payload)
        toast.success('Charge modifiée avec succès')
        setEditingExpenseId(null)
      } else {
        await client.post('/expenses', payload)
        toast.success('Charge ajoutée avec succès')
      }

      setExpenseForm({
        name: '',
        category: 'fixed',
        amount: '',
        paidAt: new Date().toISOString().split('T')[0],
        description: ''
      })
      fetchExpenses()
    } catch (err) {
      console.error('Error saving expense:', err)
      toast.error("Erreur de sauvegarde de la charge")
    } finally {
      setSubmittingExpense(false)
    }
  }

  const handleEditExpense = (exp) => {
    setEditingExpenseId(exp._id)
    setExpenseForm({
      name: exp.name,
      category: exp.category || 'fixed',
      amount: String(exp.amount),
      paidAt: new Date(exp.paidAt).toISOString().split('T')[0],
      description: exp.description || ''
    })
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Voulez-vous supprimer cette charge ?')) return
    try {
      await client.delete(`/expenses/${id}`)
      toast.success('Charge supprimée')
      fetchExpenses()
    } catch (err) {
      console.error('Error deleting expense:', err)
      toast.error('Erreur de suppression')
    }
  }

  const handleCancelEditExpense = () => {
    setEditingExpenseId(null)
    setExpenseForm({
      name: '',
      category: 'fixed',
      amount: '',
      paidAt: new Date().toISOString().split('T')[0],
      description: ''
    })
  }

  // Revenue Actions
  const handleRevenueSubmit = async (e) => {
    e.preventDefault()
    if (!revenueForm.amount || Number(revenueForm.amount) <= 0) {
      toast.error('Veuillez entrer un montant valide')
      return
    }

    setSubmittingRevenue(true)
    try {
      if (editingRevenueId) {
        await client.put(`/revenues/${editingRevenueId}`, {
          ...revenueForm,
          amount: Number(revenueForm.amount)
        })
        toast.success('CA modifié avec succès')
        setEditingRevenueId(null)
      } else {
        await client.post('/revenues', {
          ...revenueForm,
          amount: Number(revenueForm.amount)
        })
        toast.success('CA enregistré avec succès')
      }

      setRevenueForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: ''
      })
      fetchRevenues()
    } catch (err) {
      console.error('Error saving revenue:', err)
      toast.error("Erreur de sauvegarde du CA")
    } finally {
      setSubmittingRevenue(false)
    }
  }

  const handleEditRevenue = (rev) => {
    setEditingRevenueId(rev._id)
    setRevenueForm({
      date: new Date(rev.date).toISOString().split('T')[0],
      amount: String(rev.amount),
      description: rev.description || ''
    })
  }

  const handleDeleteRevenue = async (id) => {
    if (!window.confirm('Voulez-vous supprimer cette entrée de CA ?')) return
    try {
      await client.delete(`/revenues/${id}`)
      toast.success('Revenu CA supprimé')
      fetchRevenues()
    } catch (err) {
      console.error('Error deleting revenue:', err)
      toast.error('Erreur de suppression')
    }
  }

  const handleCancelEditRevenue = () => {
    setEditingRevenueId(null)
    setRevenueForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: ''
    })
  }

  // Totals
  const totalExpensesAmount = React.useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  }, [expenses])

  const totalRevenuesAmount = React.useMemo(() => {
    return revenues.reduce((sum, r) => sum + (r.amount || 0), 0)
  }, [revenues])

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
            <Receipt className="text-emerald-600 dark:text-emerald-500" />
            <span>Finances & Charges Fixes</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gérez les charges d'exploitation de l'établissement (loyer, factures) et suivez le Chiffre d'Affaires.
          </p>
        </div>

        <MonthCarousel value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'expenses'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Receipt size={16} />
          <span>Charges & Frais Fixes</span>
        </button>
        <button
          onClick={() => setActiveTab('revenues')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'revenues'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp size={16} />
          <span>Suivi du Chiffre d'Affaires</span>
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Expense Input Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              {editingExpenseId ? 'Modifier la Charge' : 'Ajouter une Charge'}
            </h3>
            
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom du frais</label>
                <input
                  type="text"
                  placeholder="Ex: Loyer Mensuel, Électricité Lydec"
                  value={expenseForm.name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <DollarSign size={12} />
                    <span>Montant (DH)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Montant"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <Tag size={12} />
                    <span>Catégorie</span>
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none"
                  >
                    <option value="fixed">Charge Fixe</option>
                    <option value="variable">Charge Variable</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Calendar size={12} />
                  <span>Date de paiement</span>
                </label>
                <input
                  type="date"
                  value={expenseForm.paidAt}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paidAt: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  placeholder="Notes ou détails supplémentaires"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                {editingExpenseId && (
                  <button
                    type="button"
                    onClick={handleCancelEditExpense}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  {submittingExpense ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>{editingExpenseId ? 'Modifier' : 'Valider'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Expense List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Relevé des Charges</h3>
                <button
                  onClick={handleExportExcel}
                  disabled={exportingExcel || expenses.length === 0}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-sm"
                >
                  {exportingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                  <span>Exporter Excel</span>
                </button>
              </div>

              {loadingExpenses ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                  <p className="text-slate-400 text-sm">Chargement des charges...</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-20 text-center text-slate-450 text-sm">
                  Aucune charge enregistrée pour ce mois.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-550 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Charge / Intitulé</th>
                        <th className="py-4 px-4">Date Paiement</th>
                        <th className="py-4 px-4">Catégorie</th>
                        <th className="py-4 px-4 text-right">Montant</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {expenses.map((exp) => (
                        <tr key={exp._id} className="hover:bg-slate-550/5 text-sm">
                          <td className="py-4 px-6 font-bold text-slate-850 dark:text-slate-200">
                            {exp.name}
                            {exp.description && <p className="text-[11px] text-slate-450 font-normal mt-0.5">{exp.description}</p>}
                          </td>
                          <td className="py-4 px-4 font-semibold font-mono text-xs text-slate-600 dark:text-slate-400">
                            {formatDate(exp.paidAt)}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              exp.category === 'fixed' 
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' 
                                : 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400'
                            }`}>
                              {exp.category === 'fixed' ? 'Fixe' : 'Variable'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-bold font-mono text-slate-900 dark:text-slate-100">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="py-3 px-6 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleEditExpense(exp)}
                                className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Modifier"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp._id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50/20 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total Footer (Excel Style) */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Total Charges Mensuelles
              </span>
              <span className="font-extrabold text-xl text-red-650 dark:text-red-400 font-mono">
                {formatCurrency(totalExpensesAmount)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Input Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base flex items-center space-x-2">
              <CoinsIcon size={18} className="text-emerald-600" />
              <span>{editingRevenueId ? 'Modifier le CA' : 'Saisir un Chiffre d\'Affaires'}</span>
            </h3>
            
            <form onSubmit={handleRevenueSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Calendar size={12} />
                  <span>Date</span>
                </label>
                <input
                  type="date"
                  value={revenueForm.date}
                  onChange={(e) => setRevenueForm({ ...revenueForm, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Montant déclaré (DH)</label>
                <input
                  type="number"
                  placeholder="Ex: 6800"
                  value={revenueForm.amount}
                  onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Note (optionnelle)</label>
                <input
                  type="text"
                  placeholder="Ex: Événement anniversaire, etc."
                  value={revenueForm.description}
                  onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                {editingRevenueId && (
                  <button
                    type="button"
                    onClick={handleCancelEditRevenue}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingRevenue}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  {submittingRevenue ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>{editingRevenueId ? 'Modifier' : 'Valider'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Revenue List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Relevé quotidien du CA</h3>
                <button
                  onClick={handleExportRevenueExcel}
                  disabled={exportingRevenueExcel || revenues.length === 0}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-sm"
                >
                  {exportingRevenueExcel ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                  <span>Exporter Excel</span>
                </button>
              </div>

              {loadingRevenues ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                  <p className="text-slate-400 text-sm">Chargement des données CA...</p>
                </div>
              ) : revenues.length === 0 ? (
                <div className="py-20 text-center text-slate-450 text-sm">
                  Aucun revenu CA déclaré pour ce mois.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-550 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Date de déclaration</th>
                        <th className="py-4 px-4">Note / Détail</th>
                        <th className="py-4 px-4 text-right">CA Déclaré</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {revenues.map((rev) => (
                        <tr key={rev._id} className="hover:bg-slate-550/5 text-sm">
                          <td className="py-4 px-6 font-bold font-mono text-xs text-slate-800 dark:text-slate-200">
                            {formatDate(rev.date)}
                          </td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-400 font-medium">
                            {rev.description || 'Chiffre d\'affaires quotidien'}
                          </td>
                          <td className="py-4 px-4 text-right font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(rev.amount)}
                          </td>
                          <td className="py-3 px-6 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleEditRevenue(rev)}
                                className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Modifier"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteRevenue(rev._id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50/20 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total Footer (Excel Style) */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Total CA Cumulé
              </span>
              <span className="font-extrabold text-xl text-emerald-650 dark:text-emerald-400 font-mono">
                {formatCurrency(totalRevenuesAmount)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
