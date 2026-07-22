import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  UtensilsCrossed,
  Search,
  Save,
  RefreshCw,
  Loader2,
  Check,
  CalendarDays,
  BarChart3,
  FileDown,
  Plus,
  Minus,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import client from '@/api/client'
import DayCarousel from '@/components/shared/DayCarousel'
import MonthCarousel from '@/components/shared/MonthCarousel'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { exportConsumptionExcel } from '@/utils/exportConsumptionExcel'

// ─── Utility ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0]
const monthStr = (date) => date.slice(0, 7)

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'daily',   label: 'Saisie Journalière', icon: CalendarDays },
  { key: 'monthly', label: 'Récapitulatif Mensuel', icon: BarChart3 }
]

export default function EmployeeConsumption() {
  const [activeTab, setActiveTab]       = useState('daily')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedMonth, setSelectedMonth] = useState(() => todayStr().slice(0, 7))

  // Product catalogue
  const [products, setProducts]   = useState([])

  // Daily quantities map: productId -> quantity (string for input)
  const [quantities, setQuantities] = useState({})
  const [savedItems, setSavedItems] = useState([])   // items from DB for the day
  const [notes, setNotes]           = useState('')
  const [loadingDay, setLoadingDay] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  // Monthly summary
  const [summary, setSummary]       = useState(null)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [exporting, setExporting]   = useState(false)

  // UI filters
  const [searchTerm, setSearchTerm]   = useState('')
  const [filterPole, setFilterPole]   = useState('All')
  const [filterCat, setFilterCat]     = useState('All')
  const [showOnlyFilled, setShowOnlyFilled] = useState(false)

  // ─── Fetch products catalogue ───────────────────────────────────────────────
  useEffect(() => {
    client.get('/products')
      .then(res => setProducts(res.data || []))
      .catch(() => toast.error('Erreur chargement catalogue produits'))
  }, [])

  // ─── Fetch day fiche ────────────────────────────────────────────────────────
  const fetchDay = useCallback(async () => {
    setLoadingDay(true)
    setSaved(false)
    try {
      const res = await client.get(`/employee-consumptions/${selectedDate}`)
      const fiche = res.data
      setSavedItems(fiche.items || [])
      setNotes(fiche.notes || '')
      // Init quantities from saved data
      const qMap = {}
      fiche.items.forEach(item => {
        if (item.productId?._id) qMap[item.productId._id] = String(item.quantity)
      })
      setQuantities(qMap)
    } catch (err) {
      // 404 = no fiche yet → reset
      setSavedItems([])
      setNotes('')
      setQuantities({})
    } finally {
      setLoadingDay(false)
    }
  }, [selectedDate])

  useEffect(() => { fetchDay() }, [fetchDay])

  // ─── Fetch monthly summary ──────────────────────────────────────────────────
  const fetchMonth = useCallback(async () => {
    setLoadingMonth(true)
    try {
      const res = await client.get(`/employee-consumptions/summary?month=${selectedMonth}`)
      setSummary(res.data)
    } catch {
      setSummary(null)
      toast.error('Erreur chargement récapitulatif mensuel')
    } finally {
      setLoadingMonth(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    if (activeTab === 'monthly') fetchMonth()
  }, [activeTab, fetchMonth])

  // ─── Derived data ───────────────────────────────────────────────────────────
  const poles    = useMemo(() => ['All', ...new Set(products.map(p => p.pole))], [products])
  const cats     = useMemo(() => {
    const src = filterPole === 'All' ? products : products.filter(p => p.pole === filterPole)
    return ['All', ...new Set(src.map(p => p.category).filter(Boolean))]
  }, [products, filterPole])

  const filteredProducts = useMemo(() => {
    let list = products
    if (filterPole !== 'All') list = list.filter(p => p.pole === filterPole)
    if (filterCat  !== 'All') list = list.filter(p => p.category === filterCat)
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(s))
    }
    if (showOnlyFilled) list = list.filter(p => Number(quantities[p._id]) > 0)
    return list
  }, [products, filterPole, filterCat, searchTerm, quantities, showOnlyFilled])

  const totalFilled = useMemo(() =>
    products.filter(p => Number(quantities[p._id]) > 0).length,
    [products, quantities]
  )

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleQtyChange = (productId, value) => {
    // Allow empty string (clearing) or positive numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setQuantities(prev => ({ ...prev, [productId]: value }))
      setSaved(false)
    }
  }

  const handleIncrement = (productId, unit) => {
    const cur = Number(quantities[productId] || 0)
    handleQtyChange(productId, String(cur + 1))
  }

  const handleDecrement = (productId) => {
    const cur = Number(quantities[productId] || 0)
    if (cur > 0) handleQtyChange(productId, String(cur - 1))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const items = Object.entries(quantities)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([productId, qty]) => ({ productId, quantity: Number(qty) }))

      await client.post('/employee-consumptions', { date: selectedDate, items, notes })
      setSaved(true)
      toast.success('Consommations enregistrées ✓')
      fetchDay()
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleResetDay = () => {
    setQuantities({})
    setNotes('')
    setSaved(false)
  }

  const handleExportExcel = () => {
    if (!summary || !summary.productTotals?.length) return
    setExporting(true)
    try {
      exportConsumptionExcel(summary)
      toast.success('Export Excel téléchargé')
    } catch {
      toast.error('Erreur lors de l\'export Excel')
    } finally {
      setExporting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const dateLabel = selectedDate
    ? format(parseISO(selectedDate), "EEEE d MMMM yyyy", { locale: fr })
    : ''

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <UtensilsCrossed size={22} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Consommations Employés</h1>
              <p className="text-xs text-slate-400 mt-0.5">PDJ & repas non comptabilisés</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB : SAISIE JOURNALIÈRE
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'daily' && (
        <div className="space-y-5">

          {/* Day picker */}
          <DayCarousel value={selectedDate} onChange={setSelectedDate} />

          {/* Date label + save button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-200 capitalize">{dateLabel}</p>
              {totalFilled > 0 && (
                <p className="text-xs text-orange-400 mt-0.5">
                  {totalFilled} produit{totalFilled > 1 ? 's' : ''} renseigné{totalFilled > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDay}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RefreshCw size={14} />
                Réinitialiser
              </button>
              <button
                onClick={handleSave}
                disabled={saving || totalFilled === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  saved
                    ? 'bg-emerald-600 text-white'
                    : totalFilled === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-950/30'
                }`}
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : saved ? (
                  <Check size={15} />
                ) : (
                  <Save size={15} />
                )}
                {saved ? 'Enregistré' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* Filters bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Pole filter */}
              <select
                value={filterPole}
                onChange={e => { setFilterPole(e.target.value); setFilterCat('All') }}
                className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-orange-500"
              >
                {poles.map(p => <option key={p} value={p}>{p === 'All' ? 'Tous les pôles' : p}</option>)}
              </select>

              {/* Category filter */}
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-orange-500"
              >
                {cats.map(c => <option key={c} value={c}>{c === 'All' ? 'Toutes catégories' : c}</option>)}
              </select>

              {/* Show only filled */}
              <button
                onClick={() => setShowOnlyFilled(v => !v)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  showOnlyFilled
                    ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                Renseignés seulement
              </button>
            </div>
          </div>

          {/* Products table */}
          {loadingDay ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-3" />
              Chargement...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
              <UtensilsCrossed size={32} className="mb-3 opacity-40" />
              <p className="text-sm">Aucun produit trouvé</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Produit</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Catégorie</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Pôle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Unité</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Quantité consommée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredProducts.map(prod => {
                    const qty = quantities[prod._id] || ''
                    const hasValue = Number(qty) > 0

                    return (
                      <tr
                        key={prod._id}
                        className={`transition-colors duration-150 ${
                          hasValue
                            ? 'bg-orange-950/20 hover:bg-orange-950/30'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Product name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {hasValue && (
                              <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                            )}
                            <span className={`font-medium ${hasValue ? 'text-slate-100' : 'text-slate-300'}`}>
                              {prod.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{prod.category || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                            prod.pole === 'PDJ' ? 'bg-amber-500/15 text-amber-400' :
                            prod.pole === 'Bar' ? 'bg-blue-500/15 text-blue-400' :
                            prod.pole === 'Creperie' ? 'bg-purple-500/15 text-purple-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            {prod.pole}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{prod.unit}</td>

                        {/* Quantity input with ± buttons */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDecrement(prod._id)}
                              disabled={!hasValue}
                              className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={qty}
                              onChange={e => handleQtyChange(prod._id, e.target.value)}
                              placeholder="0"
                              className={`w-20 text-center py-1.5 text-sm rounded-lg border transition-all ${
                                hasValue
                                  ? 'bg-orange-600/10 border-orange-500/40 text-orange-300 font-semibold'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              } focus:outline-none focus:border-orange-500`}
                            />
                            <button
                              onClick={() => handleIncrement(prod._id)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-orange-700 text-slate-400 hover:text-white transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes field */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Notes / Remarques
            </label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setSaved(false) }}
              placeholder="Ex: manque de pain ce matin, repas spécial..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB : RÉCAPITULATIF MENSUEL
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'monthly' && (
        <div className="space-y-5">

          {/* Month picker */}
          <MonthCarousel value={selectedMonth} onChange={setSelectedMonth} />

          {/* Header + export */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: fr })}
              </p>
              {summary && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {summary.totalDays} jour{summary.totalDays > 1 ? 's' : ''} saisi{summary.totalDays > 1 ? 's' : ''} ce mois
                </p>
              )}
            </div>
            <button
              onClick={handleExportExcel}
              disabled={exporting || !summary || !summary.productTotals?.length}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
              Export Excel
            </button>
          </div>

          {/* Stats cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Jours saisis</p>
                <p className="text-2xl font-bold text-slate-100">{summary.totalDays}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Produits distincts</p>
                <p className="text-2xl font-bold text-orange-400">{summary.productTotals?.length || 0}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 mb-1">Mois</p>
                <p className="text-lg font-bold text-slate-200 capitalize">
                  {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          )}

          {/* Monthly table */}
          {loadingMonth ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-3" />
              Chargement du récapitulatif...
            </div>
          ) : !summary || !summary.productTotals?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
              <AlertCircle size={32} className="mb-3 opacity-40" />
              <p className="text-sm">Aucune donnée pour ce mois</p>
              <p className="text-xs mt-1 text-slate-600">Commencez la saisie dans l'onglet Journalier</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Produit</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Catégorie</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Pôle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Unité</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Total consommé</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Jours présents</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Moy/jour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {summary.productTotals.map(pt => {
                    const avg = summary.totalDays > 0
                      ? (pt.totalQuantity / summary.totalDays).toFixed(1)
                      : 0
                    return (
                      <tr key={pt.product._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-200">{pt.product.name}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{pt.product.category || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                            pt.product.pole === 'PDJ' ? 'bg-amber-500/15 text-amber-400' :
                            pt.product.pole === 'Bar' ? 'bg-blue-500/15 text-blue-400' :
                            pt.product.pole === 'Creperie' ? 'bg-purple-500/15 text-purple-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            {pt.product.pole}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{pt.product.unit}</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-300">
                          {pt.totalQuantity} <span className="text-slate-500 font-normal text-xs">{pt.product.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">{pt.daysPresent}</td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                          {avg} {pt.product.unit}/j
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
