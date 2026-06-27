import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Force le driver à ignorer les configurations IPv6 instables des téléphones
      family: 4,
      // Donne 30 secondes au driver pour valider la connexion SRV
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connecté avec succès !`);
  } catch (error) {
    console.error(`❌ Erreur de connexion MongoDB : ${error.message}`);
    console.error('⚠️  Le serveur continue — vérifiez la whitelist IP sur MongoDB Atlas.');
    // Ne pas tuer le process : Railway doit rester en ligne pour répondre aux requêtes
  }
};