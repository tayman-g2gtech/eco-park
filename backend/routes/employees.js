import express from 'express';
import Employee from '../models/Employee.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/employees?pole=Bar&isActive=true
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.pole) filter.pole = req.query.pole;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    else filter.isActive = true;

    const employees = await Employee.find(filter).sort({ pole: 1, employeeNumber: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/employees/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employé introuvable' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/employees
router.post('/', protect, async (req, res) => {
  try {
    const employee = new Employee(req.body);
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ message: 'Employé introuvable' });
    res.json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/employees/:id (soft delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    await Employee.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Employé archivé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
