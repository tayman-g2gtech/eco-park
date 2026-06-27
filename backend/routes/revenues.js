import express from 'express';
import Revenue from '../models/Revenue.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/revenues?month=2026-06
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    const revenues = await Revenue.find(filter).sort({ date: 1 });
    const total = revenues.reduce((sum, r) => sum + r.amount, 0);
    res.json({ revenues, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/revenues
router.post('/', protect, async (req, res) => {
  try {
    const date = new Date(req.body.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const revenue = await Revenue.findOneAndUpdate(
      { date },
      { ...req.body, month },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json(revenue);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/revenues/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const revenue = await Revenue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(revenue);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/revenues/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Revenue.findByIdAndDelete(req.params.id);
    res.json({ message: 'CA supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
