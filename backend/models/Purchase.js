import mongoose from 'mongoose';

// Représente une ligne du fichier ACHAT.xlsx
const PurchaseSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  date: { type: Date, required: true },
  month: { type: String, required: true }, // 'YYYY-MM' pour filtrage rapide
  invoiceNumber: { type: String }, // N° PIECE
  amount: { type: Number, required: true, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['ESPECE', 'CHEQUE', 'VIREMENT'],
    default: 'ESPECE'
  },
  notes: { type: String }
}, { timestamps: true });

PurchaseSchema.index({ month: 1, supplierId: 1 });

export default mongoose.model('Purchase', PurchaseSchema);
