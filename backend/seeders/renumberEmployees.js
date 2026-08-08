/**
 * Script de renumérotation des matricules employés
 * --------------------------------------------------
 * Réassigne les matricules de 1 à N pour tous les employés
 * (actifs + archivés), triés par matricule actuel puis date de création.
 *
 * Utilisation :
 *   cd backend
 *   node seeders/renumberEmployees.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee.js';

dotenv.config();

async function renumberEmployees() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI non défini dans .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connecté à MongoDB\n');

  // Récupère TOUS les employés triés par matricule actuel puis date de création
  const employees = await Employee.find({}).sort({ employeeNumber: 1, createdAt: 1 });
  console.log(`👥 ${employees.length} employés trouvés\n`);

  if (employees.length === 0) {
    console.log('Aucun employé à renuméroter.');
    await mongoose.disconnect();
    return;
  }

  const changes = [];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const newNumber = i + 1;
    const oldNumber = emp.employeeNumber;

    if (oldNumber !== newNumber) {
      await Employee.findByIdAndUpdate(emp._id, { employeeNumber: newNumber });
      changes.push({ name: emp.fullName, old: oldNumber, new: newNumber });
      console.log(`  ${emp.fullName.padEnd(30)} ${String(oldNumber).padStart(4)} → ${newNumber}`);
    } else {
      console.log(`  ${emp.fullName.padEnd(30)} ${String(oldNumber).padStart(4)}   (inchangé)`);
    }
  }

  console.log(`\n✅ Renumérotation terminée — ${changes.length} matricule(s) modifié(s).`);
  await mongoose.disconnect();
}

renumberEmployees().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
