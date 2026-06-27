import express from 'express';
import StockMovement from '../models/StockMovement.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/stock-movements?date=2026-06-18&pole=PDJ
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.pole) filter.pole = req.query.pole;
    if (req.query.month) filter.date = { $regex: `^${req.query.month}` };

    const movements = await StockMovement.find(filter)
      .populate('productId', 'name unit category quantityAlert')
      .sort({ 'productId.category': 1, 'productId.name': 1 });
    res.json(movements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stock-movements/yesterday?date=2026-06-18&pole=PDJ
// Retourne le stock restant de la veille pour préremplissage
router.get('/yesterday', protect, async (req, res) => {
  try {
    const { date, pole } = req.query;
    if (!date || !pole) return res.status(400).json({ message: 'date et pole requis' });

    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().split('T')[0];

    const movements = await StockMovement.find({ date: yDate, pole })
      .populate('productId', 'name unit');
    res.json(movements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stock-movements
router.post('/', protect, async (req, res) => {
  try {
    const { productId, date, pole, yesterdayStock, addedQuantity, consumedQuantity } = req.body;
    const remainingStock = (yesterdayStock || 0) + (addedQuantity || 0) - (consumedQuantity || 0);

    const movement = await StockMovement.findOneAndUpdate(
      { productId, date, pole },
      { yesterdayStock: yesterdayStock || 0, addedQuantity: addedQuantity || 0, consumedQuantity: consumedQuantity || 0, remainingStock, notes: req.body.notes },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json(movement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/stock-movements/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const { yesterdayStock, addedQuantity, consumedQuantity } = req.body;
    req.body.remainingStock = (yesterdayStock || 0) + (addedQuantity || 0) - (consumedQuantity || 0);
    const movement = await StockMovement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(movement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/stock-movements/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await StockMovement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Mouvement supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stock-movements/alerts — Produits en rupture critique
router.get('/alerts', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const alerts = await StockMovement.aggregate([
      { $match: { date: today } },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $match: { $expr: { $lte: ['$remainingStock', '$product.quantityAlert'] } } },
      { $project: { productName: '$product.name', pole: 1, remainingStock: 1, quantityAlert: '$product.quantityAlert', unit: '$product.unit' } }
    ]);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
