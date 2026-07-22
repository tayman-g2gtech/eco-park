import mongoose from 'mongoose';

// Fiche de consommation journalière des employés (PDJ & repas non comptabilisés)
const EmployeeConsumptionSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format 'YYYY-MM-DD'
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: mongoose.Schema.Types.Mixed, required: true, default: '' }, // String or Number (ex: "80", "60 g")
      unit: { type: String, default: '' } // Unité personnalisée (ex: "g", "pièce", "boîte")
    }
  ],
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('EmployeeConsumption', EmployeeConsumptionSchema);
