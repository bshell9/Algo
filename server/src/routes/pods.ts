import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const podRouter = Router();
podRouter.use(authenticate);

// GET /api/pods
podRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, status } = req.query;
    const where: any = { isActive: true };
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;

    const pods = await prisma.pod.findMany({
      where,
      include: {
        shop: { select: { id: true, name: true, code: true } },
        technicians: { select: { id: true, firstName: true, lastName: true, phone: true } },
        workOrders: {
          where: { status: { in: ['dispatched', 'en_route', 'on_site', 'in_progress'] } },
          include: {
            customer: { select: { firstName: true, lastName: true, phone: true } },
            vehicle: { select: { year: true, make: true, model: true } },
          },
        },
        _count: { select: { workOrders: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: pods });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch pods' });
  }
});

// GET /api/pods/:id
podRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pod = await prisma.pod.findUnique({
      where: { id: req.params.id },
      include: {
        shop: true,
        technicians: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        workOrders: {
          where: { scheduledDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          orderBy: { scheduledDate: 'asc' },
          include: {
            customer: true,
            vehicle: true,
          },
        },
        podInventory: { include: { nagsPart: true } },
      },
    });
    if (!pod) return res.status(404).json({ success: false, error: 'Pod not found' });
    res.json({ success: true, data: pod });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch pod' });
  }
});

// POST /api/pods
podRouter.post('/', authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const pod = await prisma.pod.create({ data: req.body });
    res.status(201).json({ success: true, data: pod });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create pod' });
  }
});

// PUT /api/pods/:id
podRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pod = await prisma.pod.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: pod });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update pod' });
  }
});

// PUT /api/pods/:id/status
podRouter.put('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const pod = await prisma.pod.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, data: pod });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update pod status' });
  }
});

// PUT /api/pods/:id/location - GPS location update from mobile
podRouter.put('/:id/location', async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng } = req.body;
    const pod = await prisma.pod.update({
      where: { id: req.params.id },
      data: { currentLat: lat, currentLng: lng, lastLocationUpdate: new Date() },
    });
    res.json({ success: true, data: pod });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update location' });
  }
});

// GET /api/pods/:id/today - Today's schedule for a pod
podRouter.get('/:id/today', async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const jobs = await prisma.workOrder.findMany({
      where: { podId: req.params.id, scheduledDate: { gte: today, lt: tomorrow } },
      orderBy: { scheduledTime: 'asc' },
      include: { customer: true, vehicle: true },
    });
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch today schedule' });
  }
});
