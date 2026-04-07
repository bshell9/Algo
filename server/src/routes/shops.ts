import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const shopRouter = Router();
shopRouter.use(authenticate);

// GET /api/shops - List all shops
shopRouter.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const shops = await prisma.shop.findMany({
      where: { isActive: true },
      include: { _count: { select: { users: true, pods: true, workOrders: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: shops });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch shops' });
  }
});

// GET /api/shops/:id
shopRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.id },
      include: {
        users: { select: { id: true, firstName: true, lastName: true, role: true, isActive: true } },
        pods: true,
        _count: { select: { workOrders: true, invoices: true, inventoryItems: true } },
      },
    });
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    res.json({ success: true, data: shop });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch shop' });
  }
});

// POST /api/shops
shopRouter.post('/', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const shop = await prisma.shop.create({ data: req.body });
    res.status(201).json({ success: true, data: shop });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create shop' });
  }
});

// PUT /api/shops/:id
shopRouter.put('/:id', authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const shop = await prisma.shop.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: shop });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update shop' });
  }
});
