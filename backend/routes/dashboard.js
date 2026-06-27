import express from 'express';
import Purchase from '../models/Purchase.js';
import Expense from '../models/Expense.js';
import Revenue from '../models/Revenue.js';
import SalaryPayment from '../models/SalaryPayment.js';
import StockMovement from '../models/StockMovement.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/kpis?month=2026-06
router.get('/kpis', protect, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const [purchasesData, expensesData, revenuesData, salariesData] = await Promise.all([
      Purchase.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { month } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }]),
      Revenue.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      SalaryPayment.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$netToPay' } } }]),
    ]);

    const totalPurchases = purchasesData[0]?.total || 0;
    const totalRevenue = revenuesData[0]?.total || 0;
    const totalSalaries = salariesData[0]?.total || 0;
    const totalFixedExpenses = expensesData.find(e => e._id === 'fixed')?.total || 0;
    const totalVariableExpenses = expensesData.find(e => e._id === 'variable')?.total || 0;
    const totalExpenses = totalFixedExpenses + totalVariableExpenses;
    const netProfit = totalRevenue - totalPurchases - totalSalaries - totalExpenses;

    // Alertes stock critique — liste détaillée + compteur
    const today = new Date().toISOString().split('T')[0];
    const stockAlerts = await StockMovement.aggregate([
      { $match: { date: today } },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $match: { $expr: { $lte: ['$remainingStock', '$product.quantityAlert'] } } },
      { $project: {
        _id: 0,
        productName: '$product.name',
        pole: '$product.pole',
        unit: '$product.unit',
        remainingStock: 1,
        quantityAlert: '$product.quantityAlert'
      }},
      { $sort: { remainingStock: 1 } }
    ]);

    res.json({
      month,
      totalRevenue,
      totalPurchases,
      totalSalaries,
      totalFixedExpenses,
      totalVariableExpenses,
      totalExpenses,
      netProfit,
      stockAlertCount: stockAlerts.length,
      stockAlerts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dashboard/trend?months=6 — Évolution sur N mois
router.get('/trend', protect, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7);

      const [purchases, expenses, revenues, salaries] = await Promise.all([
        Purchase.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Expense.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Revenue.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        SalaryPayment.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$netToPay' } } }]),
      ]);

      const totalRevenue = revenues[0]?.total || 0;
      const totalCosts = (purchases[0]?.total || 0) + (expenses[0]?.total || 0) + (salaries[0]?.total || 0);

      result.push({
        month,
        label: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        revenue: totalRevenue,
        costs: totalCosts,
        profit: totalRevenue - totalCosts
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dashboard/expenses-breakdown?month=2026-06
router.get('/expenses-breakdown', protect, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [purchases, expenses, salaries] = await Promise.all([
      Purchase.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      SalaryPayment.aggregate([{ $match: { month } }, { $group: { _id: null, total: { $sum: '$netToPay' } } }]),
    ]);

    res.json([
      { name: 'Achats Fournisseurs', value: purchases[0]?.total || 0, color: '#f97316' },
      { name: 'Masse Salariale', value: salaries[0]?.total || 0, color: '#8b5cf6' },
      { name: 'Charges Fixes', value: expenses[0]?.total || 0, color: '#06b6d4' },
    ]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
