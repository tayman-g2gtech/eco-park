import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  pole: {
    type: String,
    required: true,
    enum: ['PDJ', 'Bar', 'Creperie', 'All']
  },
  unit: { type: String, required: true, default: 'pièce' }, // kg, l, pièce, sachet...
  pricePerUnit: { type: Number, default: 0 },
  quantityAlert: { type: Number, default: 1 }, // Seuil d'alerte stock bas
  posId: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ProductSchema.index({ name: 1, pole: 1 });

export default mongoose.model('Product', ProductSchema);
