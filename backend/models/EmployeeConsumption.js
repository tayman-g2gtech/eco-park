import mongoose from 'mongoose';

// Fiche de consommation journalière des employés (PDJ & repas non comptabilisés)
const EmployeeConsumptionSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format 'YYYY-MM-DD'
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, default: 0 }
    }
  ],
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('EmployeeConsumption', EmployeeConsumptionSchema);
