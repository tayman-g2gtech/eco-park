import mongoose from 'mongoose';

const StockMovementSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  date: { type: String, required: true }, // Format 'YYYY-MM-DD'
  pole: { type: String, required: true, enum: ['PDJ', 'Bar', 'Creperie'] },
  yesterdayStock: { type: Number, default: 0 },
  addedQuantity: { type: Number, default: 0 },
  consumedQuantity: { type: Number, default: 0 },
  remainingStock: { type: Number, required: true },
  notes: { type: String }
}, { timestamps: true });

// Empêche les doublons (un seul mouvement par produit par jour par pôle)
StockMovementSchema.index({ productId: 1, date: 1, pole: 1 }, { unique: true });

export default mongoose.model('StockMovement', StockMovementSchema);
