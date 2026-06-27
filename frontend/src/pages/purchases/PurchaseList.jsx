import React, { useState, useEffect } from 'react'
import { 
  ShoppingCart, 
  Store, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Coins, 
  Calendar,
  Layers,
  FileText,
  FileDown
} from 'lucide-react'
import client from '@/api/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import MonthCarousel from '@/components/shared/MonthCarousel'
import { toast } from 'sonner'
import { exportPurchasesExcel } from '@/utils/exportPurchasesExcel'

export default function PurchaseList() {
  const [activeTab, setActiveTab] = useState('purchases') // 'purchases' | 'suppliers'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7) // YYYY-MM
  })
  
  // Data states
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loadingPurchases, setLoadingPurchases] = useState(true)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)

  // Filter state
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('All')

  // Purchase Form states
  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    amount: '',
    paymentMethod: 'ESPECE',
    invoiceNumber: '',
    notes: ''
  })
  const [submittingPurchase, setSubmittingPurchase] = useState(false)
  const [editingPurchaseId, setEditingPurchaseId] = useState(null)
  const [exportingExcel, setExportingExcel] = useState(false)

  // Supplier Form states
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    category: 'Viandes',
    paymentMethod: 'ESPECE'
  })
  const [submittingSupplier, setSubmittingSupplier] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState(null)

  // Fetch Purchases
  const fetchPurchases = async () => {
    setLoadingPurchases(true)
    try {
      const url = `/purchases?month=${selectedMonth}`
      const response = await client.get(url)
      setPurchases(response.data.purchases || [])
    } catch (err) {
      console.error('Error fetching purchases:', err)
      toast.error('Erreur lors du chargement des achats')
    } finally {
      setLoadingPurchases(false)
    }
  }

  // Excel Export
  const handleExportExcel = async () => {
    if (filteredPurchases.length === 0) {
      toast.warning('Aucun achat à exporter pour ce mois.')
      return
    }
    setExportingExcel(true)
    try {
      await exportPurchasesExcel(filteredPurchases, selectedMonth)
      toast.success('Export Excel généré avec succès !')
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'export Excel")
    } finally {
      setExportingExcel(false)
    }
  }

  // Fetch Suppliers
  const fetchSuppliers = async () => {
    setLoadingSuppliers(true)
    try {
      const response = await client.get('/suppliers')
      setSuppliers(response.data)
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      toast.error('Erreur lors du chargement des fournisseurs')
    } finally {
      setLoadingSuppliers(false)
    }
  }

  useEffect(() => {
    fetchPurchases()
  }, [selectedMonth])

  useEffect(() => {
    fetchSuppliers()
  }, [])

  // Auto-set payment method when supplier changes in purchase form
  const handleSupplierChangeInForm = (suppId) => {
    const supp = suppliers.find(s => s._id === suppId)
    setPurchaseForm(prev => ({
      ...prev,
      supplierId: suppId,
      paymentMethod: supp ? (supp.defaultPaymentMethod || supp.paymentMethod || 'ESPECE') : 'ESPECE'
    }))
  }

  // Purchase CRUD Actions
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault()
    if (!purchaseForm.supplierId || !purchaseForm.amount || Number(purchaseForm.amount) <= 0) {
      toast.error('Veuillez remplir le fournisseur et un montant valide')
      return
    }

    setSubmittingPurchase(true)
    try {
      if (editingPurchaseId) {
        await client.put(`/purchases/${editingPurchaseId}`, {
          ...purchaseForm,
          amount: Number(purchaseForm.amount)
        })
        toast.success('Achat modifié avec succès !')
        setEditingPurchaseId(null)
      } else {
        await client.post('/purchases', {
          ...purchaseForm,
          amount: Number(purchaseForm.amount)
        })
        toast.success('Achat enregistré avec succès !')
      }
      
      // Reset form
      setPurchaseForm({
        date: new Date().toISOString().split('T')[0],
        supplierId: '',
        amount: '',
        paymentMethod: 'ESPECE',
        invoiceNumber: '',
        notes: ''
      })
      fetchPurchases()
    } catch (err) {
      console.error('Error saving purchase:', err)
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de l'achat")
    } finally {
      setSubmittingPurchase(false)
    }
  }

  const handleEditPurchase = (p) => {
    setEditingPurchaseId(p._id)
    setPurchaseForm({
      date: new Date(p.date).toISOString().split('T')[0],
      supplierId: p.supplierId?._id || p.supplierId || '',
      amount: String(p.amount),
      paymentMethod: p.paymentMethod || 'ESPECE',
      invoiceNumber: p.invoiceNumber || '',
      notes: p.notes || ''
    })
  }

  const handleDeletePurchase = async (id) => {
    if (!window.confirm('Voulez-vous supprimer cet achat ?')) return
    try {
      await client.delete(`/purchases/${id}`)
      toast.success('Achat supprimé')
      fetchPurchases()
    } catch (err) {
      console.error('Error deleting purchase:', err)
      toast.error("Erreur lors de la suppression de l'achat")
    }
  }

  const handleCancelEditPurchase = () => {
    setEditingPurchaseId(null)
    setPurchaseForm({
      date: new Date().toISOString().split('T')[0],
      supplierId: '',
      amount: '',
      paymentMethod: 'ESPECE',
      invoiceNumber: '',
      notes: ''
    })
  }

  // Supplier CRUD Actions
  const handleSupplierSubmit = async (e) => {
    e.preventDefault()
    if (!supplierForm.name.trim()) {
      toast.error('Veuillez entrer le nom du fournisseur')
      return
    }

    setSubmittingSupplier(true)
    try {
      if (editingSupplierId) {
        await client.put(`/suppliers/${editingSupplierId}`, supplierForm)
        toast.success('Fournisseur modifié !')
        setEditingSupplierId(null)
      } else {
        await client.post('/suppliers', supplierForm)
        toast.success('Fournisseur créé !')
      }

      setSupplierForm({
        name: '',
        phone: '',
        category: 'Viandes',
        paymentMethod: 'ESPECE'
      })
      fetchSuppliers()
    } catch (err) {
      console.error('Error saving supplier:', err)
      toast.error("Erreur de sauvegarde du fournisseur")
    } finally {
      setSubmittingSupplier(false)
    }
  }

  const handleEditSupplier = (s) => {
    setEditingSupplierId(s._id)
    setSupplierForm({
      name: s.name,
      phone: s.phone || '',
      category: s.category || 'Viandes',
      paymentMethod: s.defaultPaymentMethod || s.paymentMethod || 'ESPECE'
    })
  }

  const handleDeleteSupplier = async (id, name) => {
    if (!window.confirm(`Supprimer le fournisseur "${name}" ?`)) return
    try {
      await client.delete(`/suppliers/${id}`)
      toast.success('Fournisseur archivé')
      fetchSuppliers()
    } catch (err) {
      console.error('Error deleting supplier:', err)
      toast.error("Erreur de suppression")
    }
  }

  const handleCancelEditSupplier = () => {
    setEditingSupplierId(null)
    setSupplierForm({
      name: '',
      phone: '',
      category: 'Viandes',
      paymentMethod: 'ESPECE'
    })
  }

  // Filtered Purchases list
  const filteredPurchases = React.useMemo(() => {
    return purchases.filter(p => {
      if (selectedSupplierFilter === 'All') return true
      const id = p.supplierId?._id || p.supplierId
      return id === selectedSupplierFilter
    })
  }, [purchases, selectedSupplierFilter])

  // Total amount computed
  const totalPurchasesAmount = React.useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + (p.amount || 0), 0)
  }, [filteredPurchases])

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
            <ShoppingCart className="text-emerald-600 dark:text-emerald-500" />
            <span>Achats & Fournisseurs</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Enregistrez les factures et règlements fournisseurs (Charges Variables).
          </p>
        </div>

        {activeTab === 'purchases' && (
          <MonthCarousel value={selectedMonth} onChange={setSelectedMonth} />
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'purchases'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingCart size={16} />
          <span>Achats du Mois</span>
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'suppliers'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Store size={16} />
          <span>Gestion Fournisseurs</span>
        </button>
      </div>

      {activeTab === 'purchases' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Purchase Form Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              {editingPurchaseId ? 'Modifier l\'Achat' : 'Saisir un Achat'}
            </h3>
            
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Calendar size={12} />
                  <span>Date d'achat</span>
                </label>
                <input
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Store size={12} />
                  <span>Fournisseur</span>
                </label>
                <select
                  value={purchaseForm.supplierId}
                  onChange={(e) => handleSupplierChangeInForm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Choisir Fournisseur --</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <Coins size={12} />
                    <span>Montant (DH)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Montant"
                    value={purchaseForm.amount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <Layers size={12} />
                    <span>Règlement</span>
                  </label>
                  <select
                    value={purchaseForm.paymentMethod}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ESPECE">Espèce</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="VIREMENT">Virement</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <FileText size={12} />
                  <span>N° Pièce / Facture</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: FACT-4982"
                  value={purchaseForm.invoiceNumber}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Note / Détail</label>
                <input
                  type="text"
                  placeholder="Ex: Viande hachée 5kg"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                {editingPurchaseId && (
                  <button
                    type="button"
                    onClick={handleCancelEditPurchase}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingPurchase}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  {submittingPurchase ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>{editingPurchaseId ? 'Modifier' : 'Valider'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Purchase List Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Relevé des Achats</h3>
                
                <div className="flex items-center space-x-3">
                  {/* Export Excel Button */}
                  <button
                    onClick={handleExportExcel}
                    disabled={exportingExcel || filteredPurchases.length === 0}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-sm"
                  >
                    {exportingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                    <span>Exporter Excel</span>
                  </button>

                  {/* Filter Supplier */}
                  <select
                    value={selectedSupplierFilter}
                    onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-100 text-xs rounded-xl py-2 px-3 focus:outline-none"
                  >
                    <option value="All">Tous les Fournisseurs</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingPurchases ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                  <p className="text-slate-400 text-sm">Chargement des relevés...</p>
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div className="py-20 text-center text-slate-450 text-sm">
                  Aucun achat enregistré pour ce mois.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-550 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Date</th>
                        <th className="py-4 px-4">Facture / Pièce</th>
                        <th className="py-4 px-4">Fournisseur</th>
                        <th className="py-4 px-4 text-right">Montant</th>
                        <th className="py-4 px-4 text-center">Règlement</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {filteredPurchases.map((p) => {
                        const suppName = p.supplierId?.name || 'Inconnu'
                        return (
                          <tr key={p._id} className="hover:bg-slate-550/5 text-sm">
                            <td className="py-4 px-6 font-semibold font-mono text-slate-800 dark:text-slate-200">
                              {formatDate(p.date)}
                            </td>
                            <td className="py-4 px-4 font-mono text-xs text-slate-500">
                              {p.invoiceNumber || '—'}
                            </td>
                            <td className="py-4 px-4 text-slate-800 dark:text-slate-200 font-medium">
                              {suppName}
                              {p.notes && <p className="text-[10px] text-slate-450 font-normal">{p.notes}</p>}
                            </td>
                            <td className="py-4 px-4 text-right font-bold font-mono text-slate-900 dark:text-slate-100">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.paymentMethod === 'ESPECE' 
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                                  : p.paymentMethod === 'CHEQUE'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
                              }`}>
                                {p.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => handleEditPurchase(p)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Modifier"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeletePurchase(p._id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50/20 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 size={13} />
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
            </div>

            {/* Total Footer (Excel Style) */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Total Mensuel Relevé
              </span>
              <span className="font-extrabold text-xl text-emerald-650 dark:text-emerald-400 font-mono">
                {formatCurrency(totalPurchasesAmount)}
              </span>
            </div>

          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Supplier Form Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              {editingSupplierId ? 'Modifier Fournisseur' : 'Nouveau Fournisseur'}
            </h3>
            
            <form onSubmit={handleSupplierSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom Fournisseur</label>
                <input
                  type="text"
                  placeholder="Ex: BOUCHERIE AL AMAL"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Téléphone</label>
                <input
                  type="text"
                  placeholder="Ex: 06 12 34 56 78"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catégorie</label>
                  <select
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Viandes">Viandes</option>
                    <option value="Épicerie">Épicerie</option>
                    <option value="Laitiers">Produits Laitiers</option>
                    <option value="Boulangerie">Boulangerie</option>
                    <option value="Fruits & Légumes">Fruits & Légumes</option>
                    <option value="Boissons">Boissons</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Règlement Défaut</label>
                  <select
                    value={supplierForm.paymentMethod}
                    onChange={(e) => setSupplierForm({ ...supplierForm, paymentMethod: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none"
                  >
                    <option value="ESPECE">Espèce</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="VIREMENT">Virement</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                {editingSupplierId && (
                  <button
                    type="button"
                    onClick={handleCancelEditSupplier}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingSupplier}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  {submittingSupplier ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>{editingSupplierId ? 'Modifier' : 'Valider'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Supplier Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm lg:col-span-2">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Catalogue des Fournisseurs</h3>
            </div>

            {loadingSuppliers ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                <p className="text-slate-400 text-sm">Chargement des fournisseurs...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="py-20 text-center text-slate-450 text-sm">
                Aucun fournisseur enregistré.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-555 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Nom</th>
                      <th className="py-4 px-4">Téléphone</th>
                      <th className="py-4 px-4">Catégorie</th>
                      <th className="py-4 px-4 text-center">Règlement Défaut</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {suppliers.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-550/5 text-sm">
                        <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-200">
                          {s.name}
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                          {s.phone || '—'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {s.category || 'Viandes'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350">
                            {s.defaultPaymentMethod || s.paymentMethod || 'ESPECE'}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleEditSupplier(s)}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(s._id, s.name)}
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
        </div>
      )}
    </div>
  )
}
