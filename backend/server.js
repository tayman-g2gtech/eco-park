import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { startCronJobs } from './jobs/alerts.js';

// Routes
import productRoutes from './routes/products.js';
import stockMovementRoutes from './routes/stockMovements.js';
import supplierRoutes from './routes/suppliers.js';
import purchaseRoutes from './routes/purchases.js';
import expenseRoutes from './routes/expenses.js';
import employeeRoutes from './routes/employees.js';
import scheduleRoutes from './routes/schedules.js';
import salaryRoutes from './routes/salaries.js';
import dashboardRoutes from './routes/dashboard.js';
import authRoutes from './routes/auth.js';
import revenueRoutes from './routes/revenues.js';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// ── CORS : headers manuels (compatible Railway + Netlify) ──────────────────
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Répondre immédiatement aux requêtes preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/revenues', revenueRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Eco-Park API is running 🍽️' });
});

// Start cron jobs
startCronJobs();

app.listen(PORT, () => {
  console.log(`🚀 Eco-Park Backend running on http://localhost:${PORT}`);
});
