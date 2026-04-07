import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPagination, paginatedResponse } from '../utils/pagination';

export const claimRouter = Router();
claimRouter.use(authenticate);

// GET /api/claims
claimRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { status, insuranceCompanyCode, search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (insuranceCompanyCode) where.insuranceCompanyCode = insuranceCompanyCode;
    if (search) {
      where.OR = [
        { claimNumber: { contains: search as string, mode: 'insensitive' } },
        { policyNumber: { contains: search as string, mode: 'insensitive' } },
        { insuranceCompanyName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workOrder: {
            select: {
              orderNumber: true,
              customer: { select: { firstName: true, lastName: true } },
              vehicle: { select: { year: true, make: true, model: true } },
            },
          },
        },
      }),
      prisma.insuranceClaim.count({ where }),
    ]);
    res.json(paginatedResponse(claims, total, page, limit));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch claims' });
  }
});

// GET /api/claims/:id
claimRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: req.params.id },
      include: {
        workOrder: { include: { customer: true, vehicle: true, shop: true } },
        ediMessages: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!claim) return res.status(404).json({ success: false, error: 'Claim not found' });
    res.json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch claim' });
  }
});

// POST /api/claims
claimRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.insuranceClaim.create({
      data: {
        ...req.body,
        dateOfLoss: new Date(req.body.dateOfLoss),
      },
    });
    res.status(201).json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create claim' });
  }
});

// PUT /api/claims/:id
claimRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const update: any = { ...req.body };
    if (update.dateOfLoss) update.dateOfLoss = new Date(update.dateOfLoss);

    const claim = await prisma.insuranceClaim.update({ where: { id: req.params.id }, data: update });
    res.json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update claim' });
  }
});

// PUT /api/claims/:id/status
claimRouter.put('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status, approvalNumber, approvedAmount } = req.body;
    const claim = await prisma.insuranceClaim.update({
      where: { id: req.params.id },
      data: { status, approvalNumber, approvedAmount },
    });
    res.json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update claim status' });
  }
});

// POST /api/claims/:id/edi/submit - Submit EDI claim (837)
claimRouter.post('/:id/edi/submit', async (req: AuthRequest, res: Response) => {
  try {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: req.params.id },
      include: { workOrder: { include: { customer: true, vehicle: true, shop: true } } },
    });
    if (!claim) return res.status(404).json({ success: false, error: 'Claim not found' });

    // Build EDI 837 transaction
    const edi837 = buildEDI837(claim);

    const message = await prisma.eDIMessage.create({
      data: {
        claimId: claim.id,
        transactionType: '837',
        direction: 'outbound',
        rawContent: edi837,
        status: 'sent',
      },
    });

    await prisma.insuranceClaim.update({
      where: { id: claim.id },
      data: {
        status: 'submitted',
        ediLastTransactionType: '837',
        ediLastTransactionDate: new Date(),
      },
    });

    res.json({ success: true, data: { claim, ediMessage: message } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to submit EDI claim' });
  }
});

// ─── EDI Builder ───
function buildEDI837(claim: any): string {
  const wo = claim.workOrder;
  const customer = wo.customer;
  const vehicle = wo.vehicle;
  const shop = wo.shop;
  const sep = '*';
  const term = '~';

  const segments = [
    `ISA${sep}00${sep}          ${sep}00${sep}          ${sep}ZZ${sep}AUTOGLASSPOD   ${sep}ZZ${sep}${claim.insuranceCompanyCode.padEnd(15)}${sep}${formatEDIDate(new Date())}${sep}${formatEDITime(new Date())}${sep}U${sep}00501${sep}000000001${sep}0${sep}P${sep}:`,
    `GS${sep}HC${sep}AUTOGLASSPOD${sep}${claim.insuranceCompanyCode}${sep}${formatEDIDate(new Date())}${sep}${formatEDITime(new Date())}${sep}1${sep}X${sep}005010X222A1`,
    `ST${sep}837${sep}0001`,
    `BHT${sep}0019${sep}00${sep}${claim.claimNumber}${sep}${formatEDIDate(new Date())}${sep}${formatEDITime(new Date())}${sep}CH`,
    `NM1${sep}41${sep}2${sep}${shop.name}${sep}${sep}${sep}${sep}${sep}46${sep}${shop.nagsId || ''}`,
    `NM1${sep}IL${sep}1${sep}${customer.lastName}${sep}${customer.firstName}`,
    `CLM${sep}${claim.claimNumber}${sep}${wo.totalAmount}${sep}${sep}${sep}11:B:1`,
    `DTP${sep}431${sep}D8${sep}${formatEDIDate(claim.dateOfLoss)}`,
    `REF${sep}D9${sep}${claim.claimNumber}`,
    `SV1${sep}HC:${wo.nagsPartNumber || 'GLASS'}${sep}${wo.totalAmount}${sep}UN${sep}1`,
    `SE${sep}10${sep}0001`,
    `GE${sep}1${sep}1`,
    `IEA${sep}1${sep}000000001`,
  ];

  return segments.map((s) => s + term).join('\n');
}

function formatEDIDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function formatEDITime(date: Date): string {
  return date.toISOString().slice(11, 16).replace(/:/g, '');
}
