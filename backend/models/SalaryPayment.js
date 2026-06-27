import mongoose from 'mongoose';

// Fiche de paie mensuelle — basé sur MASSE SALAIRE.xlsx
const SalaryPaymentSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true }, // 'YYYY-MM'
  daysWorked: { type: Number, default: 26 },
  restDays: { type: Number, default: 0 },   // Repos & Récupérations
  advances: { type: Number, default: 0 },   // Avance sur salaire
  netToPay: { type: Number, required: true }, // Net à payer (calculé)
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

SalaryPaymentSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export default mongoose.model('SalaryPayment', SalaryPaymentSchema);
