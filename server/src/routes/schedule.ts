import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

export const scheduleRouter = Router();
scheduleRouter.use(authenticate);

// GET /api/schedule - Get schedule for date range
scheduleRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, podId, technicianId, startDate, endDate } = req.query;

    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (podId) where.podId = podId;
    if (technicianId) where.technicianId = technicianId;
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    } else if (startDate) {
      where.date = { gte: new Date(startDate as string) };
    }

    const entries = await prisma.scheduleEntry.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        workOrder: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            vehicle: { select: { id: true, year: true, make: true, model: true } },
          },
        },
        pod: { select: { id: true, name: true, code: true } },
        technician: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch schedule' });
  }
});

// POST /api/schedule
scheduleRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.scheduleEntry.create({
      data: {
        ...req.body,
        date: new Date(req.body.date),
      },
      include: {
        workOrder: {
          include: {
            customer: { select: { firstName: true, lastName: true } },
            vehicle: { select: { year: true, make: true, model: true } },
          },
        },
      },
    });

    // Update work order status to scheduled
    await prisma.workOrder.update({
      where: { id: req.body.workOrderId },
      data: {
        status: 'scheduled',
        scheduledDate: new Date(req.body.date),
        scheduledSlot: req.body.slot,
        scheduledTime: req.body.startTime,
        podId: req.body.podId,
        technicianId: req.body.technicianId,
      },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create schedule entry' });
  }
});

// PUT /api/schedule/:id
scheduleRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const update: any = { ...req.body };
    if (update.date) update.date = new Date(update.date);

    const entry = await prisma.scheduleEntry.update({ where: { id: req.params.id }, data: update });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update schedule entry' });
  }
});

// DELETE /api/schedule/:id
scheduleRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.scheduleEntry.findUnique({ where: { id: req.params.id } });
    if (entry) {
      await prisma.workOrder.update({ where: { id: entry.workOrderId }, data: { status: 'pending', scheduledDate: null, scheduledSlot: null, scheduledTime: null } });
    }
    await prisma.scheduleEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Schedule entry deleted' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete schedule entry' });
  }
});

// GET /api/schedule/availability - Check pod/tech availability for a date
scheduleRouter.get('/availability', async (req: AuthRequest, res: Response) => {
  try {
    const { date, shopId } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'Date required' });

    const targetDate = new Date(date as string);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where: any = { date: { gte: targetDate, lt: nextDay } };
    if (shopId) where.shopId = shopId;

    const existingEntries = await prisma.scheduleEntry.findMany({
      where,
      include: { pod: { select: { id: true, name: true, maxJobsPerDay: true } } },
    });

    const pods = await prisma.pod.findMany({
      where: { isActive: true, ...(shopId ? { shopId: shopId as string } : {}) },
      select: { id: true, name: true, code: true, maxJobsPerDay: true },
    });

    const availability = pods.map((pod) => {
      const podEntries = existingEntries.filter((e) => e.podId === pod.id);
      return {
        pod,
        bookedSlots: podEntries.length,
        maxSlots: pod.maxJobsPerDay,
        available: podEntries.length < pod.maxJobsPerDay,
        entries: podEntries,
      };
    });

    res.json({ success: true, data: availability });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to check availability' });
  }
});
