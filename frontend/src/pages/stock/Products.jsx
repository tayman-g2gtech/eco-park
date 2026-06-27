import React, { useState, useEffect } from 'react'
import { 
  Tag, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  Loader2,
  X,
  Check
} from 'lucide-react'
import client from '@/api/client'
import { toast } from 'sonner'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPole, setSelectedPole] = useState('All')
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null)
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    pole: 'PDJ',
    unit: 'kg',
    quantityAlert: 1
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Fetch all products
      const response = await client.get('/products?pole=All')
      setProducts(response.data)
    } catch (err) {
      console.error('Error fetching products:', err)
      toast.error('Erreur lors du chargement du catalogue produits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      category: '',
      pole: 'PDJ',
      unit: 'kg',
      quantityAlert: 1
    })
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (prod) => {
    setSelectedProduct(prod)
    setFormData({
      name: prod.name,
      category: prod.category || '',
      pole: prod.pole,
      unit: prod.unit || 'kg',
      quantityAlert: prod.quantityAlert || 1
    })
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.category.trim()) {
      toast.error('Veuillez remplir le nom et la catégorie')
      return
    }

    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await client.post('/products', formData)
        toast.success('Produit ajouté avec succès !')
      } else {
        await client.put(`/products/${selectedProduct._id}`, formData)
        toast.success('Produit modifié avec succès !')
      }
      handleCloseModal()
      fetchProducts()
    } catch (err) {
      console.error('Error saving product:', err)
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer/archiver le produit "${name}" ?`)) {
      return
    }

    try {
      await client.delete(`/products/${id}`)
      toast.success('Produit archivé avec succès')
      fetchProducts()
    } catch (err) {
      console.error('Error deleting product:', err)
      toast.error('Erreur lors de l\'archivage')
    }
  }

  // Filter products by search and pôle
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.category?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPole = selectedPole === 'All' || p.pole === selectedPole
      return matchesSearch && matchesPole
    })
  }, [products, searchTerm, selectedPole])

  const polesList = ['All', 'PDJ', 'Bar', 'Creperie']

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
            <Tag className="text-emerald-600 dark:text-emerald-500" />
            <span>Catalogue Produits</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gérez la liste de tous les articles et les seuils d'alerte critiques.
          </p>
        </div>
        
        <button
          onClick={handleOpenCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl py-2.5 px-4 shadow-sm active:scale-[0.98] transition-all flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Ajouter un produit</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        {/* Pôle Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-800/60">
          {polesList.map((pole) => (
            <button
              key={pole}
              onClick={() => setSelectedPole(pole)}
              className={`py-1.5 px-4 text-xs font-semibold rounded-lg transition-all duration-150 ${
                selectedPole === pole
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {pole === 'All' ? 'Tous' : (pole === 'Creperie' ? 'Crêperie' : pole)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Rechercher produit/catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
          <p className="text-slate-400 text-sm">Chargement du catalogue...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          Aucun produit ne correspond à ces critères.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => (
            <div 
              key={prod._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/30">
                      {prod.pole === 'Creperie' ? 'Crêperie' : prod.pole}
                    </span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mt-2">
                      {prod.name}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    Unité : {prod.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Catégorie</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{prod.category || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center space-x-1">
                      <AlertTriangle size={10} className="text-orange-500" />
                      <span>Seuil d'Alerte</span>
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {prod.quantityAlert} {prod.unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleOpenEditModal(prod)}
                  className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteProduct(prod._id, prod.name)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {modalMode === 'create' ? 'Ajouter un Produit' : 'Modifier le Produit'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom du produit</label>
                <input
                  type="text"
                  placeholder="Ex: FILETS DE POULET"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catégorie</label>
                  <input
                    type="text"
                    placeholder="Ex: Viande, Pain, Sirop"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pôle affecté</label>
                  <select
                    value={formData.pole}
                    onChange={(e) => setFormData({ ...formData, pole: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PDJ">PDJ</option>
                    <option value="Bar">Bar</option>
                    <option value="Creperie">Crêperie</option>
                    <option value="All">Tous les Pôles (All)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unité de mesure</label>
                  <input
                    type="text"
                    placeholder="Ex: kg, boite, l, pièce"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seuil critique (Alerte)</label>
                  <input
                    type="number"
                    value={formData.quantityAlert}
                    onChange={(e) => setFormData({ ...formData, quantityAlert: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Confirmer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
