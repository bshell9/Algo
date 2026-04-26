import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getPagination, paginatedResponse } from '../utils/pagination';

export const referralRouter = Router();

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
const optStr = z.preprocess(trim, z.string().max(200).optional().nullable());
const reqStr = z.preprocess(trim, z.string().min(1).max(200));

const referralSchema = z.object({
  agentName: reqStr,
  agentEmail: z.preprocess(trim, z.string().email().max(200)),
  agentPhone: optStr,
  agencyName: optStr,
  agentCity: optStr,
  customerName: reqStr,
  customerPhone: z.preprocess(trim, z.string().min(7).max(40)),
  customerEmail: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : trim(v)),
    z.string().email().max(200).optional().nullable(),
  ),
  customerCity: optStr,
  customerZip: optStr,
  vehicleYear: optStr,
  vehicleMake: optStr,
  vehicleModel: optStr,
  damage: optStr,
  carrier: optStr,
  claimNumber: optStr,
  notes: z.preprocess(trim, z.string().max(2000).optional().nullable()),
  // honeypot — bots fill hidden fields; real humans never touch this.
  // Accept any value so we can silently swallow bot submissions in the handler.
  website: z.string().max(500).optional(),
});

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submissions, please try again shortly.' },
});

// ─── PUBLIC: submit referral ───
referralRouter.post(
  '/',
  submitLimiter,
  validate(referralSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof referralSchema>;
      if (body.website) {
        // honeypot triggered — silently accept without storing
        return res.status(201).json({ success: true, data: { id: 'ok' } });
      }

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || null;

      const referral = await prisma.agentReferral.create({
        data: {
          agentName: body.agentName,
          agentEmail: body.agentEmail.toLowerCase(),
          agentPhone: body.agentPhone || null,
          agencyName: body.agencyName || null,
          agentCity: body.agentCity || null,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          customerEmail: body.customerEmail || null,
          customerCity: body.customerCity || null,
          customerZip: body.customerZip || null,
          vehicleYear: body.vehicleYear || null,
          vehicleMake: body.vehicleMake || null,
          vehicleModel: body.vehicleModel || null,
          damage: body.damage || null,
          carrier: body.carrier || null,
          claimNumber: body.claimNumber || null,
          notes: body.notes || null,
          ipAddress: ip,
          userAgent: (req.headers['user-agent'] as string) || null,
        },
      });

      // Internal notification: notify all dispatchers/managers/admins
      try {
        const recipients = await prisma.user.findMany({
          where: { role: { in: ['admin', 'manager', 'dispatcher', 'csr'] }, isActive: true },
          select: { id: true },
        });
        if (recipients.length > 0) {
          await prisma.notification.createMany({
            data: recipients.map((u) => ({
              userId: u.id,
              type: 'agent_referral',
              title: `New agent referral from ${body.agentName}`,
              message: `${body.customerName} • ${body.customerPhone}${body.carrier ? ` • ${body.carrier}` : ''}`,
              actionUrl: `/referrals/${referral.id}`,
              metadata: JSON.stringify({ referralId: referral.id }),
            })),
          });
        }
      } catch {
        // Notification failure must not break the referral submission.
      }

      // Return only what the public client needs.
      return res.status(201).json({
        success: true,
        data: {
          id: referral.id,
          receivedAt: referral.receivedAt,
          agentEmail: referral.agentEmail,
          customerName: referral.customerName,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to submit referral' });
    }
  },
);

// ─── INTERNAL (auth required) below ───
referralRouter.use(authenticate);

referralRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { agentName: { contains: search } },
        { agentEmail: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { carrier: { contains: search } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.agentReferral.findMany({ where, skip, take: limit, orderBy: { receivedAt: 'desc' } }),
      prisma.agentReferral.count({ where }),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch referrals' });
  }
});

referralRouter.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total, last30, byStatus, topAgents] = await Promise.all([
      prisma.agentReferral.count(),
      prisma.agentReferral.count({ where: { receivedAt: { gte: since } } }),
      prisma.agentReferral.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.agentReferral.groupBy({
        by: ['agentEmail', 'agentName'],
        _count: { _all: true },
        orderBy: { _count: { agentEmail: 'desc' } },
        take: 10,
      }),
    ]);
    res.json({
      success: true,
      data: {
        total,
        last30,
        byStatus: byStatus.map((b) => ({ status: b.status, count: b._count._all })),
        topAgents: topAgents.map((a) => ({
          agentName: a.agentName,
          agentEmail: a.agentEmail,
          count: a._count._all,
        })),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

referralRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const referral = await prisma.agentReferral.findUnique({ where: { id: req.params.id } });
    if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
    res.json({ success: true, data: referral });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch referral' });
  }
});

const updateSchema = z.object({
  status: z.enum(['new', 'contacted', 'scheduled', 'completed', 'declined']).optional(),
  firstContactAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  workOrderId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

referralRouter.patch('/:id', validate(updateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as z.infer<typeof updateSchema>;
    const data: any = { ...body };
    // Auto-stamp firstContactAt the first time status moves off "new".
    if (body.status && body.status !== 'new') {
      const existing = await prisma.agentReferral.findUnique({
        where: { id: req.params.id },
        select: { firstContactAt: true },
      });
      if (existing && !existing.firstContactAt && !body.firstContactAt) {
        data.firstContactAt = new Date();
      }
    }
    const referral = await prisma.agentReferral.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: referral });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update referral' });
  }
});
