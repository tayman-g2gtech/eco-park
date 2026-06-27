import React, { useState, useEffect } from 'react'
import {
  Users, UserPlus, Edit2, Trash2, Lock, Unlock,
  Key, Search, Shield, AlertCircle, X, Check,
  Loader2, Eye, EyeOff, ChevronDown
} from 'lucide-react'
import client from '@/api/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const POLES = ['Caisse', 'Bar', 'Service', 'Cuisine', 'Crep', 'PDJ', 'Commis']

const ROLE_CONFIG = {
  admin: { label: 'Admin', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', icon: Shield },
  staff: { label: 'Staff', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400', icon: Users },
  gerant: { label: 'Gérant', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', icon: Shield },
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Field component ──────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Form states
  const emptyForm = { name: '', email: '', password: '', role: 'staff', pole: 'Bar', employeeId: '' }
  const [form, setForm] = useState(emptyForm)
  const [newPassword, setNewPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await client.get('/users')
      setUsers(res.data)
    } catch (err) {
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await client.get('/employees?isActive=true')
      setEmployees(res.data)
    } catch (err) {
      console.error('Erreur lors du chargement des employés:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchEmployees()
  }, [])

  const handleEmployeeSelect = (empId) => {
    const selected = employees.find(e => e._id === empId)
    if (selected) {
      const mappedPole = selected.pole === 'Creperie' ? 'Crep' : selected.pole
      setForm(prev => ({
        ...prev,
        employeeId: empId,
        name: selected.fullName,
        pole: mappedPole
      }))
    } else {
      setForm(prev => ({
        ...prev,
        employeeId: '',
        name: '',
        pole: 'Bar'
      }))
    }
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  )

  // ── CREATE ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast.error('Tous les champs obligatoires doivent être remplis')
      return
    }
    if (form.role === 'staff' && !form.employeeId) {
      toast.error('Veuillez associer une fiche employé pour un compte staff')
      return
    }
    setSubmitting(true)
    try {
      await client.post('/users', form)
      toast.success(`Compte ${form.role} créé avec succès`)
      setCreateOpen(false)
      setForm(emptyForm)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  // ── EDIT ────────────────────────────────────────────────────────────────────
  const openEdit = (u) => {
    setSelectedUser(u)
    setForm({ 
      name: u.name, 
      email: u.email, 
      role: u.role, 
      pole: u.pole || 'Bar', 
      employeeId: u.employeeId?._id || u.employeeId || '',
      password: '' 
    })
    setEditOpen(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (form.role === 'staff' && !form.employeeId) {
      toast.error('Veuillez associer une fiche employé pour un compte staff')
      return
    }
    setSubmitting(true)
    try {
      await client.put(`/users/${selectedUser._id}`, { 
        name: form.name, 
        email: form.email, 
        role: form.role, 
        pole: form.pole,
        employeeId: form.employeeId
      })
      toast.success('Utilisateur modifié avec succès')
      setEditOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification')
    } finally {
      setSubmitting(false)
    }
  }

  // ── TOGGLE ACTIVE ───────────────────────────────────────────────────────────
  const handleToggle = async (u) => {
    try {
      await client.patch(`/users/${u._id}/toggle`)
      toast.success(`Compte ${u.isActive ? 'désactivé' : 'activé'}`)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  // ── RESET PASSWORD ──────────────────────────────────────────────────────────
  const openPassword = (u) => { setSelectedUser(u); setNewPassword(''); setPasswordOpen(true) }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 4) { toast.error('Mot de passe trop court (min. 4 caractères)'); return }
    setSubmitting(true)
    try {
      await client.patch(`/users/${selectedUser._id}/password`, { password: newPassword })
      toast.success('Mot de passe réinitialisé avec succès')
      setPasswordOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  // ── DELETE ──────────────────────────────────────────────────────────────────
  const openDelete = (u) => { setSelectedUser(u); setDeleteOpen(true) }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await client.delete(`/users/${selectedUser._id}`)
      toast.success('Utilisateur supprimé')
      setDeleteOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="text-emerald-600 dark:text-emerald-500" size={26} />
            Gestion des Utilisateurs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Créez et gérez les accès admin et staff à l'application.
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setCreateOpen(true) }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm shadow-sm transition-all"
        >
          <UserPlus size={16} />
          Nouvel Utilisateur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: users.length, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800' },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Staff', value: users.filter(u => u.role === 'staff').length, color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
          { label: 'Actifs', value: users.filter(u => u.isActive).length, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4 flex flex-col', s.bg)}>
            <span className="text-xs font-semibold text-slate-400 mb-1">{s.label}</span>
            <span className={cn('text-2xl font-extrabold', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">

        {/* Search bar */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou rôle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={30} className="animate-spin text-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 text-sm">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Utilisateur</th>
                  <th className="py-3.5 px-4">Rôle</th>
                  <th className="py-3.5 px-4">Pôle</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(u => {
                  const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.staff
                  const RoleIcon = roleConf.icon
                  const isSelf = u._id === currentUser?.id
                  return (
                    <tr key={u._id} className={cn(
                      'transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30',
                      !u.isActive && 'opacity-60'
                    )}>
                      {/* User info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm uppercase border',
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                              : 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30'
                          )}>
                            {u.name?.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              {u.name}
                              {isSelf && <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 px-1.5 py-0.5 rounded font-semibold">Vous</span>}
                            </p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="py-4 px-4">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold', roleConf.color)}>
                          <RoleIcon size={11} />
                          {roleConf.label}
                        </span>
                      </td>

                      {/* Pole */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {u.pole || <span className="text-slate-300 dark:text-slate-600 italic text-xs">—</span>}
                          </span>
                          {u.employeeId && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              N°{u.employeeId.employeeNumber} · {u.employeeId.position}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', u.isActive ? 'bg-emerald-500' : 'bg-red-500')} />
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Reset password */}
                          <button
                            onClick={() => openPassword(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                            title="Réinitialiser le mot de passe"
                          >
                            <Key size={14} />
                          </button>

                          {/* Toggle active */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggle(u)}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                u.isActive
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                              )}
                              title={u.isActive ? 'Désactiver' : 'Activer'}
                            >
                              {u.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                          )}

                          {/* Delete */}
                          {!isSelf && (
                            <button
                              onClick={() => openDelete(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
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
        )}
      </div>

      {/* ── Modal CREATE ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel Utilisateur">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rôle *">
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value, employeeId: '', name: '', pole: 'Bar'})} className={inputCls}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </Field>
            {form.role === 'staff' && (
              <Field label="Employé lié *">
                <select value={form.employeeId} onChange={e => handleEmployeeSelect(e.target.value)} className={inputCls} required>
                  <option value="">-- Choisir employé --</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.fullName}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet *">
              <input type="text" placeholder="Ex: Ahmed Benali" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} className={inputCls} required disabled={form.role === 'staff'} />
            </Field>
            <Field label="Pôle *">
              <select value={form.pole} onChange={e => setForm({...form, pole: e.target.value})} className={inputCls} disabled={form.role === 'staff'}>
                {POLES.map(p => <option key={p} value={p}>{p === 'Crep' ? 'Crêperie' : p}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Adresse email *">
            <input type="email" placeholder="email@exemple.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} className={inputCls} required />
          </Field>
          <Field label="Mot de passe *">
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} placeholder="Min. 4 caractères" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} className={cn(inputCls, 'pr-10')} required />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          {form.role === 'admin' && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2.5">
              <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">Ce compte aura accès à toutes les fonctionnalités de l'application.</p>
            </div>
          )}
          <button type="submit" disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Créer le compte
          </button>
        </form>
      </Modal>

      {/* ── Modal EDIT ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Modifier — ${selectedUser?.name}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rôle">
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value, employeeId: '', name: '', pole: 'Bar'})} className={inputCls}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </Field>
            {form.role === 'staff' && (
              <Field label="Employé lié">
                <select value={form.employeeId} onChange={e => handleEmployeeSelect(e.target.value)} className={inputCls} required>
                  <option value="">-- Choisir employé --</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.fullName}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet">
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} required disabled={form.role === 'staff'} />
            </Field>
            <Field label="Pôle">
              <select value={form.pole} onChange={e => setForm({...form, pole: e.target.value})} className={inputCls} disabled={form.role === 'staff'}>
                {POLES.map(p => <option key={p} value={p}>{p === 'Crep' ? 'Crêperie' : p}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Adresse email">
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} required />
          </Field>
          <button type="submit" disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Enregistrer les modifications
          </button>
        </form>
      </Modal>

      {/* ── Modal RESET PASSWORD ── */}
      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title={`Nouveau mot de passe — ${selectedUser?.name}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Field label="Nouveau mot de passe">
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} placeholder="Min. 4 caractères" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} className={cn(inputCls, 'pr-10')} required />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <button type="submit" disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            Réinitialiser le mot de passe
          </button>
        </form>
      </Modal>

      {/* ── Modal DELETE ── */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirmer la suppression">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Vous êtes sur le point de supprimer définitivement le compte de <strong>{selectedUser?.name}</strong>. Cette action est irréversible.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteOpen(false)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition-all">
              Annuler
            </button>
            <button onClick={handleDelete} disabled={submitting}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
