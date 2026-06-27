import React, { useState, useEffect } from 'react'
import {
  Package,
  Search,
  Save,
  Check,
  AlertTriangle,
  RotateCcw,
  Loader2,
  SlidersHorizontal,
  FileDown
} from 'lucide-react'
import client from '@/api/client'
import DayCarousel from '@/components/shared/DayCarousel'
import { toast } from 'sonner'
import { exportStockExcel } from '@/utils/exportStockExcel'

export default function StockMovements() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0] // YYYY-MM-DD
  })
  const [selectedPole, setSelectedPole] = useState('PDJ')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  
  // Data states
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [yesterdayMovements, setYesterdayMovements] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [savingRows, setSavingRows] = useState({}) // product_id -> bool
  const [savingAll, setSavingAll] = useState(false)
  const [editedData, setEditedData] = useState({}) // product_id -> { added, consumed }
  const [exporting, setExporting] = useState(false)
  
  // Fetch products, movements, and yesterday's data
  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodRes, moveRes, yestRes] = await Promise.all([
        client.get(`/products?pole=${selectedPole}`),
        client.get(`/stock-movements?date=${selectedDate}&pole=${selectedPole}`),
        client.get(`/stock-movements/yesterday?date=${selectedDate}&pole=${selectedPole}`)
      ])
      
      setProducts(prodRes.data)
      setMovements(moveRes.data)
      setYesterdayMovements(yestRes.data)
      
      // Reset edited state
      setEditedData({})
    } catch (err) {
      console.error('Error fetching stock movements:', err)
      toast.error('Erreur lors du chargement des données de stock')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate, selectedPole])

  // Get categories from products for filter
  const categories = React.useMemo(() => {
    const list = new Set(products.map(p => p.category).filter(Boolean))
    return ['All', ...Array.from(list)]
  }, [products])

  // Map products with movement details
  const tableData = React.useMemo(() => {
    return products.map(prod => {
      const todayMove = movements.find(m => m.productId?._id === prod._id || m.productId === prod._id)
      const yesterdayMove = yesterdayMovements.find(m => m.productId?._id === prod._id || m.productId === prod._id)
      
      const yesterdayStock = yesterdayMove ? yesterdayMove.remainingStock : 0
      
      // Determine current values (either from user edits, today's saved movement, or defaults)
      const isEdited = editedData[prod._id] !== undefined
      const addedQuantity = isEdited 
        ? editedData[prod._id].added 
        : (todayMove ? todayMove.addedQuantity : 0)
      const consumedQuantity = isEdited 
        ? editedData[prod._id].consumed 
        : (todayMove ? todayMove.consumedQuantity : 0)
        
      const remainingStock = yesterdayStock + Number(addedQuantity || 0) - Number(consumedQuantity || 0)
      const isUnderAlert = remainingStock <= prod.quantityAlert
      
      return {
        product: prod,
        yesterdayStock,
        addedQuantity,
        consumedQuantity,
        remainingStock,
        isUnderAlert,
        movementId: todayMove ? todayMove._id : null,
        isSaved: todayMove && !isEdited
      }
    })
  }, [products, movements, yesterdayMovements, editedData])

  // Filtered table data
  const filteredData = React.useMemo(() => {
    return tableData.filter(row => {
      const matchSearch = row.product.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCat = selectedCategory === 'All' || row.product.category === selectedCategory
      return matchSearch && matchCat
    })
  }, [tableData, searchTerm, selectedCategory])

  const handleInputChange = (productId, field, val) => {
    const numVal = val === '' ? '' : Math.max(0, Number(val))
    
    // Find original values
    const todayMove = movements.find(m => m.productId?._id === productId || m.productId === productId)
    const originalAdded = todayMove ? todayMove.addedQuantity : 0
    const originalConsumed = todayMove ? todayMove.consumedQuantity : 0

    const currentEdits = editedData[productId] || { 
      added: todayMove ? todayMove.addedQuantity : 0, 
      consumed: todayMove ? todayMove.consumedQuantity : 0 
    }

    const updatedEdits = {
      ...currentEdits,
      [field]: numVal
    }

    // If values are reset back to original, remove from editedData
    if (updatedEdits.added === originalAdded && updatedEdits.consumed === originalConsumed) {
      const copy = { ...editedData }
      delete copy[productId]
      setEditedData(copy)
    } else {
      setEditedData({
        ...editedData,
        [productId]: updatedEdits
      })
    }
  }

  // Save a single row
  const handleSaveRow = async (row) => {
    const prodId = row.product._id
    setSavingRows(prev => ({ ...prev, [prodId]: true }))
    
    try {
      await client.post('/stock-movements', {
        productId: prodId,
        date: selectedDate,
        pole: selectedPole,
        yesterdayStock: row.yesterdayStock,
        addedQuantity: row.addedQuantity || 0,
        consumedQuantity: row.consumedQuantity || 0
      })
      
      toast.success(`${row.product.name} enregistré`)
      
      // Update local movements list
      const moveRes = await client.get(`/stock-movements?date=${selectedDate}&pole=${selectedPole}`)
      setMovements(moveRes.data)
      
      // Remove from edited state
      setEditedData(prev => {
        const copy = { ...prev }
        delete copy[prodId]
        return copy
      })
    } catch (err) {
      console.error('Error saving movement:', err)
      toast.error(`Erreur lors de l'enregistrement de ${row.product.name}`)
    } finally {
      setSavingRows(prev => ({ ...prev, [prodId]: false }))
    }
  }

  // Save all modified rows
  const handleSaveAll = async () => {
    const modifiedRows = tableData.filter(r => editedData[r.product._id] !== undefined)
    if (modifiedRows.length === 0) {
      toast.info('Aucun changement à enregistrer')
      return
    }

    setSavingAll(true)
    let successCount = 0
    
    try {
      for (const row of modifiedRows) {
        await client.post('/stock-movements', {
          productId: row.product._id,
          date: selectedDate,
          pole: selectedPole,
          yesterdayStock: row.yesterdayStock,
          addedQuantity: row.addedQuantity || 0,
          consumedQuantity: row.consumedQuantity || 0
        })
        successCount++
      }
      
      toast.success(`${successCount} produits enregistrés avec succès !`)
      
      // Reload
      const moveRes = await client.get(`/stock-movements?date=${selectedDate}&pole=${selectedPole}`)
      setMovements(moveRes.data)
      setEditedData({})
    } catch (err) {
      console.error('Error saving all movements:', err)
      toast.error("Erreur partielle lors de l'enregistrement global")
    } finally {
      setSavingAll(false)
    }
  }

  const handleResetRow = (productId) => {
    setEditedData(prev => {
      const copy = { ...prev }
      delete copy[productId]
      return copy
    })
  }

  // Export all 3 poles to a single multi-sheet Excel workbook
  const handleExport = async () => {
    setExporting(true)
    try {
      const fileName = await exportStockExcel(selectedDate)
      toast.success(`📥 Export réussi : ${fileName}`, { duration: 4000 })
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Erreur lors de la génération du fichier Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
            <Package className="text-emerald-600 dark:text-emerald-500" />
            <span>Mouvements de Stock</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Déclarez quotidiennement les entrées et consommations de stock.
          </p>
        </div>
        
        {/* Navigation Date */}
        <DayCarousel value={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Pôle Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl max-w-md border border-slate-200/60 dark:border-slate-800/80">
        {['PDJ', 'Bar', 'Creperie'].map((pole) => (
          <button
            key={pole}
            onClick={() => setSelectedPole(pole)}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
              selectedPole === pole
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {pole === 'Creperie' ? 'Crêperie' : pole}
          </button>
        ))}
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'Toutes Catégories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Global Save Button — only visible when edits are pending */}
          {Object.keys(editedData).length > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={savingAll}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl py-2.5 px-5 shadow-sm active:scale-[0.98] transition-all flex items-center space-x-2"
            >
              {savingAll ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>Enregistrer tout ({Object.keys(editedData).length})</span>
            </button>
          )}

          {/* Export Excel Button — always visible */}
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            title="Exporter les 3 pôles en Excel (PDJ, Bar, Crêperie)"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl py-2.5 px-5 shadow-sm active:scale-[0.98] transition-all"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            <span>{exporting ? 'Génération...' : 'Exporter Excel'}</span>
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
            <p className="text-slate-400 text-sm">Chargement des stocks...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Aucun produit trouvé dans cette catégorie.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Produit</th>
                  <th className="py-4 px-4">Catégorie</th>
                  <th className="py-4 px-4 text-center">Unité</th>
                  <th className="py-4 px-4 text-right bg-slate-100/30 dark:bg-slate-950/20">Reste Hier</th>
                  <th className="py-4 px-4 text-center bg-emerald-50/10 dark:bg-emerald-950/5">Ajouté (+)</th>
                  <th className="py-4 px-4 text-center bg-red-50/10 dark:bg-red-950/5">Consommé (-)</th>
                  <th className="py-4 px-4 text-right bg-slate-100/30 dark:bg-slate-950/20 font-bold">Reste Aujourd'hui</th>
                  <th className="py-4 px-4 text-center">Alerte</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredData.map((row) => {
                  const prodId = row.product._id
                  const isModified = editedData[prodId] !== undefined
                  const isSaving = savingRows[prodId] || false
                  
                  return (
                    <tr 
                      key={prodId} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors text-sm ${
                        isModified ? 'bg-emerald-50/5 dark:bg-emerald-950/5' : ''
                      }`}
                    >
                      <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                        {row.product.name}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {row.product.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-500 font-medium">
                        {row.product.unit}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-600 dark:text-slate-400 bg-slate-100/20 dark:bg-slate-950/10">
                        {row.yesterdayStock}
                      </td>
                      
                      {/* Added input */}
                      <td className="py-3 px-4 text-center bg-emerald-50/10 dark:bg-emerald-950/5">
                        <input
                          type="number"
                          value={row.addedQuantity === 0 && !isModified ? '' : row.addedQuantity}
                          placeholder="0"
                          onChange={(e) => handleInputChange(prodId, 'added', e.target.value)}
                          className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 text-center py-1.5 px-2 rounded-lg text-sm font-mono focus:outline-none"
                          min="0"
                          step="0.01"
                        />
                      </td>

                      {/* Consumed input */}
                      <td className="py-3 px-4 text-center bg-red-50/10 dark:bg-red-950/5">
                        <input
                          type="number"
                          value={row.consumedQuantity === 0 && !isModified ? '' : row.consumedQuantity}
                          placeholder="0"
                          onChange={(e) => handleInputChange(prodId, 'consumed', e.target.value)}
                          className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-red-500 text-center py-1.5 px-2 rounded-lg text-sm font-mono focus:outline-none"
                          min="0"
                          step="0.01"
                        />
                      </td>

                      {/* Calculated remaining */}
                      <td className={`py-4 px-4 text-right font-bold font-mono bg-slate-100/20 dark:bg-slate-950/10 ${
                        row.isUnderAlert 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-slate-950 dark:text-slate-100'
                      }`}>
                        {row.remainingStock.toFixed(2).replace(/\.00$/, '')}
                      </td>

                      {/* Alert State Badge */}
                      <td className="py-4 px-4 text-center">
                        {row.isUnderAlert ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200/40 dark:border-red-900/30 animate-pulse">
                            <AlertTriangle size={12} />
                            <span>Critique ({row.product.quantityAlert})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Row actions */}
                      <td className="py-3 px-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {isModified ? (
                            <>
                              <button
                                onClick={() => handleSaveRow(row)}
                                disabled={isSaving}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg hover:shadow-sm transition-all"
                                title="Enregistrer la ligne"
                              >
                                {isSaving ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                              </button>
                              <button
                                onClick={() => handleResetRow(prodId)}
                                className="text-slate-400 hover:text-slate-650 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Réinitialiser"
                              >
                                <RotateCcw size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                              Enregistré
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
        )}
      </div>
    </div>
  )
}
