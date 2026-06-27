import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  UserPlus
} from 'lucide-react'
import client from '@/api/client'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function Personnel() {
  const [employees, setEmployees] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  
  // Staff Form state
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    employeeNumber: '',
    position: '',
    pole: 'Service',
    paymentType: 'Mensuel',
    baseSalaryNet: '',
    dailyRate: ''
  })
  const [submittingStaff, setSubmittingStaff] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState(null)

  // Fetch Employees list
  const fetchStaff = async () => {
    setLoadingStaff(true)
    try {
      const response = await client.get('/employees?isActive=true')
      setEmployees(response.data)
    } catch (err) {
      console.error('Error fetching employees:', err)
      toast.error('Erreur de chargement du personnel')
    } finally {
      setLoadingStaff(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  // Staff CRUD actions
  const handleStaffSubmit = async (e) => {
    e.preventDefault()
    if (!staffForm.fullName.trim() || !staffForm.employeeNumber || !staffForm.baseSalaryNet) {
      toast.error('Veuillez remplir le nom, le numéro et le salaire de base')
      return
    }

    setSubmittingStaff(true)
    const payload = {
      ...staffForm,
      employeeNumber: Number(staffForm.employeeNumber),
      baseSalaryNet: Number(staffForm.baseSalaryNet),
      dailyRate: staffForm.dailyRate ? Number(staffForm.dailyRate) : undefined
    }

    try {
      if (editingStaffId) {
        await client.put(`/employees/${editingStaffId}`, payload)
        toast.success('Employé modifié avec succès')
        setEditingStaffId(null)
      } else {
        await client.post('/employees', payload)
        toast.success('Employé ajouté avec succès')
      }

      setStaffForm({
        fullName: '',
        employeeNumber: '',
        position: '',
        pole: 'Service',
        paymentType: 'Mensuel',
        baseSalaryNet: '',
        dailyRate: ''
      })
      fetchStaff()
    } catch (err) {
      console.error('Error saving employee:', err)
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde de l\'employé')
    } finally {
      setSubmittingStaff(false)
    }
  }

  const handleEditStaff = (emp) => {
    setEditingStaffId(emp._id)
    setStaffForm({
      fullName: emp.fullName,
      employeeNumber: String(emp.employeeNumber),
      position: emp.position || '',
      pole: emp.pole || 'Service',
      paymentType: emp.paymentType || 'Mensuel',
      baseSalaryNet: String(emp.baseSalaryNet),
      dailyRate: emp.dailyRate ? String(emp.dailyRate) : ''
    })
  }

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Voulez-vous archiver l'employé "${name}" ?`)) return
    try {
      await client.delete(`/employees/${id}`)
      toast.success('Employé archivé')
      fetchStaff()
    } catch (err) {
      console.error('Error deleting employee:', err)
      toast.error("Erreur d'archivage")
    }
  }

  const handleCancelEditStaff = () => {
    setEditingStaffId(null)
    setStaffForm({
      fullName: '',
      employeeNumber: '',
      position: '',
      pole: 'Service',
      paymentType: 'Mensuel',
      baseSalaryNet: '',
      dailyRate: ''
    })
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
            <Users className="text-emerald-600 dark:text-emerald-500" />
            <span>Gestion du Personnel</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gérez les informations, les contrats et les salaires des employés.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Employee Input Form Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-fit space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base flex items-center space-x-2">
            <UserPlus size={18} className="text-emerald-600" />
            <span>{editingStaffId ? 'Modifier Employé' : 'Ajouter un Employé'}</span>
          </h3>

          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Matricule / N°</label>
                <input
                  type="number"
                  placeholder="Ex: 34"
                  value={staffForm.employeeNumber}
                  onChange={(e) => setStaffForm({ ...staffForm, employeeNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  required
                  min="1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pôle de service</label>
                <select
                  value={staffForm.pole}
                  onChange={(e) => setStaffForm({ ...staffForm, pole: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="Caisse">La Caisse</option>
                  <option value="Bar">Le BAR</option>
                  <option value="Service">Le Service</option>
                  <option value="Cuisine">Cuisine Centrale</option>
                  <option value="Creperie">La Crêperie</option>
                  <option value="PDJ">PDJ</option>
                  <option value="Commis">Commis</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom & Prénom</label>
              <input
                type="text"
                placeholder="Nom complet"
                value={staffForm.fullName}
                onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Poste / Fonction</label>
              <input
                type="text"
                placeholder="Ex: Chef de rang, Barman..."
                value={staffForm.position}
                onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type Paiement</label>
                <select
                  value={staffForm.paymentType}
                  onChange={(e) => setStaffForm({ ...staffForm, paymentType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="Mensuel">Mensuel</option>
                  <option value="Journalier">Journalier</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Salaire Net (DH)</label>
                <input
                  type="number"
                  placeholder="Salaire Net"
                  value={staffForm.baseSalaryNet}
                  onChange={(e) => {
                    const val = e.target.value
                    const net = parseFloat(val) || 0
                    setStaffForm({
                      ...staffForm,
                      baseSalaryNet: val,
                      dailyRate: net > 0 ? String(Math.round((net / 26) * 100) / 100) : staffForm.dailyRate
                    })
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  required
                  min="0"
                />
                {staffForm.baseSalaryNet && (
                  <p className="text-[10px] text-slate-400">
                    ÷ 26 jrs = <strong>{Math.round((parseFloat(staffForm.baseSalaryNet) / 26) * 100) / 100} DH/j</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taux journalier (Optionnel)</label>
              <input
                type="number"
                placeholder="Taux par jour (si journalier)"
                value={staffForm.dailyRate}
                onChange={(e) => {
                  const val = e.target.value
                  const rate = parseFloat(val) || 0
                  setStaffForm({
                    ...staffForm,
                    dailyRate: val,
                    baseSalaryNet: rate > 0 ? String(Math.round(rate * 26 * 100) / 100) : staffForm.baseSalaryNet
                  })
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                min="0"
              />
              {staffForm.dailyRate && (
                <p className="text-[10px] text-slate-400">
                  × 26 jrs = <strong>{Math.round(parseFloat(staffForm.dailyRate) * 26 * 100) / 100} DH/mois</strong>
                </p>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              {editingStaffId && (
                <button
                  type="button"
                  onClick={handleCancelEditStaff}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={submittingStaff}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                {submittingStaff ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                <span>{editingStaffId ? 'Modifier' : 'Valider'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Staff List Table Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm lg:col-span-2">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Registre du personnel</h3>
          </div>

          {loadingStaff ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
              <p className="text-slate-400 text-sm">Chargement de la liste...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="py-20 text-center text-slate-450 text-sm">
              Aucun employé actif enregistré.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-550 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 w-16">Matricule</th>
                    <th className="py-4 px-4">Nom complet</th>
                    <th className="py-4 px-4">Pôle / Poste</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4 text-right">Salaire Net</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-sm transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-400">
                        {emp.employeeNumber}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {emp.fullName}
                      </td>
                      <td className="py-4 px-4">
                        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {emp.pole === 'Creperie' ? 'Crêperie' : emp.pole}
                        </span>
                        <span className="block text-[10px] text-slate-400">{emp.position}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.paymentType === 'Mensuel'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}>
                          {emp.paymentType}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(emp.baseSalaryNet)}
                        {emp.dailyRate > 0 && (
                          <span className="block text-[10px] font-normal text-slate-400 font-sans">
                            {emp.dailyRate} DH / jour
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleEditStaff(emp)}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(emp._id, emp.fullName)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50/20 transition-colors"
                            title="Archiver"
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
    </div>
  )
}
