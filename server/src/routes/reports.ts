import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const reportRouter = Router();
reportRouter.use(authenticate);

// GET /api/reports/revenue - Revenue report by period
reportRouter.get('/revenue', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();

    const where: any = { processedAt: { gte: start, lte: end }, transactionType: 'sale', status: 'captured' };
    if (shopId) where.shopId = shopId;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: { workOrder: { select: { jobType: true, isInsuranceJob: true } } },
        },
      },
      orderBy: { processedAt: 'asc' },
    });

    // Group by period
    const grouped: Record<string, any> = {};
    for (const p of payments) {
      let key: string;
      const d = new Date(p.processedAt);
      if (groupBy === 'month') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      else if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = d.toISOString().slice(0, 10);
      }

      if (!grouped[key]) {
        grouped[key] = { period: key, totalRevenue: 0, insuranceRevenue: 0, cashRevenue: 0, laborRevenue: 0, jobCount: 0 };
      }
      grouped[key].totalRevenue += p.amount;
      const isInsurance = p.invoice?.workOrder?.isInsuranceJob;
      if (isInsurance) grouped[key].insuranceRevenue += p.amount;
      else grouped[key].cashRevenue += p.amount;
      grouped[key].jobCount++;
    }

    const data = Object.values(grouped).map((g: any) => ({
      ...g,
      averageTicket: g.jobCount > 0 ? Math.round(g.totalRevenue / g.jobCount) : 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate revenue report' });
  }
});

// GET /api/reports/technician-performance
reportRouter.get('/technician-performance', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();

    const technicians = await prisma.user.findMany({
      where: { role: 'technician', isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        workOrdersTech: {
          where: { completedAt: { gte: start, lte: end } },
          select: { id: true, totalAmount: true, startedAt: true, completedAt: true },
        },
      },
    });

    const data = technicians.map((tech) => {
      const jobs = tech.workOrdersTech;
      const totalRevenue = jobs.reduce((sum, j) => sum + j.totalAmount, 0);
      const jobTimes = jobs
        .filter((j) => j.startedAt && j.completedAt)
        .map((j) => (new Date(j.completedAt!).getTime() - new Date(j.startedAt!).getTime()) / 60000);
      const avgTime = jobTimes.length > 0 ? Math.round(jobTimes.reduce((a, b) => a + b, 0) / jobTimes.length) : 0;

      return {
        technicianId: tech.id,
        technicianName: `${tech.firstName} ${tech.lastName}`,
        jobsCompleted: jobs.length,
        totalRevenue,
        averageJobTime: avgTime,
      };
    });

    res.json({ success: true, data: data.sort((a, b) => b.jobsCompleted - a.jobsCompleted) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate tech performance report' });
  }
});

// GET /api/reports/inventory-value - Total inventory value across shops
reportRouter.get('/inventory-value', async (req: AuthRequest, res: Response) => {
  try {
    const shopInventory = await prisma.shopInventory.findMany({
      include: {
        nagsPart: { select: { nagsPartNumber: true, description: true } },
        shop: { select: { id: true, name: true, code: true } },
      },
    });

    const byShop: Record<string, { shop: string; code: string; totalValue: number; totalParts: number; itemCount: number }> = {};
    let grandTotal = 0;

    for (const item of shopInventory) {
      const value = item.quantity * item.cost;
      grandTotal += value;
      const key = item.shop.id;
      if (!byShop[key]) byShop[key] = { shop: item.shop.name, code: item.shop.code, totalValue: 0, totalParts: 0, itemCount: 0 };
      byShop[key].totalValue += value;
      byShop[key].totalParts += item.quantity;
      byShop[key].itemCount++;
    }

    res.json({ success: true, data: { grandTotal, byShop: Object.values(byShop) } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate inventory report' });
  }
});

// GET /api/reports/jobs-by-type
reportRouter.get('/jobs-by-type', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, shopId } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();

    const where: any = { createdAt: { gte: start, lte: end } };
    if (shopId) where.shopId = shopId;

    const orders = await prisma.workOrder.groupBy({
      by: ['jobType'],
      where,
      _count: true,
      _sum: { totalAmount: true },
    });

    res.json({
      success: true,
      data: orders.map((o) => ({ jobType: o.jobType, count: o._count, revenue: o._sum.totalAmount || 0 })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate jobs report' });
  }
});

// GET /api/reports/insurance-summary
reportRouter.get('/insurance-summary', async (req: AuthRequest, res: Response) => {
  try {
    const claims = await prisma.insuranceClaim.groupBy({
      by: ['insuranceCompanyCode', 'insuranceCompanyName'],
      _count: true,
      _sum: { approvedAmount: true, deductible: true },
    });

    res.json({
      success: true,
      data: claims.map((c) => ({
        company: c.insuranceCompanyName,
        code: c.insuranceCompanyCode,
        claimCount: c._count,
        totalApproved: c._sum.approvedAmount || 0,
        totalDeductibles: c._sum.deductible || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate insurance report' });
  }
});

// GET /api/reports/pos-summary - POS daily summary
reportRouter.get('/pos-summary', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where: any = { processedAt: { gte: targetDate, lt: nextDay } };
    if (shopId) where.shopId = shopId;

    const payments = await prisma.payment.findMany({ where });

    const summary = {
      date: targetDate.toISOString().slice(0, 10),
      totalTransactions: payments.length,
      sales: payments.filter((p) => p.transactionType === 'sale'),
      refunds: payments.filter((p) => p.transactionType === 'refund'),
      voids: payments.filter((p) => p.status === 'voided'),
      byMethod: {} as Record<string, { count: number; total: number }>,
      totalSales: 0,
      totalRefunds: 0,
      netRevenue: 0,
    };

    for (const p of payments) {
      if (!summary.byMethod[p.paymentMethod]) summary.byMethod[p.paymentMethod] = { count: 0, total: 0 };
      summary.byMethod[p.paymentMethod].count++;
      summary.byMethod[p.paymentMethod].total += p.amount;

      if (p.transactionType === 'sale') summary.totalSales += p.amount;
      if (p.transactionType === 'refund') summary.totalRefunds += p.amount;
    }
    summary.netRevenue = summary.totalSales - summary.totalRefunds;

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate POS summary' });
  }
});
