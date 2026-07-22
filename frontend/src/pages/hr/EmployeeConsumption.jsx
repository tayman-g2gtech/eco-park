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
  Trash2,
  Calendar,
  Layers
} from 'lucide-react'
import client from '@/api/client'
import DayCarousel from '@/components/shared/DayCarousel'
import MonthCarousel from '@/components/shared/MonthCarousel'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { exportConsumptionExcel } from '@/utils/exportConsumptionExcel'

// ─── Produits Fréquents par Défaut ─────────────────────────────────────────────
const DEFAULT_PRODUCT_NAMES = [
  "THE",
  "OEUFS",
  "PAIN COMPLET",
  "Pain blanc",
  "Zitoun",
  "MSEMEN GRANDE",
  "Msemen petit",
  "BEURRE FRAIS",
  "AMLOU",
  "Fromage",
  "Hercha",
  "CROISSANT Grande",
  "croissant petit"
]

// ─── Utility ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0]

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

  // Active product IDs shown in the current day's table
  const [activeProductIds, setActiveProductIds] = useState([])

  // Selected product ID to add from dropdown
  const [selectedToAdd, setSelectedToAdd] = useState('')

  // Daily quantities map: productId -> quantity (string)
  const [quantities, setQuantities]   = useState({})
  // Custom unit override map: productId -> unit string (ex: 'g', 'pièce', 'kg')
  const [customUnits, setCustomUnits] = useState({})

  const [savedItems, setSavedItems] = useState([])   // items from DB for the day
  const [notes, setNotes]           = useState('')
  const [loadingDay, setLoadingDay] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  // Monthly summary
  const [summary, setSummary]       = useState(null)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [exporting, setExporting]   = useState(false)
  const [monthlyViewMode, setMonthlyViewMode] = useState('byProduct') // 'byProduct' | 'byDate'

  // UI filters
  const [searchTerm, setSearchTerm]   = useState('')
  const [filterPole, setFilterPole]   = useState('All')
  const [filterCat, setFilterCat]     = useState('All')

  // ─── Fetch products catalogue ───────────────────────────────────────────────
  useEffect(() => {
    client.get('/products')
      .then(res => setProducts(res.data || []))
      .catch(() => toast.error('Erreur chargement catalogue produits'))
  }, [])

  // ─── Compute Default Product IDs ─────────────────────────────────────────────
  const defaultProductIds = useMemo(() => {
    if (!products.length) return []
    const normalizedDefaultNames = DEFAULT_PRODUCT_NAMES.map(n => n.trim().toLowerCase())
    return products
      .filter(p => normalizedDefaultNames.includes(p.name.trim().toLowerCase()))
      .map(p => p._id)
  }, [products])

  // ─── Fetch day fiche ────────────────────────────────────────────────────────
  const fetchDay = useCallback(async () => {
    setLoadingDay(true)
    setSaved(false)
    try {
      const res = await client.get(`/employee-consumptions/${selectedDate}`)
      const fiche = res.data
      setSavedItems(fiche.items || [])
      setNotes(fiche.notes || '')

      const qMap = {}
      const uMap = {}
      const savedIds = []
      fiche.items.forEach(item => {
        if (item.productId?._id) {
          qMap[item.productId._id] = String(item.quantity ?? '')
          uMap[item.productId._id] = item.unit || item.productId.unit || ''
          savedIds.push(item.productId._id)
        }
      })
      setQuantities(qMap)
      setCustomUnits(uMap)

      // Active products = defaults + any saved products
      const combined = Array.from(new Set([...defaultProductIds, ...savedIds]))
      setActiveProductIds(combined)
    } catch (err) {
      // 404 = no fiche yet → reset to defaults
      setSavedItems([])
      setNotes('')
      setQuantities({})
      setCustomUnits({})
      setActiveProductIds(defaultProductIds)
    } finally {
      setLoadingDay(false)
    }
  }, [selectedDate, defaultProductIds])

  useEffect(() => {
    if (products.length) {
      fetchDay()
    }
  }, [fetchDay, products.length])

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

  // Products available to be added (not currently active)
  const availableToAdd = useMemo(() => {
    const activeSet = new Set(activeProductIds)
    return products.filter(p => !activeSet.has(p._id)).sort((a, b) => a.name.localeCompare(b.name))
  }, [products, activeProductIds])

  // Products displayed in table (filtered from activeProductIds)
  const tableProducts = useMemo(() => {
    const activeSet = new Set(activeProductIds)
    let list = products.filter(p => activeSet.has(p._id))

    if (filterPole !== 'All') list = list.filter(p => p.pole === filterPole)
    if (filterCat  !== 'All') list = list.filter(p => p.category === filterCat)
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(s))
    }
    return list
  }, [products, activeProductIds, filterPole, filterCat, searchTerm])

  const totalFilled = useMemo(() =>
    activeProductIds.filter(id => {
      const q = (quantities[id] || '').trim()
      return q !== '' && q !== '0'
    }).length,
    [activeProductIds, quantities]
  )

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleQtyChange = (productId, value) => {
    setQuantities(prev => ({ ...prev, [productId]: value }))
    setSaved(false)
  }

  const handleUnitChange = (productId, value) => {
    setCustomUnits(prev => ({ ...prev, [productId]: value }))
    setSaved(false)
  }

  const handleIncrement = (productId) => {
    const curNum = parseFloat(quantities[productId]) || 0
    handleQtyChange(productId, String(curNum + 1))
  }

  const handleDecrement = (productId) => {
    const curNum = parseFloat(quantities[productId]) || 0
    if (curNum > 0) handleQtyChange(productId, String(curNum - 1))
  }

  const handleAddProduct = (productId) => {
    if (!productId) return
    setActiveProductIds(prev => Array.from(new Set([...prev, productId])))
    setSelectedToAdd('')
    setSaved(false)
    toast.success('Produit ajouté à la journée')
  }

  const handleRemoveProduct = (productId) => {
    setActiveProductIds(prev => prev.filter(id => id !== productId))
    setQuantities(prev => {
      const copy = { ...prev }
      delete copy[productId]
      return copy
    })
    setCustomUnits(prev => {
      const copy = { ...prev }
      delete copy[productId]
      return copy
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const items = activeProductIds
        .filter(id => {
          const q = (quantities[id] || '').trim()
          return q !== '' && q !== '0'
        })
        .map(productId => {
          const prod = products.find(p => p._id === productId)
          return {
            productId,
            quantity: (quantities[productId] || '').trim(),
            unit: (customUnits[productId] ?? (prod?.unit || '')).trim()
          }
        })

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
    setCustomUnits({})
    setNotes('')
    setActiveProductIds(defaultProductIds)
    setSaved(false)
  }

  const handleExportExcel = () => {
    if (!summary || (!summary.productTotals?.length && !summary.dailyConsumptions?.length)) return
    setExporting(true)
    try {
      exportConsumptionExcel(summary)
      toast.success('Export Excel multi-feuilles téléchargé')
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
              <UtensilsCrossed size={22} className="text-orange-500 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Consommations Employés</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">PDJ & repas non comptabilisés</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 w-fit shadow-sm">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
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
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{dateLabel}</p>
              {totalFilled > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  {totalFilled} produit{totalFilled > 1 ? 's' : ''} renseigné{totalFilled > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDay}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
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

          {/* Filters bar + Add Product selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filtrer un produit..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Pole filter */}
              <select
                value={filterPole}
                onChange={e => { setFilterPole(e.target.value); setFilterCat('All') }}
                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-300 focus:outline-none focus:border-orange-500"
              >
                {poles.map(p => <option key={p} value={p}>{p === 'All' ? 'Tous les pôles' : p}</option>)}
              </select>

              {/* Category filter */}
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-300 focus:outline-none focus:border-orange-500"
              >
                {cats.map(c => <option key={c} value={c}>{c === 'All' ? 'Toutes catégories' : c}</option>)}
              </select>

              {/* ➕ Ajouter un produit au jour */}
              {availableToAdd.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    value={selectedToAdd}
                    onChange={e => {
                      setSelectedToAdd(e.target.value)
                      if (e.target.value) handleAddProduct(e.target.value)
                    }}
                    className="px-3 py-2 text-sm bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-300 font-medium rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="">➕ Ajouter un autre produit...</option>
                    {availableToAdd.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Products table */}
          {loadingDay ? (
            <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
              <Loader2 size={24} className="animate-spin mr-3 text-orange-500" />
              Chargement...
            </div>
          ) : tableProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3">
              <UtensilsCrossed size={32} className="opacity-40" />
              <p className="text-sm font-medium">Aucun produit à afficher pour ce jour</p>
              {availableToAdd.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <select
                    onChange={e => {
                      if (e.target.value) handleAddProduct(e.target.value)
                    }}
                    defaultValue=""
                    className="px-3 py-2 text-sm bg-orange-600 text-white font-semibold rounded-lg focus:outline-none"
                  >
                    <option value="" disabled>➕ Sélectionner un produit à ajouter</option>
                    {availableToAdd.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produit</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Catégorie</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pôle</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unité de mesure</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tableProducts.map(prod => {
                    const qty = quantities[prod._id] ?? ''
                    const unitVal = customUnits[prod._id] ?? prod.unit ?? ''
                    const hasValue = qty.trim() !== '' && qty.trim() !== '0'

                    return (
                      <tr
                        key={prod._id}
                        className={`transition-colors duration-150 ${
                          hasValue
                            ? 'bg-orange-50/60 dark:bg-orange-950/20 hover:bg-orange-100/60 dark:hover:bg-orange-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Product name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {hasValue && (
                              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 dark:bg-orange-400 shrink-0" />
                            )}
                            <span className={`font-medium ${hasValue ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                              {prod.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{prod.category || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                            prod.pole === 'PDJ' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                            prod.pole === 'Bar' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400' :
                            prod.pole === 'Creperie' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            {prod.pole}
                          </span>
                        </td>

                        {/* Free Quantity input with ± buttons */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDecrement(prod._id)}
                              disabled={!hasValue}
                              className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="text"
                              value={qty}
                              onChange={e => handleQtyChange(prod._id, e.target.value)}
                              placeholder="0"
                              className={`w-24 text-center py-1.5 text-sm rounded-lg border transition-all ${
                                hasValue
                                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-300 font-semibold'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                              } focus:outline-none focus:border-orange-500`}
                            />
                            <button
                              onClick={() => handleIncrement(prod._id)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-600 dark:hover:bg-orange-700 text-slate-600 dark:text-slate-400 hover:text-white transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </td>

                        {/* Free Custom Unit input */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="text"
                            value={unitVal}
                            onChange={e => handleUnitChange(prod._id, e.target.value)}
                            placeholder={prod.unit}
                            className="w-20 text-center py-1 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
                          />
                        </td>

                        {/* Remove action */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveProduct(prod._id)}
                            title="Retirer ce produit de la journée"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes field */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Notes / Remarques
            </label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setSaved(false) }}
              placeholder="Ex: manque de pain ce matin, repas spécial..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none transition-colors"
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

          {/* Header + Mode View Toggle + Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: fr })}
              </p>
              {summary && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {summary.totalDays} jour{summary.totalDays > 1 ? 's' : ''} saisi{summary.totalDays > 1 ? 's' : ''} ce mois
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle par Produit vs par Date */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs">
                <button
                  onClick={() => setMonthlyViewMode('byProduct')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                    monthlyViewMode === 'byProduct'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 size={13} />
                  Par Produit
                </button>
                <button
                  onClick={() => setMonthlyViewMode('byDate')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                    monthlyViewMode === 'byDate'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar size={13} />
                  Par Date du Jour
                </button>
              </div>

              <button
                onClick={handleExportExcel}
                disabled={exporting || !summary || (!summary.productTotals?.length && !summary.dailyConsumptions?.length)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                Export Excel
              </button>
            </div>
          </div>

          {/* Stats cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Jours saisis</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.totalDays}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Produits distincts</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.productTotals?.length || 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Mois</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 capitalize">
                  {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          )}

          {/* Monthly content */}
          {loadingMonth ? (
            <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
              <Loader2 size={24} className="animate-spin mr-3 text-orange-500" />
              Chargement du récapitulatif...
            </div>
          ) : !summary || (!summary.productTotals?.length && !summary.dailyConsumptions?.length) ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <AlertCircle size={32} className="mb-3 opacity-40" />
              <p className="text-sm">Aucune donnée pour ce mois</p>
              <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Commencez la saisie dans l'onglet Journalier</p>
            </div>
          ) : monthlyViewMode === 'byProduct' ? (
            /* ── Vue 1: PAR PRODUIT ── */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produit</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Catégorie</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pôle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unité</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total consommé</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jours présents</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Moy/jour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summary.productTotals.map(pt => {
                    const avg = summary.totalDays > 0
                      ? (pt.totalQuantity / summary.totalDays).toFixed(1)
                      : 0
                    const unit = pt.unit || pt.product.unit || ''
                    return (
                      <tr key={pt.product._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{pt.product.name}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{pt.product.category || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                            pt.product.pole === 'PDJ' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                            pt.product.pole === 'Bar' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400' :
                            pt.product.pole === 'Creperie' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            {pt.product.pole}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{unit}</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600 dark:text-orange-300">
                          {pt.totalQuantity} <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">{unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{pt.daysPresent}</td>
                        <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 text-xs">
                          {avg} {unit}/j
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Vue 2: GROUPÉ PAR DATE DU JOUR ── */
            <div className="space-y-4">
              {summary.dailyConsumptions?.map(fiche => {
                const formattedDate = format(parseISO(fiche.date), 'EEEE d MMMM yyyy', { locale: fr })

                return (
                  <div
                    key={fiche.date}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                  >
                    {/* Date Header Card */}
                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                          <Calendar size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                            {formattedDate}
                          </h3>
                          {fiche.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                              Note : {fiche.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {fiche.items?.length || 0} produit{(fiche.items?.length || 0) > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Table of items for this date */}
                    {fiche.items && fiche.items.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs uppercase">
                            <th className="text-left px-5 py-2">Produit</th>
                            <th className="text-left px-4 py-2">Catégorie</th>
                            <th className="text-left px-4 py-2">Pôle</th>
                            <th className="text-right px-5 py-2">Quantité</th>
                            <th className="text-left px-4 py-2">Unité</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {fiche.items.map(item => {
                            if (!item.productId) return null
                            const unit = item.unit || item.productId.unit || '—'
                            return (
                              <tr key={item.productId._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                                  {item.productId.name}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">
                                  {item.productId.category || '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                    item.productId.pole === 'PDJ' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                                    item.productId.pole === 'Bar' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400' :
                                    item.productId.pole === 'Creperie' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400' :
                                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}>
                                    {item.productId.pole}
                                  </span>
                                </td>
                                <td className="px-5 py-2.5 text-right font-bold text-orange-600 dark:text-orange-300">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">
                                  {unit}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-xs text-slate-400 text-center">Aucune saisie pour cette date</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
