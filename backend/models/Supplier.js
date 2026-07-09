import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: [
      'Viandes', 'Épicerie', 'Laitiers', 'Boulangerie', 'Fruits & Légumes', 'Boissons',
      'Café & Thé', 'Poissons & Fruits de Mer', 'Sirops & Toppings', 'Emballages & Consommables',
      'Produits d\'entretien', 'Autre'
    ],
    default: 'Autre'
  },
  phone: { type: String },
  address: { type: String },
  defaultPaymentMethod: {
    type: String,
    enum: ['ESPECE', 'CHEQUE', 'VIREMENT'],
    default: 'ESPECE'
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Supplier', SupplierSchema);
