import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

// GET /api/dashboard/stats
dashboardRouter.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId } = req.query;
    const shopFilter = shopId ? { shopId: shopId as string } : {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      todayJobs,
      pendingJobs,
      activePods,
      openClaims,
      overdueInvoices,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalJobsMonth,
      completedJobsMonth,
    ] = await Promise.all([
      prisma.workOrder.count({ where: { ...shopFilter, scheduledDate: { gte: today, lt: tomorrow } } }),
      prisma.workOrder.count({ where: { ...shopFilter, status: { in: ['pending', 'quote'] } } }),
      prisma.pod.count({ where: { status: { in: ['dispatched', 'en_route', 'on_site'] }, isActive: true } }),
      prisma.insuranceClaim.count({ where: { status: { in: ['submitted', 'acknowledged', 'in_review', 'pending_info'] } } }),
      prisma.invoice.count({ where: { ...shopFilter, status: 'overdue' } }),
      prisma.payment.aggregate({ where: { ...shopFilter, processedAt: { gte: today }, transactionType: 'sale', status: 'captured' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { ...shopFilter, processedAt: { gte: weekAgo }, transactionType: 'sale', status: 'captured' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { ...shopFilter, processedAt: { gte: monthAgo }, transactionType: 'sale', status: 'captured' }, _sum: { amount: true } }),
      prisma.workOrder.count({ where: { ...shopFilter, createdAt: { gte: monthAgo } } }),
      prisma.workOrder.count({ where: { ...shopFilter, status: { in: ['completed', 'invoiced', 'paid'] }, createdAt: { gte: monthAgo } } }),
    ]);

    const monthRevenue = monthlyRevenue._sum.amount || 0;
    const completionRate = totalJobsMonth > 0 ? Math.round((completedJobsMonth / totalJobsMonth) * 100) : 0;
    const avgJobValue = completedJobsMonth > 0 ? Math.round(monthRevenue / completedJobsMonth) : 0;

    res.json({
      success: true,
      data: {
        todayJobs,
        todayRevenue: todayRevenue._sum.amount || 0,
        pendingJobs,
        activePods,
        openClaims,
        overdueInvoices,
        weeklyRevenue: weeklyRevenue._sum.amount || 0,
        monthlyRevenue: monthRevenue,
        averageJobValue: avgJobValue,
        completionRate,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/dashboard/today-schedule
dashboardRouter.get('/today-schedule', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedule = await prisma.scheduleEntry.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        ...(shopId ? { shopId: shopId as string } : {}),
      },
      orderBy: { startTime: 'asc' },
      include: {
        workOrder: {
          include: {
            customer: { select: { firstName: true, lastName: true, phone: true } },
            vehicle: { select: { year: true, make: true, model: true } },
          },
        },
        pod: { select: { id: true, name: true, code: true, status: true } },
        technician: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch today schedule' });
  }
});

// GET /api/dashboard/pod-status
dashboardRouter.get('/pod-status', async (req: AuthRequest, res: Response) => {
  try {
    const pods = await prisma.pod.findMany({
      where: { isActive: true },
      include: {
        shop: { select: { name: true, code: true } },
        technicians: { select: { firstName: true, lastName: true } },
        workOrders: {
          where: { status: { in: ['dispatched', 'en_route', 'on_site', 'in_progress'] } },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            serviceAddress: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: pods });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch pod status' });
  }
});

// GET /api/dashboard/recent-activity
dashboardRouter.get('/recent-activity', async (req: AuthRequest, res: Response) => {
  try {
    const [recentOrders, recentPayments] = await Promise.all([
      prisma.workOrder.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, orderNumber: true, status: true, jobType: true, totalAmount: true, updatedAt: true,
          customer: { select: { firstName: true, lastName: true } },
          vehicle: { select: { year: true, make: true, model: true } },
        },
      }),
      prisma.payment.findMany({
        take: 10,
        orderBy: { processedAt: 'desc' },
        select: {
          id: true, receiptNumber: true, amount: true, paymentMethod: true, transactionType: true, processedAt: true,
          invoice: { select: { invoiceNumber: true } },
        },
      }),
    ]);
    res.json({ success: true, data: { recentOrders, recentPayments } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch recent activity' });
  }
});
