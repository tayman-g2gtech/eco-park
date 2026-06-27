import express from 'express';
import Purchase from '../models/Purchase.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/purchases?month=2026-06&supplierId=xxx
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.supplierId) filter.supplierId = req.query.supplierId;

    const purchases = await Purchase.find(filter)
      .populate('supplierId', 'name category')
      .sort({ date: 1 });

    // Calcul du total mensuel
    const total = purchases.reduce((sum, p) => sum + p.amount, 0);
    res.json({ purchases, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/purchases
router.post('/', protect, async (req, res) => {
  try {
    const date = new Date(req.body.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const purchase = new Purchase({ ...req.body, month });
    await purchase.save();
    const populated = await purchase.populate('supplierId', 'name category');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/purchases/:id
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.body.date) {
      const d = new Date(req.body.date);
      req.body.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    const purchase = await Purchase.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('supplierId', 'name category');
    if (!purchase) return res.status(404).json({ message: 'Achat introuvable' });
    res.json(purchase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/purchases/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ message: 'Achat supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/purchases/monthly-summary?month=2026-06
router.get('/monthly-summary', protect, async (req, res) => {
  try {
    const { month } = req.query;
    const summary = await Purchase.aggregate([
      { $match: { month } },
      { $lookup: { from: 'suppliers', localField: 'supplierId', foreignField: '_id', as: 'supplier' } },
      { $unwind: '$supplier' },
      { $group: { _id: '$supplierId', supplierName: { $first: '$supplier.name' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
