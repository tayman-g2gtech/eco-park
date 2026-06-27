import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Resolver } from 'dns/promises';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Schedule from '../models/Schedule.js';

dotenv.config();

// Custom DNS connection function (same as seed.js)
async function connectWithCustomDNS(mongoUri) {
  const match = mongoUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(.*)/);
  if (!match) throw new Error('URI MongoDB invalide');
  const [, user, pass, cluster, rest] = match;

  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  console.log(`🔍 Résolution SRV via Google DNS pour: ${cluster}`);
  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${cluster}`);
  const txtRecords = await resolver.resolveTxt(cluster).catch(() => []);
  const txtOptions = txtRecords.flat().join('&');

  const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(',');
  const queryString = txtOptions || 'authSource=admin&ssl=true';
  const directUri = `mongodb://${user}:${pass}@${hosts}/${rest ? rest.replace(/^\//, '') : ''}?${queryString}`;

  return mongoose.connect(directUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4,
    tls: true,
  });
}

function getMondayOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

const seedStaff = async () => {
  try {
    await connectWithCustomDNS(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // Get 3 active employees
    const employees = await Employee.find({ isActive: true }).limit(3);
    if (employees.length < 3) {
      console.log('❌ Il n\'y a pas assez d\'employés dans la base de données. Veuillez d\'abord exécuter le seed principal.');
      process.exit(1);
    }

    console.log(`👥 3 employés sélectionnés pour la liaison :`);
    employees.forEach(e => console.log(`  - N°${e.employeeNumber} : ${e.fullName} (${e.pole})`));

    // Current Week Monday
    const monday = getMondayOfCurrentWeek();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const weekLabel = `Du Lundi ${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth()+1).toString().padStart(2, '0')} au Dimanche ${sunday.getDate().toString().padStart(2, '0')}/${(sunday.getMonth()+1).toString().padStart(2, '0')}`;

    console.log(`📅 Semaine en cours : ${weekLabel} (Début : ${formatDate(monday)})`);

    // 1. Create or update User accounts for these 3 employees
    const credentials = [];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      // Generate clean email based on first name
      const firstName = emp.fullName.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const email = `${firstName}@ecopark.ma`;
      const password = 'staff123'; // Simple testing password

      // Remove existing user with this email to avoid duplicates
      await User.deleteMany({ email });
      // Remove any user linked to this employee
      await User.deleteMany({ employeeId: emp._id });

      const userPole = emp.pole === 'Creperie' ? 'Crep' : emp.pole;

      const user = new User({
        name: emp.fullName,
        email,
        password,
        role: 'staff',
        pole: userPole,
        employeeId: emp._id,
        isActive: true
      });
      await user.save();

      credentials.push({
        name: emp.fullName,
        email,
        password,
        pole: userPole
      });
    }
    console.log('👤 Comptes utilisateurs Staff créés avec succès !');

    // 2. Set planning schedules for the current week for these 3 employees
    let schedule = await Schedule.findOne({ weekStart: monday });
    if (!schedule) {
      schedule = new Schedule({
        weekStart: monday,
        weekLabel,
        entries: []
      });
    }

    // Set sample shifts
    const sampleShifts = [
      { lu: '07H00', ma: '07H00', me: 'REST', je: '15H00', ve: '15H00', sa: 'SOIR', di: 'REST', rcp: 1 },
      { lu: '11H00', ma: '11H00', me: '11H00', je: 'REST', ve: 'SOIR', sa: 'SOIR', di: 'REST', rcp: 0 },
      { lu: 'REST', ma: '15H00', me: '15H00', je: '07H00', ve: '07H00', sa: 'REST', di: 'SOIR', rcp: 2 }
    ];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const shifts = sampleShifts[i];

      // Remove existing entry for this employee if present
      schedule.entries = schedule.entries.filter(entry => entry.employeeId.toString() !== emp._id.toString());

      // Add new entry
      schedule.entries.push({
        employeeId: emp._id,
        lundi: shifts.lu,
        mardi: shifts.ma,
        mercredi: shifts.me,
        jeudi: shifts.je,
        vendredi: shifts.ve,
        samedi: shifts.sa,
        dimanche: shifts.di,
        rcp: shifts.rcp
      });
    }

    await schedule.save();
    console.log('📅 Plannings de la semaine mis à jour pour ces collaborateurs !');

    console.log('\n🗝️  IDENTIFIANTS DE CONNEXION STAFF POUR VOS TESTS :');
    console.log('===================================================');
    credentials.forEach(c => {
      console.log(`👤 Nom  : ${c.name}`);
      console.log(`   Pôle : ${c.pole}`);
      console.log(`   📧   : ${c.email}`);
      console.log(`   🔑   : ${c.password}`);
      console.log('---------------------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur seeding staff:', err.message);
    process.exit(1);
  }
};

seedStaff();
