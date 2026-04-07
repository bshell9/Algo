import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPagination, paginatedResponse } from '../utils/pagination';

export const nagsRouter = Router();
nagsRouter.use(authenticate);

// GET /api/nags/parts - Search NAGS catalog
nagsRouter.get('/parts', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search, make, model, year, position, partType } = req.query;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { nagsPartNumber: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }
    if (make) where.fitsMake = { equals: make as string };
    if (model) where.fitsModel = { equals: model as string };
    if (year) {
      const y = parseInt(year as string);
      where.fitsYearFrom = { lte: y };
      where.fitsYearTo = { gte: y };
    }
    if (position) where.glassPosition = position;
    if (partType) where.partType = partType;

    const [parts, total] = await Promise.all([
      prisma.nAGSPart.findMany({ where, skip, take: limit, orderBy: { nagsPartNumber: 'asc' } }),
      prisma.nAGSPart.count({ where }),
    ]);
    res.json(paginatedResponse(parts, total, page, limit));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to search NAGS parts' });
  }
});

// GET /api/nags/parts/:partNumber
nagsRouter.get('/parts/:partNumber', async (req: AuthRequest, res: Response) => {
  try {
    const part = await prisma.nAGSPart.findUnique({
      where: { nagsPartNumber: req.params.partNumber },
      include: {
        moldingKits: true,
        shopInventory: { include: { shop: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!part) return res.status(404).json({ success: false, error: 'Part not found' });
    res.json({ success: true, data: part });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch part' });
  }
});

// POST /api/nags/parts - Add to catalog
nagsRouter.post('/parts', async (req: AuthRequest, res: Response) => {
  try {
    const part = await prisma.nAGSPart.create({ data: req.body });
    res.status(201).json({ success: true, data: part });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create part' });
  }
});

// PUT /api/nags/parts/:id
nagsRouter.put('/parts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const part = await prisma.nAGSPart.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: part });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update part' });
  }
});

// GET /api/nags/lookup - Look up glass by vehicle (year/make/model)
nagsRouter.get('/lookup', async (req: AuthRequest, res: Response) => {
  try {
    const { year, make, model, position } = req.query;
    if (!year || !make || !model) {
      return res.status(400).json({ success: false, error: 'Year, make, and model required' });
    }

    const y = parseInt(year as string);
    const where: any = {
      fitsMake: { equals: make as string },
      fitsModel: { equals: model as string },
      fitsYearFrom: { lte: y },
      fitsYearTo: { gte: y },
      isActive: true,
    };
    if (position) where.glassPosition = position;

    const parts = await prisma.nAGSPart.findMany({
      where,
      orderBy: { partType: 'asc' },
      include: {
        moldingKits: true,
        shopInventory: {
          include: { shop: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    res.json({ success: true, data: parts });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to look up parts' });
  }
});

// GET /api/nags/makes - Get distinct makes
nagsRouter.get('/makes', async (_req: AuthRequest, res: Response) => {
  try {
    const makes = await prisma.nAGSPart.findMany({
      where: { isActive: true, fitsMake: { not: null } },
      select: { fitsMake: true },
      distinct: ['fitsMake'],
      orderBy: { fitsMake: 'asc' },
    });
    res.json({ success: true, data: makes.map((m) => m.fitsMake).filter(Boolean) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch makes' });
  }
});

// GET /api/nags/models/:make - Get models for a make
nagsRouter.get('/models/:make', async (req: AuthRequest, res: Response) => {
  try {
    const models = await prisma.nAGSPart.findMany({
      where: { isActive: true, fitsMake: { equals: req.params.make } },
      select: { fitsModel: true },
      distinct: ['fitsModel'],
      orderBy: { fitsModel: 'asc' },
    });
    res.json({ success: true, data: models.map((m) => m.fitsModel).filter(Boolean) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch models' });
  }
});
