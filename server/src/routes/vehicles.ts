import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

export const vehicleRouter = Router();
vehicleRouter.use(authenticate);

const vehicleSchema = z.object({
  customerId: z.string().uuid(),
  vin: z.string().optional().nullable(),
  year: z.number().min(1900).max(2100),
  make: z.string().min(1),
  model: z.string().min(1),
  subModel: z.string().optional().nullable(),
  bodyStyle: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  plateNumber: z.string().optional().nullable(),
  plateState: z.string().optional().nullable(),
});

// GET /api/vehicles
vehicleRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const where = search ? {
      OR: [
        { vin: { contains: search, mode: 'insensitive' as const } },
        { make: { contains: search, mode: 'insensitive' as const } },
        { model: { contains: search, mode: 'insensitive' as const } },
        { plateNumber: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};
    const vehicles = await prisma.vehicle.findMany({
      where,
      take: 50,
      orderBy: { updatedAt: 'desc' },
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ success: true, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
  }
});

// GET /api/vehicles/:id
vehicleRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: { customer: true, workOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch vehicle' });
  }
});

// POST /api/vehicles
vehicleRouter.post('/', validate(vehicleSchema), async (req: AuthRequest, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.create({ data: req.body });
    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create vehicle' });
  }
});

// PUT /api/vehicles/:id
vehicleRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update vehicle' });
  }
});

// GET /api/vehicles/lookup/vin/:vin - VIN decode placeholder
vehicleRouter.get('/lookup/vin/:vin', async (req: AuthRequest, res: Response) => {
  try {
    // In production, integrate with NHTSA VIN decoder API
    const vin = req.params.vin;
    const existing = await prisma.vehicle.findFirst({ where: { vin } });
    if (existing) {
      return res.json({ success: true, data: existing, source: 'database' });
    }
    // Placeholder VIN decode response
    res.json({
      success: true,
      data: { vin, year: 0, make: '', model: '', bodyStyle: '', message: 'VIN decode: integrate NHTSA API for production' },
      source: 'decode',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'VIN lookup failed' });
  }
});
