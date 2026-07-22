import express from 'express';
import EmployeeConsumption from '../models/EmployeeConsumption.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/employee-consumptions?month=YYYY-MM ─────────────────────────────
// Retourne toutes les fiches du mois avec produits populés
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.month) filter.date = { $regex: `^${req.query.month}` };

    const consumptions = await EmployeeConsumption.find(filter)
      .populate('items.productId', 'name unit category pole')
      .populate('createdBy', 'name username')
      .sort({ date: -1 });

    res.json(consumptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/employee-consumptions/summary?month=YYYY-MM ─────────────────────
// Agrégat mensuel : total par produit pour le mois
router.get('/summary', protect, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Paramètre month requis (YYYY-MM)' });

    const consumptions = await EmployeeConsumption.find({
      date: { $regex: `^${month}` }
    }).populate('items.productId', 'name unit category pole');

    // Aggregate by product
    const totals = {};
    consumptions.forEach(fiche => {
      fiche.items.forEach(item => {
        if (!item.productId) return;
        const pid = item.productId._id.toString();
        if (!totals[pid]) {
          totals[pid] = {
            product: item.productId,
            totalQuantity: 0,
            daysPresent: 0
          };
        }
        totals[pid].totalQuantity += item.quantity;
        totals[pid].daysPresent += 1;
      });
    });

    res.json({
      month,
      totalDays: consumptions.length,
      productTotals: Object.values(totals).sort((a, b) =>
        a.product.name.localeCompare(b.product.name)
      )
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/employee-consumptions/:date ─────────────────────────────────────
// Fiche d'un jour précis (YYYY-MM-DD)
router.get('/:date', protect, async (req, res) => {
  try {
    const fiche = await EmployeeConsumption.findOne({ date: req.params.date })
      .populate('items.productId', 'name unit category pole')
      .populate('createdBy', 'name username');

    if (!fiche) {
      return res.status(404).json({ message: 'Aucune fiche pour cette date' });
    }
    res.json(fiche);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/employee-consumptions ──────────────────────────────────────────
// Créer ou remplacer la fiche du jour (upsert sur la date)
router.post('/', protect, async (req, res) => {
  try {
    const { date, items, notes } = req.body;
    if (!date) return res.status(400).json({ message: 'La date est requise' });

    // Filtrer les items avec quantité > 0
    const validItems = (items || []).filter(i => i.productId && i.quantity > 0);

    const fiche = await EmployeeConsumption.findOneAndUpdate(
      { date },
      {
        date,
        items: validItems,
        notes: notes || '',
        createdBy: req.user?._id
      },
      { upsert: true, new: true, runValidators: true }
    );

    const populated = await fiche.populate('items.productId', 'name unit category pole');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── DELETE /api/employee-consumptions/:date ──────────────────────────────────
router.delete('/:date', protect, async (req, res) => {
  try {
    await EmployeeConsumption.findOneAndDelete({ date: req.params.date });
    res.json({ message: 'Fiche supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
