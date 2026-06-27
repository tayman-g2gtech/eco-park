import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/users — List all users ─────────────────────────────────────────
router.get('/', protect, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().populate('employeeId').select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/users — Create a new user ─────────────────────────────────────
router.post('/', protect, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, pole, employeeId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Nom, email, mot de passe et rôle sont obligatoires' });
    }
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide. Valeurs acceptées : admin, staff' });
    }
    if (role === 'staff' && !pole) {
      return res.status(400).json({ message: 'Le pôle est obligatoire pour un compte staff' });
    }
    if (role === 'staff' && !employeeId) {
      return res.status(400).json({ message: 'La liaison avec une fiche employé est obligatoire pour un compte staff' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    const user = new User({ 
      name, 
      email, 
      password, 
      role, 
      pole: role === 'staff' ? pole : undefined, 
      employeeId: role === 'staff' ? employeeId : undefined 
    });
    await user.save();

    const result = user.toObject();
    delete result.password;
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/users/:id — Update user info ───────────────────────────────────
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, pole, employeeId } = req.body;

    if (role && !['admin', 'staff'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    if (role === 'staff' && !employeeId) {
      return res.status(400).json({ message: 'La liaison avec une fiche employé est obligatoire pour un compte staff' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        email, 
        role, 
        pole: role === 'staff' ? pole : undefined,
        employeeId: role === 'staff' ? employeeId : undefined 
      },
      { new: true, runValidators: true }
    ).populate('employeeId').select('-password');

    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/users/:id/toggle — Toggle active status ──────────────────────
router.patch('/:id/toggle', protect, requireAdmin, async (req, res) => {
  try {
    // Prevent admin from deactivating their own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    user.isActive = !user.isActive;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/users/:id/password — Reset password ─────────────────────────
router.patch('/:id/password', protect, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 4 caractères' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    user.password = password; // pre-save hook handles hashing
    await user.save();
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/users/:id — Delete user ─────────────────────────────────────
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Prevent deleting the last admin
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'Utilisateur introuvable' });

    if (targetUser.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Impossible de supprimer le dernier administrateur actif' });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
