/**
 * migrate-shifts.js
 * Migration: remplace les anciennes valeurs de shifts par les nouvelles
 *
 * Mapping:
 *   07H00   → 07H00-FS  (renommé)
 *   15H00   → 15H00-FS  (renommé)
 *   11H00   → 07H00-FS  (fusionné dans matin FS)
 *   SOIR    → REST       (supprimé, pas d'équivalent)
 *   CPR     → REST       (supprimé, pas d'équivalent)
 *   REST / RCP / CNG / 15H00-FS → inchangés
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Resolver } from 'dns/promises';

dotenv.config();

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const MIGRATION_MAP = {
  '07H00':     '07H00-FS',
  '15H00':     '15H00-FS',
  '11H00':     '07H00-FS',
  '13H00-21H00': '15H00-FS',
  'SOIR':      'REST',
  'CPR':       'REST',
};

// ── Même fix DNS que seed.js ──────────────────────────────────────────────────
async function connectWithCustomDNS(mongoUri) {
  const match = mongoUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(.*)/);
  if (!match) throw new Error('URI MongoDB invalide');
  const [, user, pass, cluster, rest] = match;

  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${cluster}`);
  const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(',');

  const directUri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hosts}${rest || '/?authSource=admin&tls=true'}`;
  await mongoose.connect(directUri);
}

async function migrate() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI non défini dans .env');

  console.log('🔌 Connexion à MongoDB...');
  if (mongoUri.startsWith('mongodb+srv://')) {
    await connectWithCustomDNS(mongoUri);
  } else {
    await mongoose.connect(mongoUri);
  }
  console.log('✅ Connecté');

  const db = mongoose.connection.db;
  const schedulesCol = db.collection('schedules');

  const allSchedules = await schedulesCol.find({}).toArray();
  console.log(`📅 ${allSchedules.length} planning(s) trouvé(s)`);

  let totalUpdated = 0;
  let totalCells = 0;

  for (const schedule of allSchedules) {
    let modified = false;
    const updatedEntries = schedule.entries.map(entry => {
      const newEntry = { ...entry };
      for (const day of DAYS) {
        const oldVal = entry[day];
        if (oldVal && MIGRATION_MAP[oldVal]) {
          newEntry[day] = MIGRATION_MAP[oldVal];
          console.log(`  ↳ Entrée ${entry.employeeId} | ${day}: "${oldVal}" → "${MIGRATION_MAP[oldVal]}"`);
          totalCells++;
          modified = true;
        }
      }
      return newEntry;
    });

    if (modified) {
      await schedulesCol.updateOne(
        { _id: schedule._id },
        { $set: { entries: updatedEntries } }
      );
      totalUpdated++;
      console.log(`✔ Planning ${schedule.weekLabel || schedule._id} mis à jour`);
    }
  }

  console.log(`\n🎉 Migration terminée : ${totalUpdated} planning(s) modifié(s), ${totalCells} cellule(s) migrée(s)`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Erreur migration:', err);
  process.exit(1);
});
