import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Non autorisé — Token manquant' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Utilisateur introuvable' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'gerant') {
    return res.status(403).json({ message: 'Accès réservé au Gérant / Admin' });
  }
  next();
};

// Strict admin-only guard (for user management routes)
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }
  next();
};

