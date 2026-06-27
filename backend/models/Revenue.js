import mongoose from 'mongoose';

// Saisie manuelle du Chiffre d'Affaires (CA) sur le Dashboard
const RevenueSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  month: { type: String, required: true }, // 'YYYY-MM'
  amount: { type: Number, required: true, default: 0 },
  source: { type: String, default: 'Saisie manuelle' },
  notes: { type: String }
}, { timestamps: true });

RevenueSchema.index({ month: 1 });
RevenueSchema.index({ date: 1 }, { unique: true });

export default mongoose.model('Revenue', RevenueSchema);
