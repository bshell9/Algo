import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getPagination, paginatedResponse } from '../utils/pagination';

export const customerRouter = Router();
customerRouter.use(authenticate);

const customerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7),
  email: z.string().email().optional().nullable(),
  altPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  source: z.string().optional(),
  isFleet: z.boolean().optional(),
  fleetName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/customers
customerRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const search = req.query.search as string;
    const where = search ? {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ],
    } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { _count: { select: { vehicles: true, workOrders: true } } } }),
      prisma.customer.count({ where }),
    ]);
    res.json(paginatedResponse(customers, total, page, limit));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id
customerRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        vehicles: true,
        workOrders: { orderBy: { createdAt: 'desc' }, take: 20, include: { vehicle: true } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch customer' });
  }
});

// POST /api/customers
customerRouter.post('/', validate(customerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id
customerRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
customerRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Customer deleted' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete customer' });
  }
});

// GET /api/customers/:id/vehicles
customerRouter.get('/:id/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ where: { customerId: req.params.id }, orderBy: { year: 'desc' } });
    res.json({ success: true, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
  }
});
