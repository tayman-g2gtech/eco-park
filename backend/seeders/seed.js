import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Resolver } from 'dns/promises';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Employee from '../models/Employee.js';

dotenv.config();

// Fix: contourner le DNS système qui bloque les requêtes SRV (même fix que db.js)
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

const PDJ_PRODUCTS = [
  // Viandes
  { name: 'SAUCISSE', category: 'Viande', pole: 'PDJ', unit: 'kg' },
  { name: 'THON', category: 'Viande', pole: 'PDJ', unit: 'boite' },
  { name: 'SAUMON FUME', category: 'Viande', pole: 'PDJ', unit: 'kg' },
  { name: 'FILET DE POULET', category: 'Viande', pole: 'PDJ', unit: 'kg' },
  // Charcuterie
  { name: 'DINDE FUME', category: 'Charcuterie', pole: 'PDJ', unit: 'kg' },
  { name: 'SALAMI DE DINDE', category: 'Charcuterie', pole: 'PDJ', unit: 'kg' },
  { name: 'CACHIR MAACHAB', category: 'Charcuterie', pole: 'PDJ', unit: 'kg' },
  // Pain
  { name: 'PAIN DE MIE', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'PAIN CHOCOLAT', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'CROISSANT', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'SHNEEK', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'PISTOLET', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'PAIN COMPLET', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'PAIN ORGE', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'PAIN TOSTADA', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'TOSTADA COMPLET', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'TACHNIFT', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'CATALAN GRAND', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  { name: 'CATALAN PETIT', category: 'Pain', pole: 'PDJ', unit: 'pièce' },
  // Fromage-Lait-Beurre
  { name: 'LAIT FRAIS', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'l' },
  { name: 'BEURRE LIGHT', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'BEURRE FRAIS', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'YAOURT', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'pièce' },
  { name: 'F LA VACHE QUI RIT', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'boite' },
  { name: 'F LA VACHE QUI RIT LIGHT', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'boite' },
  { name: 'F PIZZA CHEESE', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'F EDAM TENDRE', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'F TRANCHE', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'JBEN', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'pièce' },
  { name: 'BELDI', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'CONFITURE', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'CONFITURE LIGHT', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'KHLIAA', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'AMLOU', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'AMLOU AMANDE', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'MIEL', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  { name: 'MIEL PUR', category: 'Fromage-Lait-Beurre', pole: 'PDJ', unit: 'kg' },
  // Épicerie
  { name: 'SEL', category: 'Épicerie', pole: 'PDJ', unit: 'kg' },
  { name: 'CUMIN', category: 'Épicerie', pole: 'PDJ', unit: 'kg' },
  { name: 'ORIGAN', category: 'Épicerie', pole: 'PDJ', unit: 'kg' },
  { name: 'POIVRE NOIR', category: 'Épicerie', pole: 'PDJ', unit: 'kg' },
  { name: 'CONSERVES', category: 'Épicerie', pole: 'PDJ', unit: 'boite' },
  { name: 'CHAMPIGNON', category: 'Épicerie', pole: 'PDJ', unit: 'boite' },
  { name: 'MAIS', category: 'Épicerie', pole: 'PDJ', unit: 'boite' },
  { name: 'LUNCHEON MEAT', category: 'Épicerie', pole: 'PDJ', unit: 'boite' },
  { name: 'KETCHUP', category: 'Épicerie', pole: 'PDJ', unit: 'l' },
  { name: 'HUILE', category: 'Épicerie', pole: 'PDJ', unit: 'l' },
  { name: 'HUILE DE TABLE', category: 'Épicerie', pole: 'PDJ', unit: 'l' },
  { name: 'HUILE D\'OLIVE', category: 'Épicerie', pole: 'PDJ', unit: 'l' },
  { name: 'HUILE D\'ARGANE', category: 'Épicerie', pole: 'PDJ', unit: 'l' },
  { name: 'SUCRE', category: 'Épicerie', pole: 'PDJ', unit: 'kg' },
  { name: 'OEUFS', category: 'Épicerie', pole: 'PDJ', unit: 'pièce' },
  { name: 'TABASCO', category: 'Épicerie', pole: 'PDJ', unit: 'pièce' },
  { name: 'CHIA', category: 'Épicerie', pole: 'PDJ', unit: 'kg' },
  { name: 'BEURRE DE CACAHUETE', category: 'Épicerie', pole: 'PDJ', unit: 'kg' },
  { name: 'NUTELLA', category: 'Épicerie', pole: 'PDJ', unit: 'kg' },
  { name: 'AROME VANILLE', category: 'Arôme', pole: 'PDJ', unit: 'pièce' },
  { name: 'FARINE FINO', category: 'Farine', pole: 'PDJ', unit: 'kg' },
  { name: 'FARINE SMIDA', category: 'Farine', pole: 'PDJ', unit: 'kg' },
  { name: 'FARINE MIMOUNA', category: 'Farine', pole: 'PDJ', unit: 'kg' },
  { name: 'FARINE TCHICHA', category: 'Farine', pole: 'PDJ', unit: 'kg' },
  { name: 'LEVURE CHIMIQUE ALSA', category: 'Farine', pole: 'PDJ', unit: 'pièce' },
  { name: 'LEVURE RAFIAA 125G', category: 'Farine', pole: 'PDJ', unit: 'pièce' },
  // Légumes
  { name: 'SALADE', category: 'Légumes', pole: 'PDJ', unit: 'pièce' },
  { name: 'CONCOMBRE', category: 'Légumes', pole: 'PDJ', unit: 'pièce' },
  { name: 'TOMATE', category: 'Légumes', pole: 'PDJ', unit: 'kg' },
  { name: 'TOMATE CERISE', category: 'Légumes', pole: 'PDJ', unit: 'kg' },
  { name: 'OIGNONS', category: 'Légumes', pole: 'PDJ', unit: 'kg' },
  { name: 'PERSIL', category: 'Légumes', pole: 'PDJ', unit: 'botte' },
  { name: 'OLIVE MCHARMAL', category: 'Légumes', pole: 'PDJ', unit: 'kg' },
  { name: 'OLIVE NOIR', category: 'Légumes', pole: 'PDJ', unit: 'kg' },
  // Fruits
  { name: 'AVOCAT', category: 'Fruits', pole: 'PDJ', unit: 'pièce' },
  { name: 'BANANE', category: 'Fruits', pole: 'PDJ', unit: 'kg' },
  { name: 'POMME', category: 'Fruits', pole: 'PDJ', unit: 'kg' },
  { name: 'FRAISE', category: 'Fruits', pole: 'PDJ', unit: 'kg' },
  { name: 'KAKI', category: 'Fruits', pole: 'PDJ', unit: 'kg' },
  { name: 'KIWI', category: 'Fruits', pole: 'PDJ', unit: 'pièce' },
  { name: 'MANGUE', category: 'Fruits', pole: 'PDJ', unit: 'pièce' },
];

const BAR_PRODUCTS = [
  // Poudres
  { name: 'POUDRE COLA CAO', category: 'Poudre', pole: 'Bar', unit: 'kg' },
  { name: 'CIOCCOLATA CLASSICA', category: 'Poudre', pole: 'Bar', unit: 'kg' },
  { name: 'PECHE ICE TEA POUDRE', category: 'Poudre', pole: 'Bar', unit: 'kg' },
  { name: 'CITRON ICE TEA POUDRE', category: 'Poudre', pole: 'Bar', unit: 'kg' },
  { name: 'FRUITS PASSION POUDRE', category: 'Poudre', pole: 'Bar', unit: 'kg' },
  { name: 'MENTHE ICE TEA POUDRE', category: 'Poudre', pole: 'Bar', unit: 'kg' },
  { name: 'BLUEBERRY BLOOM SQUEEZE', category: 'Poudre', pole: 'Bar', unit: 'pièce' },
  { name: 'SQUEEZE MANGO', category: 'Poudre', pole: 'Bar', unit: 'pièce' },
  { name: 'COCONUT EMOTION SQUEEZE', category: 'Poudre', pole: 'Bar', unit: 'pièce' },
  { name: 'STRAWBERRY FRAIS', category: 'Poudre', pole: 'Bar', unit: 'pièce' },
  // Café-Thé
  { name: 'CAFE ESPRESSO CITTA', category: 'Café-Thé', pole: 'Bar', unit: 'kg' },
  { name: 'NESPRESSO CAPSULE', category: 'Café-Thé', pole: 'Bar', unit: 'pièce' },
  { name: 'NESCAFE CLASSIC', category: 'Café-Thé', pole: 'Bar', unit: 'kg' },
  { name: 'VERVEINE SACHET', category: 'Café-Thé', pole: 'Bar', unit: 'boite' },
  { name: 'VERVEINE FRAICHE', category: 'Café-Thé', pole: 'Bar', unit: 'botte' },
  { name: 'THE AUX HERBES', category: 'Café-Thé', pole: 'Bar', unit: 'boite' },
  { name: 'LIPTON SACHET', category: 'Café-Thé', pole: 'Bar', unit: 'boite' },
  { name: 'MANZANILLA', category: 'Café-Thé', pole: 'Bar', unit: 'boite' },
  { name: 'THE BAHIA', category: 'Café-Thé', pole: 'Bar', unit: 'boite' },
  { name: 'SUCRE GAZELLE 2KG', category: 'Café-Thé', pole: 'Bar', unit: 'kg' },
  // Sirops
  { name: 'SIROP CHOCOLAT', category: 'Sirop', pole: 'Bar', unit: 'l' },
  { name: 'SIROP CARAMEL', category: 'Sirop', pole: 'Bar', unit: 'l' },
  { name: 'SIROP MOJITO', category: 'Sirop', pole: 'Bar', unit: 'l' },
  { name: 'SIROP VANILLE', category: 'Sirop', pole: 'Bar', unit: 'l' },
  { name: 'SIROP NOISETTE', category: 'Sirop', pole: 'Bar', unit: 'l' },
  { name: 'SIROP GRENADINE DUVAL', category: 'Sirop', pole: 'Bar', unit: 'l' },
  // Toppings
  { name: 'FRAISE TOOPING', category: 'Topping', pole: 'Bar', unit: 'kg' },
  { name: 'CARAMEL TOOPING', category: 'Topping', pole: 'Bar', unit: 'kg' },
  { name: 'CHOCOLAT TOOPING', category: 'Topping', pole: 'Bar', unit: 'kg' },
  { name: 'CREME SUCREE LIQUIDE', category: 'Crème', pole: 'Bar', unit: 'l' },
  { name: 'NATA FLIT', category: 'Crème', pole: 'Bar', unit: 'pièce' },
  // Chocolaterie
  { name: 'SNICKERS', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  { name: 'MARS', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  { name: 'TWIX', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  { name: 'KINDER BUENO', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  { name: 'KIT KAT', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  { name: 'OREO', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  { name: 'MILKA', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  { name: 'FERRERO ROCHER', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  { name: 'RAFFAELLO', category: 'Chocolaterie', pole: 'Bar', unit: 'pièce' },
  // Fruits Secs
  { name: 'ACAJOU', category: 'Fruits Secs', pole: 'Bar', unit: 'kg' },
  { name: 'AMANDE', category: 'Fruits Secs', pole: 'Bar', unit: 'kg' },
  { name: 'NOISETTE', category: 'Fruits Secs', pole: 'Bar', unit: 'kg' },
  { name: 'RAISIN SEC', category: 'Fruits Secs', pole: 'Bar', unit: 'kg' },
  { name: 'NOIX', category: 'Fruits Secs', pole: 'Bar', unit: 'kg' },
  { name: 'PISTACHE', category: 'Fruits Secs', pole: 'Bar', unit: 'kg' },
  // Eaux & Boissons
  { name: 'SIDI ALI 33CL', category: 'Eau', pole: 'Bar', unit: 'pièce' },
  { name: 'SIDI ALI 50CL', category: 'Eau', pole: 'Bar', unit: 'pièce' },
  { name: 'SIDI ALI 75CL VERRE', category: 'Eau', pole: 'Bar', unit: 'pièce' },
  { name: 'OULMES 25CL', category: 'Eau', pole: 'Bar', unit: 'pièce' },
  { name: 'COCA COLA 33CL', category: 'Boisson', pole: 'Bar', unit: 'pièce' },
  { name: 'COCA ZERO 33CL', category: 'Boisson', pole: 'Bar', unit: 'pièce' },
  { name: 'SPRITE 33CL', category: 'Boisson', pole: 'Bar', unit: 'pièce' },
  { name: 'HAWAI 33CL', category: 'Boisson', pole: 'Bar', unit: 'pièce' },
  { name: 'SCHWEPPS TONIC', category: 'Boisson', pole: 'Bar', unit: 'pièce' },
  { name: 'SCHWEPPS CITRON', category: 'Boisson', pole: 'Bar', unit: 'pièce' },
  { name: 'RED BULL', category: 'Boisson', pole: 'Bar', unit: 'pièce' },
  // Lait & Fruits (Bar)
  { name: 'LAIT UHT', category: 'Fromage-Lait-Beurre', pole: 'Bar', unit: 'l' },
  { name: 'CAROTTE', category: 'Légumes', pole: 'Bar', unit: 'kg' },
  { name: 'BETTERAVE', category: 'Légumes', pole: 'Bar', unit: 'kg' },
  { name: 'LES EPINARDS', category: 'Légumes', pole: 'Bar', unit: 'kg' },
  { name: 'CITRON', category: 'Fruits', pole: 'Bar', unit: 'kg' },
  { name: 'ORANGE', category: 'Fruits', pole: 'Bar', unit: 'kg' },
  { name: 'PECHE', category: 'Fruits', pole: 'Bar', unit: 'kg' },
  { name: 'ANANAS', category: 'Fruits', pole: 'Bar', unit: 'pièce' },
];

const CREPERIE_PRODUCTS = [
  // Poissons
  { name: 'THON (Crêperie)', category: 'Poisson', pole: 'Creperie', unit: 'boite' },
  { name: 'CREVETTE', category: 'Poisson', pole: 'Creperie', unit: 'kg' },
  { name: 'CALAMAR', category: 'Poisson', pole: 'Creperie', unit: 'kg' },
  { name: 'FILET DE POULET (Crêperie)', category: 'Viande', pole: 'Creperie', unit: 'kg' },
  { name: 'DINDE FUME (Crêperie)', category: 'Charcuterie', pole: 'Creperie', unit: 'kg' },
  { name: 'SAUMON FUME (Crêperie)', category: 'Poisson', pole: 'Creperie', unit: 'kg' },
  // Nouveautés
  { name: 'KUNAFA', category: 'Nouveautés', pole: 'Creperie', unit: 'kg' },
  { name: 'LOTUS CREME', category: 'Nouveautés', pole: 'Creperie', unit: 'pièce' },
  { name: 'LOTUS SPECULOOS', category: 'Nouveautés', pole: 'Creperie', unit: 'pièce' },
  { name: 'CREAM CHEESE', category: 'Nouveautés', pole: 'Creperie', unit: 'kg' },
  { name: 'PISTACHE CREAM', category: 'Nouveautés', pole: 'Creperie', unit: 'kg' },
  { name: 'CREME FRAICHE HULALA', category: 'Crème', pole: 'Creperie', unit: 'l' },
  // Fromage-Lait
  { name: 'NATA FLIT (Crêperie)', category: 'Crème', pole: 'Creperie', unit: 'pièce' },
  { name: 'LAIT UHT (Crêperie)', category: 'Fromage-Lait-Beurre', pole: 'Creperie', unit: 'l' },
  { name: 'LAIT FRAIS (Crêperie)', category: 'Fromage-Lait-Beurre', pole: 'Creperie', unit: 'l' },
  { name: 'BEURRE FRAIS (Crêperie)', category: 'Fromage-Lait-Beurre', pole: 'Creperie', unit: 'kg' },
  { name: 'F MOZZARELLA', category: 'Fromage-Lait-Beurre', pole: 'Creperie', unit: 'kg' },
  { name: 'F EDAM (Crêperie)', category: 'Fromage-Lait-Beurre', pole: 'Creperie', unit: 'kg' },
  // Toppings
  { name: 'FRAISE TOOPING (Crêperie)', category: 'Topping', pole: 'Creperie', unit: 'kg' },
  { name: 'CARAMEL TOOPING (Crêperie)', category: 'Topping', pole: 'Creperie', unit: 'kg' },
  { name: 'CHOCOLAT TOOPING (Crêperie)', category: 'Topping', pole: 'Creperie', unit: 'kg' },
  { name: 'NUTELLA 900G', category: 'Topping', pole: 'Creperie', unit: 'pièce' },
  // Arômes
  { name: 'VANILLE AROME LIQUIDE', category: 'Arôme', pole: 'Creperie', unit: 'pièce' },
  { name: 'BANANE AROME LIQUIDE', category: 'Arôme', pole: 'Creperie', unit: 'pièce' },
  // Épicerie
  { name: 'OEUFS (Crêperie)', category: 'Épicerie', pole: 'Creperie', unit: 'pièce' },
  { name: 'LEVURE CHIMIQUE ALSA (Crêperie)', category: 'Farine', pole: 'Creperie', unit: 'pièce' },
  { name: 'FARINE (Crêperie)', category: 'Farine', pole: 'Creperie', unit: 'kg' },
  { name: 'SUCRE (Crêperie)', category: 'Épicerie', pole: 'Creperie', unit: 'kg' },
  { name: 'SUCRE GLACE', category: 'Épicerie', pole: 'Creperie', unit: 'kg' },
  { name: 'MIEL KG', category: 'Épicerie', pole: 'Creperie', unit: 'kg' },
  { name: 'AMLOU (Crêperie)', category: 'Épicerie', pole: 'Creperie', unit: 'kg' },
  { name: 'KETCHUP 2L', category: 'Épicerie', pole: 'Creperie', unit: 'pièce' },
  { name: 'HUILE DE TABLE (Crêperie)', category: 'Épicerie', pole: 'Creperie', unit: 'l' },
  // Fruits Secs (Crêperie)
  { name: 'AMANDE (Crêperie)', category: 'Fruits Secs', pole: 'Creperie', unit: 'kg' },
  { name: 'NOIX (Crêperie)', category: 'Fruits Secs', pole: 'Creperie', unit: 'kg' },
  { name: 'NOISETTE (Crêperie)', category: 'Fruits Secs', pole: 'Creperie', unit: 'kg' },
  { name: 'PISTACHE (Crêperie)', category: 'Fruits Secs', pole: 'Creperie', unit: 'kg' },
  { name: 'ACAJOU (Crêperie)', category: 'Fruits Secs', pole: 'Creperie', unit: 'kg' },
  // Légumes & Fruits
  { name: 'SALADE (Crêperie)', category: 'Légumes', pole: 'Creperie', unit: 'pièce' },
  { name: 'CONCOMBRE (Crêperie)', category: 'Légumes', pole: 'Creperie', unit: 'pièce' },
  { name: 'TOMATE (Crêperie)', category: 'Légumes', pole: 'Creperie', unit: 'kg' },
  { name: 'OLIVE (Crêperie)', category: 'Légumes', pole: 'Creperie', unit: 'kg' },
  { name: 'KIWI (Crêperie)', category: 'Fruits', pole: 'Creperie', unit: 'pièce' },
  { name: 'AVOCAT (Crêperie)', category: 'Fruits', pole: 'Creperie', unit: 'pièce' },
  { name: 'BANANE (Crêperie)', category: 'Fruits', pole: 'Creperie', unit: 'kg' },
  { name: 'FRAISE (Crêperie)', category: 'Fruits', pole: 'Creperie', unit: 'kg' },
  { name: 'MANGUE (Crêperie)', category: 'Fruits', pole: 'Creperie', unit: 'pièce' },
  { name: 'POMME (Crêperie)', category: 'Fruits', pole: 'Creperie', unit: 'kg' },
  // Chocolaterie (Crêperie)
  { name: 'TWIX (Crêperie)', category: 'Chocolaterie', pole: 'Creperie', unit: 'pièce' },
  { name: 'KINDER BUENO (Crêperie)', category: 'Chocolaterie', pole: 'Creperie', unit: 'pièce' },
  { name: 'KIT KAT (Crêperie)', category: 'Chocolaterie', pole: 'Creperie', unit: 'pièce' },
  { name: 'FERRERO ROCHER (Crêperie)', category: 'Chocolaterie', pole: 'Creperie', unit: 'pièce' },
];

const SUPPLIERS = [
  { name: 'BOUCHERIE AL AMAL', category: 'Viandes', defaultPaymentMethod: 'ESPECE' },
  { name: 'ÉPICERIE CENTRALE', category: 'Épicerie', defaultPaymentMethod: 'ESPECE' },
  { name: 'LAITERIE CENTRALE', category: 'Laitiers', defaultPaymentMethod: 'CHEQUE' },
  { name: 'BOULANGERIE', category: 'Boulangerie', defaultPaymentMethod: 'ESPECE' },
  { name: 'FRUITS & LÉGUMES', category: 'Fruits & Légumes', defaultPaymentMethod: 'ESPECE' },
  { name: 'BOISSONS & SODAS', category: 'Boissons', defaultPaymentMethod: 'VIREMENT' },
];

// Employés basés sur PLANNING21 (numéros 1-48)
const EMPLOYEES = [
  // La Caisse
  { employeeNumber: 1, fullName: 'Employé Caisse 1', position: 'Caissier', pole: 'Caisse', paymentType: 'Mensuel', baseSalaryNet: 3000, dailyRate: 115 },
  { employeeNumber: 2, fullName: 'Employé Caisse 2', position: 'Caissier', pole: 'Caisse', paymentType: 'Mensuel', baseSalaryNet: 3000, dailyRate: 115 },
  { employeeNumber: 3, fullName: 'Employé Caisse 3', position: 'Caissier', pole: 'Caisse', paymentType: 'Mensuel', baseSalaryNet: 3000, dailyRate: 115 },
  { employeeNumber: 4, fullName: 'Employé Caisse 4', position: 'Caissier', pole: 'Caisse', paymentType: 'Mensuel', baseSalaryNet: 3000, dailyRate: 115 },
  // Bar
  { employeeNumber: 5, fullName: 'Employé Bar 5', position: 'Barman', pole: 'Bar', paymentType: 'Mensuel', baseSalaryNet: 3500, dailyRate: 135 },
  { employeeNumber: 6, fullName: 'Employé Bar 6', position: 'Barman', pole: 'Bar', paymentType: 'Mensuel', baseSalaryNet: 3500, dailyRate: 135 },
  { employeeNumber: 7, fullName: 'Employé Bar 7', position: 'Barman', pole: 'Bar', paymentType: 'Mensuel', baseSalaryNet: 3500, dailyRate: 135 },
  { employeeNumber: 8, fullName: 'Employé Bar 8', position: 'Barman', pole: 'Bar', paymentType: 'Mensuel', baseSalaryNet: 3500, dailyRate: 135 },
  { employeeNumber: 10, fullName: 'Employé Bar 10', position: 'Barman', pole: 'Bar', paymentType: 'Mensuel', baseSalaryNet: 3500, dailyRate: 135 },
  { employeeNumber: 11, fullName: 'Employé Bar 11', position: 'Barman', pole: 'Bar', paymentType: 'Mensuel', baseSalaryNet: 3500, dailyRate: 135 },
  // Service
  { employeeNumber: 12, fullName: 'Employé Service 12', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 13, fullName: 'Employé Service 13', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 14, fullName: 'Employé Service 14', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 17, fullName: 'Employé Service 17', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 18, fullName: 'Employé Service 18', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 19, fullName: 'Employé Service 19', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 20, fullName: 'Employé Service 20', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 21, fullName: 'Employé Service 21', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 22, fullName: 'Employé Service 22', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 23, fullName: 'Employé Service 23', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 24, fullName: 'Employé Service 24', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 25, fullName: 'Employé Service 25', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 26, fullName: 'Employé Service 26', position: 'Serveur', pole: 'Service', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  // Cuisine
  { employeeNumber: 27, fullName: 'Chef Cuisine 27', position: 'Chef Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 5000, dailyRate: 192 },
  { employeeNumber: 28, fullName: 'Cuisinier 28', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  { employeeNumber: 29, fullName: 'Cuisinier 29', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  { employeeNumber: 30, fullName: 'Cuisinier 30', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  { employeeNumber: 31, fullName: 'Cuisinier 31', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  { employeeNumber: 32, fullName: 'Cuisinier 32', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  { employeeNumber: 33, fullName: 'Cuisinier 33', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  { employeeNumber: 34, fullName: 'Cuisinier 34', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  { employeeNumber: 35, fullName: 'Cuisinier 35', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  { employeeNumber: 36, fullName: 'Cuisinier 36', position: 'Cuisinier', pole: 'Cuisine', paymentType: 'Mensuel', baseSalaryNet: 4000, dailyRate: 154 },
  // Crêperie
  { employeeNumber: 37, fullName: 'Crêpier 37', position: 'Crêpier', pole: 'Creperie', paymentType: 'Mensuel', baseSalaryNet: 3200, dailyRate: 123 },
  { employeeNumber: 38, fullName: 'Crêpier 38', position: 'Crêpier', pole: 'Creperie', paymentType: 'Mensuel', baseSalaryNet: 3200, dailyRate: 123 },
  // PDJ
  { employeeNumber: 39, fullName: 'PDJ Agent 39', position: 'Agent PDJ', pole: 'PDJ', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 40, fullName: 'PDJ Agent 40', position: 'Agent PDJ', pole: 'PDJ', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 41, fullName: 'PDJ Agent 41', position: 'Agent PDJ', pole: 'PDJ', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  { employeeNumber: 42, fullName: 'PDJ Agent 42', position: 'Agent PDJ', pole: 'PDJ', paymentType: 'Mensuel', baseSalaryNet: 2800, dailyRate: 108 },
  // Commis
  { employeeNumber: 43, fullName: 'Commis 43', position: 'Commis', pole: 'Commis', paymentType: 'Journalier', baseSalaryNet: 2600, dailyRate: 100 },
  { employeeNumber: 44, fullName: 'Commis 44', position: 'Commis', pole: 'Commis', paymentType: 'Journalier', baseSalaryNet: 2600, dailyRate: 100 },
  { employeeNumber: 45, fullName: 'Commis 45', position: 'Commis', pole: 'Commis', paymentType: 'Journalier', baseSalaryNet: 2600, dailyRate: 100 },
  { employeeNumber: 48, fullName: 'Commis 48', position: 'Commis', pole: 'Commis', paymentType: 'Journalier', baseSalaryNet: 2600, dailyRate: 100 },
];

const seed = async () => {
  try {
    await connectWithCustomDNS(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Supplier.deleteMany({}),
      Employee.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Seed Admin User
    const admin = new User({
      name: 'Gérant Eco-Park',
      email: 'admin@ecopark.ma',
      password: 'EcoPark2025!',
      role: 'admin'
    });
    await admin.save();
    console.log('👤 Admin créé: admin@ecopark.ma / EcoPark2025!');

    // Seed Products
    const allProducts = [...PDJ_PRODUCTS, ...BAR_PRODUCTS, ...CREPERIE_PRODUCTS];
    const products = await Product.insertMany(allProducts.map(p => ({ ...p, quantityAlert: 1 })));
    console.log(`📦 ${products.length} produits créés (PDJ: ${PDJ_PRODUCTS.length}, Bar: ${BAR_PRODUCTS.length}, Crêperie: ${CREPERIE_PRODUCTS.length})`);

    // Seed Suppliers
    const suppliers = await Supplier.insertMany(SUPPLIERS);
    console.log(`🏪 ${suppliers.length} fournisseurs créés`);

    // Seed Employees
    const employees = await Employee.insertMany(EMPLOYEES);
    console.log(`👥 ${employees.length} employés créés`);

    console.log('\n🎉 Seeding terminé avec succès !');
    console.log('📌 Connectez-vous avec: admin@ecopark.ma / EcoPark2025!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur seeding:', err.message);
    process.exit(1);
  }
};

seed();
