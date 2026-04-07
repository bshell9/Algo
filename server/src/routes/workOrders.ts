import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getPagination, paginatedResponse } from '../utils/pagination';
import { generateOrderNumber } from '../utils/generators';

export const workOrderRouter = Router();
workOrderRouter.use(authenticate);

const workOrderSchema = z.object({
  shopId: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  jobType: z.string().optional(),
  glassPosition: z.string().optional(),
  scheduledDate: z.string().optional().nullable(),
  scheduledSlot: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  serviceLocation: z.string().optional(),
  serviceAddress: z.string().optional().nullable(),
  serviceCity: z.string().optional().nullable(),
  serviceState: z.string().optional().nullable(),
  serviceZip: z.string().optional().nullable(),
  nagsPartNumber: z.string().optional().nullable(),
  partDescription: z.string().optional().nullable(),
  partType: z.string().optional(),
  glassVendor: z.string().optional().nullable(),
  retailPrice: z.number().optional(),
  partCost: z.number().optional(),
  laborCost: z.number().optional(),
  moldingCost: z.number().optional(),
  kitCost: z.number().optional(),
  otherCharges: z.number().optional(),
  discount: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  isInsuranceJob: z.boolean().optional(),
  insuranceCompanyCode: z.string().optional().nullable(),
  claimNumber: z.string().optional().nullable(),
  policyNumber: z.string().optional().nullable(),
  deductible: z.number().optional(),
  insurancePays: z.number().optional(),
  customerPays: z.number().optional(),
  requiresCalibration: z.boolean().optional(),
  calibrationType: z.string().optional().nullable(),
  calibrationCost: z.number().optional(),
  csrNotes: z.string().optional().nullable(),
  techNotes: z.string().optional().nullable(),
  dispatchNotes: z.string().optional().nullable(),
});

// GET /api/work-orders
workOrderRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { status, shopId, podId, technicianId, date, search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (shopId) where.shopId = shopId;
    if (podId) where.podId = podId;
    if (technicianId) where.technicianId = technicianId;
    if (date) {
      const d = new Date(date as string);
      where.scheduledDate = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string } },
        { customer: { lastName: { contains: search as string } } },
        { customer: { phone: { contains: search as string } } },
        { nagsPartNumber: { contains: search as string } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          vehicle: { select: { id: true, year: true, make: true, model: true } },
          pod: { select: { id: true, name: true, code: true } },
          technician: { select: { id: true, firstName: true, lastName: true } },
          shop: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);
    res.json(paginatedResponse(orders, total, page, limit));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch work orders' });
  }
});

// GET /api/work-orders/:id
workOrderRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        vehicle: true,
        pod: { include: { technicians: { select: { id: true, firstName: true, lastName: true } } } },
        technician: { select: { id: true, firstName: true, lastName: true, phone: true } },
        csr: { select: { id: true, firstName: true, lastName: true } },
        shop: true,
        lineItems: true,
        scheduleEntry: true,
        invoice: { include: { payments: true } },
        claim: true,
      },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Work order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch work order' });
  }
});

// POST /api/work-orders
workOrderRouter.post('/', validate(workOrderSchema), async (req: AuthRequest, res: Response) => {
  try {
    const orderNumber = generateOrderNumber();
    const order = await prisma.workOrder.create({
      data: {
        ...req.body,
        orderNumber,
        csrId: req.user!.id,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        vehicle: { select: { id: true, year: true, make: true, model: true } },
        shop: { select: { id: true, name: true, code: true } },
      },
    });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create work order' });
  }
});

// PUT /api/work-orders/:id
workOrderRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const update: any = { ...req.body };
    if (update.scheduledDate) update.scheduledDate = new Date(update.scheduledDate);
    const order = await prisma.workOrder.update({ where: { id: req.params.id }, data: update });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update work order' });
  }
});

// PUT /api/work-orders/:id/status - Status transitions (Omega-style flow)
workOrderRouter.put('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const timestamps: any = {};

    switch (status) {
      case 'dispatched': timestamps.dispatchedAt = new Date(); break;
      case 'on_site': timestamps.arrivedAt = new Date(); break;
      case 'in_progress': timestamps.startedAt = new Date(); break;
      case 'completed': timestamps.completedAt = new Date(); break;
    }

    const order = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: { status, ...timestamps },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { id: true, year: true, make: true, model: true } },
        pod: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// POST /api/work-orders/:id/dispatch - Assign pod and dispatch
workOrderRouter.post('/:id/dispatch', async (req: AuthRequest, res: Response) => {
  try {
    const { podId, technicianId } = req.body;
    const order = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: {
        podId,
        technicianId,
        status: 'dispatched',
        dispatchedAt: new Date(),
        dispatchNotes: req.body.notes,
      },
    });

    if (podId) {
      await prisma.pod.update({ where: { id: podId }, data: { status: 'dispatched' } });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to dispatch' });
  }
});

// POST /api/work-orders/:id/line-items
workOrderRouter.post('/:id/line-items', async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.workOrderLineItem.create({
      data: { ...req.body, workOrderId: req.params.id },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add line item' });
  }
});

// DELETE /api/work-orders/:id/line-items/:itemId
workOrderRouter.delete('/:id/line-items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.workOrderLineItem.delete({ where: { id: req.params.itemId } });
    res.json({ success: true, data: { message: 'Line item deleted' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete line item' });
  }
});
