import express from 'express';
import mongoose from 'mongoose';
import Schedule from '../models/Schedule.js';
import Employee from '../models/Employee.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── MIGRATION TEMPORAIRE — appeler UNE SEULE FOIS puis supprimer ─────────────
// POST /api/schedules/migrate-shifts
const MIGRATION_MAP = {
  '07H00':        '07H00-AP',
  '07H00-FS':     '07H00-AP',
  '15H00':        '15H00-FS',
  '11H00':        '07H00-AP',
  '13H00-21H00':  '15H00-FS',
  'SOIR':         'REST',
  'CPR':          'REST',
};
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

router.post('/migrate-shifts', protect, async (req, res) => {
  try {
    const col = mongoose.connection.db.collection('schedules');
    const all = await col.find({}).toArray();
    let totalDocs = 0;
    let totalCells = 0;

    for (const schedule of all) {
      let modified = false;
      const updatedEntries = schedule.entries.map(entry => {
        const e = { ...entry };
        for (const day of DAYS) {
          const old = e[day];
          if (old && MIGRATION_MAP[old]) {
            e[day] = MIGRATION_MAP[old];
            totalCells++;
            modified = true;
          }
        }
        return e;
      });

      if (modified) {
        await col.updateOne({ _id: schedule._id }, { $set: { entries: updatedEntries } });
        totalDocs++;
      }
    }

    res.json({
      success: true,
      message: `Migration terminée : ${totalDocs} planning(s) mis à jour, ${totalCells} cellule(s) migrée(s).`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ── FIN MIGRATION TEMPORAIRE ──────────────────────────────────────────────────

// Normalise une date au lundi de la semaine
const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// GET /api/schedules?weekStart=2026-06-15&pole=Bar
router.get('/', protect, async (req, res) => {
  try {
    const weekStart = req.query.weekStart
      ? getMondayOfWeek(req.query.weekStart)
      : getMondayOfWeek(new Date());

    let schedule = await Schedule.findOne({ weekStart });
    const activeEmployees = await Employee.find({ isActive: true }).sort({ pole: 1, employeeNumber: 1 });

    const sunday = new Date(weekStart);
    sunday.setDate(sunday.getDate() + 6);
    const label = `Du Lundi ${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au Dimanche ${sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;

    if (!schedule) {
      // Créer un document vide avec les employés actifs
      const entries = activeEmployees.map(emp => ({
        employeeId: emp._id,
        lundi: 'REST', mardi: 'REST', mercredi: 'REST', jeudi: 'REST',
        vendredi: 'REST', samedi: 'REST', dimanche: 'REST', rcp: 0
      }));

      schedule = new Schedule({ weekStart, weekLabel: label, entries });
      await schedule.save();
    }

    // Construction dynamique : on associe chaque employé actif avec son shift s'il existe
    const entriesObj = activeEmployees.map(emp => {
      const dbEntry = schedule.entries.find(e => e.employeeId && e.employeeId.toString() === emp._id.toString());
      if (dbEntry) {
        return {
          employeeId: emp,
          lundi: dbEntry.lundi || 'REST',
          mardi: dbEntry.mardi || 'REST',
          mercredi: dbEntry.mercredi || 'REST',
          jeudi: dbEntry.jeudi || 'REST',
          vendredi: dbEntry.vendredi || 'REST',
          samedi: dbEntry.samedi || 'REST',
          dimanche: dbEntry.dimanche || 'REST',
          rcp: dbEntry.rcp || 0
        };
      } else {
        return {
          employeeId: emp,
          lundi: 'REST',
          mardi: 'REST',
          mercredi: 'REST',
          jeudi: 'REST',
          vendredi: 'REST',
          samedi: 'REST',
          dimanche: 'REST',
          rcp: 0
        };
      }
    });

    let scheduleObj = {
      _id: schedule._id,
      weekStart: schedule.weekStart,
      weekLabel: schedule.weekLabel || label,
      entries: entriesObj
    };

    // Filtre par pôle si demandé
    if (req.query.pole && req.query.pole !== 'All') {
      scheduleObj.entries = scheduleObj.entries.filter(e => e.employeeId?.pole === req.query.pole);
    }

    res.json(scheduleObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/schedules/:id/shift — Met à jour un shift d'un employé
router.put('/:id/shift', protect, async (req, res) => {
  try {
    const { employeeId, day, value, rcp } = req.body;
    const validDays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Planning introuvable' });
    }

    let entry = schedule.entries.find(e => e.employeeId && e.employeeId.toString() === employeeId.toString());
    if (!entry) {
      schedule.entries.push({
        employeeId,
        lundi: 'REST', mardi: 'REST', mercredi: 'REST', jeudi: 'REST',
        vendredi: 'REST', samedi: 'REST', dimanche: 'REST', rcp: 0
      });
      entry = schedule.entries.find(e => e.employeeId && e.employeeId.toString() === employeeId.toString());
    }

    if (day && validDays.includes(day)) {
      entry[day] = value;
    }
    if (rcp !== undefined) {
      entry.rcp = rcp;
    }

    await schedule.save();
    await schedule.populate('entries.employeeId', 'fullName employeeNumber pole position isActive');

    let scheduleObj = schedule.toObject();
    scheduleObj.entries = scheduleObj.entries.filter(e => e.employeeId && e.employeeId.isActive);

    res.json(scheduleObj);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/schedules — Créer/écraser un planning
router.post('/', protect, async (req, res) => {
  try {
    const weekStart = getMondayOfWeek(req.body.weekStart);
    const schedule = await Schedule.findOneAndUpdate(
      { weekStart },
      { ...req.body, weekStart },
      { upsert: true, new: true }
    );
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
