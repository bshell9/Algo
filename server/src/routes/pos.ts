import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateReceiptNumber } from '../utils/generators';

export const posRouter = Router();
posRouter.use(authenticate);

// ═══════════════════════════════════════════════
// POS SESSIONS (Cash Drawer)
// ═══════════════════════════════════════════════

// GET /api/pos/sessions - List sessions
posRouter.get('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, isOpen } = req.query;
    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (isOpen !== undefined) where.isOpen = isOpen === 'true';

    const sessions = await prisma.pOSSession.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        shop: { select: { id: true, name: true, code: true } },
        _count: { select: { payments: true } },
      },
    });
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch POS sessions' });
  }
});

// POST /api/pos/sessions/open - Open a new POS session
posRouter.post('/sessions/open', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, openingBalance } = req.body;

    // Check if user already has open session
    const existing = await prisma.pOSSession.findFirst({
      where: { userId: req.user!.id, isOpen: true },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You already have an open POS session' });
    }

    const session = await prisma.pOSSession.create({
      data: {
        shopId,
        userId: req.user!.id,
        openingBalance: openingBalance || 0,
      },
    });

    await prisma.cashDrawerAction.create({
      data: {
        sessionId: session.id,
        type: 'open',
        amount: openingBalance || 0,
        reason: 'Opening balance',
        performedById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to open POS session' });
  }
});

// POST /api/pos/sessions/:id/close - Close POS session
posRouter.post('/sessions/:id/close', async (req: AuthRequest, res: Response) => {
  try {
    const { closingBalance } = req.body;
    const session = await prisma.pOSSession.findUnique({
      where: { id: req.params.id },
      include: { payments: true },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    // Calculate session totals
    const cashSales = session.payments
      .filter((p) => p.paymentMethod === 'cash' && p.transactionType === 'sale')
      .reduce((sum, p) => sum + p.amount, 0);
    const cardSales = session.payments
      .filter((p) => ['credit_card', 'debit_card'].includes(p.paymentMethod) && p.transactionType === 'sale')
      .reduce((sum, p) => sum + p.amount, 0);
    const checkSales = session.payments
      .filter((p) => p.paymentMethod === 'check' && p.transactionType === 'sale')
      .reduce((sum, p) => sum + p.amount, 0);
    const insuranceSales = session.payments
      .filter((p) => ['insurance_direct', 'insurance_cod'].includes(p.paymentMethod) && p.transactionType === 'sale')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalRefunds = session.payments
      .filter((p) => p.transactionType === 'refund')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalSales = cashSales + cardSales + checkSales + insuranceSales;

    const updated = await prisma.pOSSession.update({
      where: { id: req.params.id },
      data: {
        closedAt: new Date(),
        closingBalance: closingBalance || 0,
        cashSales,
        cardSales,
        checkSales,
        insuranceSales,
        totalSales,
        totalRefunds,
        netSales: totalSales - totalRefunds,
        transactionCount: session.payments.length,
        isOpen: false,
      },
    });

    await prisma.cashDrawerAction.create({
      data: {
        sessionId: session.id,
        type: 'close',
        amount: closingBalance || 0,
        reason: 'Closing balance',
        performedById: req.user!.id,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to close POS session' });
  }
});

// ═══════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════

// POST /api/pos/payments - Process payment
posRouter.post('/payments', async (req: AuthRequest, res: Response) => {
  try {
    const {
      invoiceId, paymentMethod, amount, tipAmount = 0,
      cardLast4, cardBrand, checkNumber, notes,
    } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    // Find open POS session for user
    const session = await prisma.pOSSession.findFirst({
      where: { userId: req.user!.id, isOpen: true },
    });

    const processingFee = ['credit_card', 'debit_card'].includes(paymentMethod)
      ? Math.round(amount * 0.029 * 100) / 100
      : 0;

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        shopId: invoice.shopId,
        posSessionId: session?.id,
        transactionType: 'sale',
        paymentMethod,
        amount,
        tipAmount,
        processingFee,
        netAmount: amount - processingFee,
        status: 'captured',
        receiptNumber: generateReceiptNumber(),
        processedById: req.user!.id,
        cardLast4,
        cardBrand,
        checkNumber,
        notes,
      },
    });

    // Update invoice
    const newAmountPaid = invoice.amountPaid + amount;
    const newAmountDue = Math.max(0, invoice.total - newAmountPaid);
    const newStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        paidDate: newAmountDue <= 0 ? new Date() : null,
      },
    });

    // If fully paid, update work order status
    if (newAmountDue <= 0) {
      await prisma.workOrder.update({
        where: { id: invoice.workOrderId },
        data: { status: 'paid' },
      });
    }

    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to process payment' });
  }
});

// POST /api/pos/payments/split - Split payment (multiple methods)
posRouter.post('/payments/split', async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId, payments: paymentsList } = req.body;
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const session = await prisma.pOSSession.findFirst({
      where: { userId: req.user!.id, isOpen: true },
    });

    const createdPayments = [];
    let totalPaid = 0;

    for (const p of paymentsList) {
      const processingFee = ['credit_card', 'debit_card'].includes(p.paymentMethod)
        ? Math.round(p.amount * 0.029 * 100) / 100
        : 0;

      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          shopId: invoice.shopId,
          posSessionId: session?.id,
          transactionType: 'sale',
          paymentMethod: p.paymentMethod,
          amount: p.amount,
          tipAmount: p.tipAmount || 0,
          processingFee,
          netAmount: p.amount - processingFee,
          status: 'captured',
          receiptNumber: generateReceiptNumber(),
          processedById: req.user!.id,
          cardLast4: p.cardLast4,
          cardBrand: p.cardBrand,
          checkNumber: p.checkNumber,
          notes: `Split payment`,
        },
      });
      createdPayments.push(payment);
      totalPaid += p.amount;
    }

    const newAmountPaid = invoice.amountPaid + totalPaid;
    const newAmountDue = Math.max(0, invoice.total - newAmountPaid);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newAmountDue <= 0 ? 'paid' : 'partially_paid',
        paidDate: newAmountDue <= 0 ? new Date() : null,
      },
    });

    if (newAmountDue <= 0) {
      await prisma.workOrder.update({ where: { id: invoice.workOrderId }, data: { status: 'paid' } });
    }

    res.status(201).json({ success: true, data: createdPayments });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process split payment' });
  }
});

// POST /api/pos/payments/:id/void
posRouter.post('/payments/:id/void', async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    const voided = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'voided', voidedAt: new Date(), voidedBy: req.user!.id },
    });

    // Reverse invoice amount
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        amountPaid: { decrement: payment.amount },
        amountDue: { increment: payment.amount },
        status: 'sent',
        paidDate: null,
      },
    });

    res.json({ success: true, data: voided });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to void payment' });
  }
});

// POST /api/pos/payments/:id/refund
posRouter.post('/payments/:id/refund', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, reason } = req.body;
    const original = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ success: false, error: 'Payment not found' });

    const refundAmount = amount || original.amount;

    const refund = await prisma.payment.create({
      data: {
        invoiceId: original.invoiceId,
        shopId: original.shopId,
        posSessionId: original.posSessionId,
        transactionType: 'refund',
        paymentMethod: original.paymentMethod,
        amount: refundAmount,
        tipAmount: 0,
        processingFee: 0,
        netAmount: -refundAmount,
        status: 'captured',
        receiptNumber: generateReceiptNumber(),
        processedById: req.user!.id,
        refundReason: reason,
        notes: `Refund for ${original.receiptNumber}`,
      },
    });

    await prisma.invoice.update({
      where: { id: original.invoiceId },
      data: {
        amountPaid: { decrement: refundAmount },
        amountDue: { increment: refundAmount },
        status: refundAmount >= original.amount ? 'void' : 'partially_paid',
      },
    });

    res.status(201).json({ success: true, data: refund });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process refund' });
  }
});

// ═══════════════════════════════════════════════
// CASH DRAWER OPERATIONS
// ═══════════════════════════════════════════════

// POST /api/pos/cash-drawer/drop
posRouter.post('/cash-drawer/drop', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, amount, reason } = req.body;
    const action = await prisma.cashDrawerAction.create({
      data: { sessionId, type: 'drop', amount, reason, performedById: req.user!.id },
    });
    res.status(201).json({ success: true, data: action });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record cash drop' });
  }
});

// POST /api/pos/cash-drawer/paid-in
posRouter.post('/cash-drawer/paid-in', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, amount, reason } = req.body;
    const action = await prisma.cashDrawerAction.create({
      data: { sessionId, type: 'paid_in', amount, reason, performedById: req.user!.id },
    });
    res.status(201).json({ success: true, data: action });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record paid in' });
  }
});

// POST /api/pos/cash-drawer/paid-out
posRouter.post('/cash-drawer/paid-out', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, amount, reason } = req.body;
    const action = await prisma.cashDrawerAction.create({
      data: { sessionId, type: 'paid_out', amount, reason, performedById: req.user!.id },
    });
    res.status(201).json({ success: true, data: action });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record paid out' });
  }
});

// GET /api/pos/sessions/:id/receipt-summary
posRouter.get('/sessions/:id/receipt-summary', async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.pOSSession.findUnique({
      where: { id: req.params.id },
      include: {
        payments: { include: { invoice: { select: { invoiceNumber: true, workOrder: { select: { orderNumber: true } } } } } },
        cashDrawerActions: true,
        user: { select: { firstName: true, lastName: true } },
        shop: true,
      },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch session summary' });
  }
});
