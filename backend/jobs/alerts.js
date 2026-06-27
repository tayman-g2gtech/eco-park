import cron from 'node-cron';
import StockMovement from '../models/StockMovement.js';
import Expense from '../models/Expense.js';

export const startCronJobs = () => {
  // Vérification des stocks critiques toutes les heures
  cron.schedule('0 * * * *', async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const alerts = await StockMovement.aggregate([
        { $match: { date: today } },
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $match: { $expr: { $lte: ['$remainingStock', '$product.quantityAlert'] } } }
      ]);
      if (alerts.length > 0) {
        console.log(`⚠️  [ALERTE STOCK] ${alerts.length} produit(s) en rupture critique le ${today}`);
      }
    } catch (err) {
      console.error('Erreur cron stock:', err.message);
    }
  });

  // Rappel de saisie des charges — Le 5 de chaque mois à 9h00
  cron.schedule('0 9 5 * *', async () => {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      const expenses = await Expense.find({ month: lastMonthStr });
      if (expenses.length === 0) {
        console.log(`📢 [RAPPEL CHARGES] Aucune charge saisie pour ${lastMonthStr}. Pensez à régulariser !`);
      }
    } catch (err) {
      console.error('Erreur cron charges:', err.message);
    }
  });

  console.log('⏰ Cron jobs démarrés (alertes stock + rappel charges)');
};
