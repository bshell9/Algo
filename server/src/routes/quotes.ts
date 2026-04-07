import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPagination, paginatedResponse } from '../utils/pagination';
import { generateQuoteNumber, generateOrderNumber } from '../utils/generators';

export const quoteRouter = Router();
quoteRouter.use(authenticate);

// GET /api/quotes
quoteRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { shopId, isConverted } = req.query;

    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (isConverted !== undefined) where.isConverted = isConverted === 'true';

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          shop: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.quote.count({ where }),
    ]);
    res.json(paginatedResponse(quotes, total, page, limit));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch quotes' });
  }
});

// GET /api/quotes/:id
quoteRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { customer: true, shop: true },
    });
    if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });
    res.json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch quote' });
  }
});

// POST /api/quotes
quoteRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quote = await prisma.quote.create({
      data: {
        ...req.body,
        quoteNumber: generateQuoteNumber(),
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : validUntil,
      },
    });
    res.status(201).json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create quote' });
  }
});

// PUT /api/quotes/:id
quoteRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const update: any = { ...req.body };
    if (update.validUntil) update.validUntil = new Date(update.validUntil);
    const quote = await prisma.quote.update({ where: { id: req.params.id }, data: update });
    res.json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update quote' });
  }
});

// POST /api/quotes/:id/convert - Convert quote to work order
quoteRouter.post('/:id/convert', async (req: AuthRequest, res: Response) => {
  try {
    const quote = await prisma.quote.findUnique({ where: { id: req.params.id } });
    if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });
    if (quote.isConverted) return res.status(400).json({ success: false, error: 'Quote already converted' });

    const { customerId, vehicleId } = req.body;
    if (!customerId || !vehicleId) {
      return res.status(400).json({ success: false, error: 'customerId and vehicleId required' });
    }

    const orderNumber = generateOrderNumber();
    const workOrder = await prisma.workOrder.create({
      data: {
        orderNumber,
        shopId: quote.shopId,
        customerId,
        vehicleId,
        jobType: quote.jobType,
        glassPosition: quote.glassPosition,
        nagsPartNumber: quote.nagsPartNumber,
        partDescription: quote.partDescription,
        partType: quote.partType,
        retailPrice: quote.totalAmount - quote.laborCost - quote.moldingCost - quote.kitCost - quote.calibrationCost,
        partCost: quote.partCost,
        laborCost: quote.laborCost,
        moldingCost: quote.moldingCost,
        kitCost: quote.kitCost,
        calibrationCost: quote.calibrationCost,
        otherCharges: quote.otherCharges,
        discount: quote.discount,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        isInsuranceJob: quote.isInsuranceJob,
        insuranceCompanyCode: quote.insuranceCompanyCode,
        deductible: quote.deductible,
        customerPays: quote.customerPays,
        insurancePays: quote.insurancePays,
        requiresCalibration: quote.calibrationCost > 0,
        csrId: req.user!.id,
      },
    });

    await prisma.quote.update({
      where: { id: quote.id },
      data: { isConverted: true, convertedWorkOrderId: workOrder.id },
    });

    res.status(201).json({ success: true, data: workOrder });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to convert quote' });
  }
});
