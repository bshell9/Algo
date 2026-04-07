import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { customerRouter } from './routes/customers';
import { vehicleRouter } from './routes/vehicles';
import { workOrderRouter } from './routes/workOrders';
import { podRouter } from './routes/pods';
import { scheduleRouter } from './routes/schedule';
import { inventoryRouter } from './routes/inventory';
import { claimRouter } from './routes/claims';
import { invoiceRouter } from './routes/invoices';
import { posRouter } from './routes/pos';
import { quoteRouter } from './routes/quotes';
import { dashboardRouter } from './routes/dashboard';
import { shopRouter } from './routes/shops';
import { reportRouter } from './routes/reports';
import { nagsRouter } from './routes/nags';

dotenv.config();

export const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api', limiter);

// ─── Routes ───
app.use('/api/auth', authRouter);
app.use('/api/shops', shopRouter);
app.use('/api/customers', customerRouter);
app.use('/api/vehicles', vehicleRouter);
app.use('/api/work-orders', workOrderRouter);
app.use('/api/pods', podRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/nags', nagsRouter);
app.use('/api/claims', claimRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/pos', posRouter);
app.use('/api/quotes', quoteRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ───
app.use(errorHandler);

// ─── Start ───
app.listen(PORT, () => {
  console.log(`AutoGlass Pod System API running on port ${PORT}`);
});

export default app;
