import express from 'express';
import Supplier from '../models/Supplier.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/suppliers
router.get('/', protect, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;
    const suppliers = await Supplier.find(filter).sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/suppliers
router.post('/', protect, async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) return res.status(404).json({ message: 'Fournisseur introuvable' });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/suppliers/:id (soft delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Fournisseur archivé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
