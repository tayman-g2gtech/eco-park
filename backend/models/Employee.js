import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
  employeeNumber: { type: Number, unique: true, required: true },
  fullName: { type: String, required: true, trim: true },
  position: { type: String, required: true },
  pole: {
    type: String,
    required: true,
    enum: ['Caisse', 'Bar', 'Service', 'Cuisine', 'Creperie', 'PDJ', 'Commis']
  },
  hireDate: { type: Date },
  paymentType: {
    type: String,
    enum: ['Mensuel', 'Journalier'],
    default: 'Mensuel'
  },
  baseSalaryNet: { type: Number, required: true, default: 0 },
  dailyRate: { type: Number, default: 0 }, // Salaire par jour
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Employee', EmployeeSchema);
