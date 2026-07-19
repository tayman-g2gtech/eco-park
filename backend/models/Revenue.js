import mongoose from 'mongoose';

// Saisie manuelle du Chiffre d'Affaires (CA) sur le Dashboard
const RevenueSchema = new mongoose.Schema({
  date:             { type: Date,   required: true },
  month:            { type: String, required: true }, // 'YYYY-MM'
  amount:           { type: Number, required: true, default: 0 }, // CA Brut POS déclaré
  unpaidAmount:     { type: Number, default: 0 }, // Commandes non payées (café offert, etc.)
  cancelledAmount:  { type: Number, default: 0 }, // Commandes annulées
  netAmount:        { type: Number, default: 0 }, // CA Net = amount - unpaidAmount - cancelledAmount
  source:           { type: String, default: 'Saisie manuelle' },
  notes:            { type: String }
}, { timestamps: true });

RevenueSchema.index({ month: 1 });
RevenueSchema.index({ date: 1 }, { unique: true });

export default mongoose.model('Revenue', RevenueSchema);
