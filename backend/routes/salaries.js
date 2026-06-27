import express from 'express';
import SalaryPayment from '../models/SalaryPayment.js';
import Employee from '../models/Employee.js';
import Expense from '../models/Expense.js';
import Schedule from '../models/Schedule.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Jours travaillés = 7 jours - (REST + CNG)
const WORK_SHIFTS = ['07H00-AP', '15H00-FS'];
const REST_SHIFTS = ['REST', 'CNG', 'RCP'];
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Fonction helper pour recalculer et synchroniser les fiches de paie depuis le planning
async function recalculatePayroll(month) {
  const [year, monthNum] = month.split('-').map(Number);
  const employees = await Employee.find({ isActive: true });

  // Timezone-safe boundaries
  const startDate = new Date(Date.UTC(year, monthNum - 1, 1 - 2)); // 2 days buffer
  const endDate = new Date(Date.UTC(year, monthNum - 1, 31 + 2)); // 2 days buffer

  const allSchedules = await Schedule.find({ weekStart: { $gte: startDate, $lte: endDate } });

  // Filtrer les plannings dont le lundi commence dans le mois cible (UTC+1)
  const schedules = allSchedules.filter(s => {
    const d = new Date(s.weekStart);
    d.setHours(d.getHours() + 2); // Ajustement Maroc UTC+1
    return d.getFullYear() === year && (d.getMonth() + 1) === monthNum;
  });

  const results = [];

  for (const emp of employees) {
    let daysWorked = 0;
    let restDays = 0;

    // Compter les shifts
    for (const schedule of schedules) {
      const entry = schedule.entries.find(e => e.employeeId && e.employeeId.toString() === emp._id.toString());
      if (!entry) continue;
      for (const day of DAYS) {
        const shift = entry[day];
        if (WORK_SHIFTS.includes(shift)) daysWorked++;
        else if (REST_SHIFTS.includes(shift)) restDays++;
      }
    }

    // Calcul du Net de base
    let baseNet = 0;
    if (emp.paymentType === 'Journalier') {
      baseNet = daysWorked * (emp.dailyRate || 0);
    } else {
      baseNet = daysWorked >= 26 ? emp.baseSalaryNet : (emp.baseSalaryNet / 26) * daysWorked;
    }

    // Préserver les avances existantes
    const existing = await SalaryPayment.findOne({ employeeId: emp._id, month });
    const advances = existing ? existing.advances : 0;
    
    // Net à payer = base - avance (min 0)
    const netToPay = Math.max(0, Math.round(baseNet) - advances);

    const salary = await SalaryPayment.findOneAndUpdate(
      { employeeId: emp._id, month },
      { daysWorked, restDays, netToPay, advances, isPaid: false },
      { upsert: true, new: true }
    );
    results.push(salary);
  }

  return results;
}

// GET /api/salaries?month=2026-06
router.get('/', protect, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'month requis (YYYY-MM)' });

    const salaries = await SalaryPayment.find({ month })
      .populate('employeeId', 'fullName employeeNumber position pole baseSalaryNet dailyRate paymentType')
      .sort({ 'employeeId.pole': 1, 'employeeId.employeeNumber': 1 });

    const totalNetToPay = salaries.reduce((sum, s) => sum + s.netToPay, 0);
    res.json({ salaries, totalNetToPay });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/salaries/generate?month=2026-06
// Génère/Recalcule les fiches de paie à partir du planning du mois
router.post('/generate', protect, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'month requis' });

    const results = await recalculatePayroll(month);
    res.json({ message: `${results.length} fiches générées/recalculées`, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/salaries/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const existing = await SalaryPayment.findById(req.params.id).populate('employeeId');
    if (!existing) return res.status(404).json({ message: 'Fiche introuvable' });

    const advances = req.body.advances ?? existing.advances;
    const daysWorked = req.body.daysWorked ?? existing.daysWorked;
    const emp = existing.employeeId;

    let baseNet = 0;
    if (emp.paymentType === 'Journalier') {
      baseNet = daysWorked * (emp.dailyRate || 0);
    } else {
      baseNet = daysWorked >= 26 ? emp.baseSalaryNet : (emp.baseSalaryNet / 26) * daysWorked;
    }

    const netToPay = Math.max(0, Math.round(baseNet) - advances);

    existing.advances = advances;
    existing.daysWorked = daysWorked;
    existing.netToPay = netToPay;
    await existing.save();

    res.json(existing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/salaries/generate-expense?month=2026-06
// Génère une charge fixe "Masse Salariale" dans le module Charges (avec recalcul automatique)
router.post('/generate-expense', protect, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'month requis' });

    // Recalculer la paie à la volée avant de générer la charge
    await recalculatePayroll(month);

    const salaries = await SalaryPayment.find({ month });
    const totalNetToPay = salaries.reduce((sum, s) => sum + s.netToPay, 0);

    if (totalNetToPay === 0) return res.status(400).json({ message: 'Aucune fiche de paie pour ce mois' });

    const [year, monthNum] = month.split('-').map(Number);
    const paidAt = new Date(year, monthNum - 1, 28); // Fin du mois

    const expense = await Expense.findOneAndUpdate(
      { month, subcategory: 'Masse Salariale', isAutoGenerated: true },
      { name: `Masse Salariale ${month}`, category: 'fixed', subcategory: 'Masse Salariale', amount: totalNetToPay, paidAt, month, isAutoGenerated: true },
      { upsert: true, new: true }
    );

    res.json({ message: 'Charge masse salariale générée', expense });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
