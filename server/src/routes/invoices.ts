import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPagination, paginatedResponse } from '../utils/pagination';
import { generateInvoiceNumber } from '../utils/generators';

export const invoiceRouter = Router();
invoiceRouter.use(authenticate);

// GET /api/invoices
invoiceRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { shopId, status, search } = req.query;

    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          shop: { select: { id: true, name: true, code: true } },
          workOrder: { select: { id: true, orderNumber: true, jobType: true } },
          _count: { select: { payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json(paginatedResponse(invoices, total, page, limit));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
invoiceRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        shop: true,
        workOrder: { include: { vehicle: true, lineItems: true } },
        lineItems: true,
        payments: true,
      },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// POST /api/invoices/from-work-order/:workOrderId - Create invoice from work order
invoiceRouter.post('/from-work-order/:workOrderId', async (req: AuthRequest, res: Response) => {
  try {
    const wo = await prisma.workOrder.findUnique({
      where: { id: req.params.workOrderId },
      include: { lineItems: true },
    });
    if (!wo) return res.status(404).json({ success: false, error: 'Work order not found' });

    const lineItems = wo.lineItems.length > 0
      ? wo.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          isTaxable: item.isTaxable,
        }))
      : [
          { description: `${wo.jobType} - ${wo.glassPosition} (${wo.nagsPartNumber || 'Glass'})`, quantity: 1, unitPrice: wo.retailPrice, total: wo.retailPrice, isTaxable: true },
          { description: 'Labor', quantity: 1, unitPrice: wo.laborCost, total: wo.laborCost, isTaxable: false },
          ...(wo.moldingCost > 0 ? [{ description: 'Molding/Trim', quantity: 1, unitPrice: wo.moldingCost, total: wo.moldingCost, isTaxable: true }] : []),
          ...(wo.kitCost > 0 ? [{ description: 'Urethane Kit', quantity: 1, unitPrice: wo.kitCost, total: wo.kitCost, isTaxable: true }] : []),
          ...(wo.calibrationCost > 0 ? [{ description: 'ADAS Calibration', quantity: 1, unitPrice: wo.calibrationCost, total: wo.calibrationCost, isTaxable: false }] : []),
        ];

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        workOrderId: wo.id,
        customerId: wo.customerId,
        shopId: wo.shopId,
        subtotal: wo.totalAmount - wo.taxAmount,
        taxAmount: wo.taxAmount,
        discount: wo.discount,
        total: wo.totalAmount,
        amountDue: wo.isInsuranceJob ? wo.customerPays : wo.totalAmount,
        dueDate,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    });

    await prisma.workOrder.update({
      where: { id: wo.id },
      data: { status: 'invoiced' },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});

// PUT /api/invoices/:id
invoiceRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
});

// PUT /api/invoices/:id/void
invoiceRouter.put('/:id/void', async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'void' },
    });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to void invoice' });
  }
});
