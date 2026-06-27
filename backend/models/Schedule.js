import mongoose from 'mongoose';

// Valeurs possibles pour un shift (basé sur PLANNING21.xlsx)
const SHIFT_VALUES = ['07H00-AP', '15H00-FS', 'RCP', 'CNG', 'REST'];

const ShiftEntrySchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  lundi: { type: String, enum: SHIFT_VALUES, default: 'REST' },
  mardi: { type: String, enum: SHIFT_VALUES, default: 'REST' },
  mercredi: { type: String, enum: SHIFT_VALUES, default: 'REST' },
  jeudi: { type: String, enum: SHIFT_VALUES, default: 'REST' },
  vendredi: { type: String, enum: SHIFT_VALUES, default: 'REST' },
  samedi: { type: String, enum: SHIFT_VALUES, default: 'REST' },
  dimanche: { type: String, enum: SHIFT_VALUES, default: 'REST' },
  rcp: { type: Number, default: 0 } // Récupérations de la semaine
}, { _id: false });

const ScheduleSchema = new mongoose.Schema({
  weekStart: { type: Date, required: true }, // Lundi de la semaine (date normalisée)
  weekLabel: { type: String }, // ex: "Du Lundi 15/06 au Dimanche 21/06"
  entries: [ShiftEntrySchema]
}, { timestamps: true });

ScheduleSchema.index({ weekStart: 1 }, { unique: true });

export default mongoose.model('Schedule', ScheduleSchema);
