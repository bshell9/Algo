import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getPagination, paginatedResponse } from '../utils/pagination';
import { generateTransferNumber, generatePONumber } from '../utils/generators';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

// ═══════════════════════════════════════════════
// SHOP INVENTORY (per location)
// ═══════════════════════════════════════════════

// GET /api/inventory - Inventory for a shop
inventoryRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { shopId, status, search, lowStock } = req.query;

    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;
    if (lowStock === 'true') {
      where.quantity = { lte: prisma.shopInventory.fields.reorderPoint };
    }
    if (search) {
      where.nagsPart = {
        OR: [
          { nagsPartNumber: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { fitsMake: { contains: search as string, mode: 'insensitive' } },
          { fitsModel: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      prisma.shopInventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          nagsPart: true,
          shop: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.shopInventory.count({ where }),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/all-shops/:nagsPartNumber - Stock across all 4 shops
inventoryRouter.get('/all-shops/:nagsPartNumber', async (req: AuthRequest, res: Response) => {
  try {
    const nagsPart = await prisma.nAGSPart.findUnique({
      where: { nagsPartNumber: req.params.nagsPartNumber },
    });
    if (!nagsPart) return res.status(404).json({ success: false, error: 'Part not found' });

    const inventory = await prisma.shopInventory.findMany({
      where: { nagsPartId: nagsPart.id },
      include: { shop: { select: { id: true, name: true, code: true, city: true } } },
    });

    const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
    res.json({ success: true, data: { part: nagsPart, inventory, totalStock } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch multi-shop inventory' });
  }
});

// POST /api/inventory - Add part to shop inventory
inventoryRouter.post('/', authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.shopInventory.create({
      data: req.body,
      include: { nagsPart: true, shop: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add inventory item' });
  }
});

// PUT /api/inventory/:id
inventoryRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.shopInventory.update({
      where: { id: req.params.id },
      data: req.body,
      include: { nagsPart: true },
    });

    // Auto-update status based on quantity
    let status = 'in_stock';
    if (item.quantity <= 0) status = 'out_of_stock';
    else if (item.quantity <= item.reorderPoint) status = 'low_stock';

    if (status !== item.status) {
      await prisma.shopInventory.update({ where: { id: item.id }, data: { status } });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update inventory' });
  }
});

// PUT /api/inventory/:id/adjust - Adjust quantity (count, receive, use)
inventoryRouter.put('/:id/adjust', async (req: AuthRequest, res: Response) => {
  try {
    const { adjustment, reason } = req.body; // adjustment can be positive or negative
    const item = await prisma.shopInventory.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

    const newQuantity = Math.max(0, item.quantity + adjustment);
    let status = 'in_stock';
    if (newQuantity <= 0) status = 'out_of_stock';
    else if (newQuantity <= item.reorderPoint) status = 'low_stock';

    const updated = await prisma.shopInventory.update({
      where: { id: req.params.id },
      data: { quantity: newQuantity, status, lastCountedAt: reason === 'count' ? new Date() : undefined },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to adjust inventory' });
  }
});

// GET /api/inventory/low-stock - Low stock alerts across all shops
inventoryRouter.get('/low-stock/alerts', async (_req: AuthRequest, res: Response) => {
  try {
    const lowStockItems = await prisma.$queryRaw`
      SELECT si.*, np."nagsPartNumber", np.description, s.name as "shopName", s.code as "shopCode"
      FROM "ShopInventory" si
      JOIN "NAGSPart" np ON si."nagsPartId" = np.id
      JOIN "Shop" s ON si."shopId" = s.id
      WHERE si.quantity <= si."reorderPoint"
      ORDER BY si.quantity ASC
    `;
    res.json({ success: true, data: lowStockItems });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch low stock alerts' });
  }
});

// ═══════════════════════════════════════════════
// INVENTORY TRANSFERS (between shops)
// ═══════════════════════════════════════════════

// GET /api/inventory/transfers
inventoryRouter.get('/transfers', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, status } = req.query;
    const where: any = {};
    if (shopId) where.OR = [{ fromShopId: shopId }, { toShopId: shopId }];
    if (status) where.status = status;

    const transfers = await prisma.inventoryTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        fromShop: { select: { id: true, name: true, code: true } },
        toShop: { select: { id: true, name: true, code: true } },
      },
    });
    res.json({ success: true, data: transfers });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch transfers' });
  }
});

// POST /api/inventory/transfers - Create transfer between shops
inventoryRouter.post('/transfers', async (req: AuthRequest, res: Response) => {
  try {
    const transfer = await prisma.inventoryTransfer.create({
      data: {
        ...req.body,
        transferNumber: generateTransferNumber(),
        requestedBy: req.user!.id,
      },
      include: {
        fromShop: { select: { name: true, code: true } },
        toShop: { select: { name: true, code: true } },
      },
    });
    res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create transfer' });
  }
});

// PUT /api/inventory/transfers/:id/ship
inventoryRouter.put('/transfers/:id/ship', async (req: AuthRequest, res: Response) => {
  try {
    const transfer = await prisma.inventoryTransfer.update({
      where: { id: req.params.id },
      data: { status: 'in_transit', shippedAt: new Date(), approvedBy: req.user!.id },
    });

    // Deduct from source shop
    const nagsPart = await prisma.nAGSPart.findUnique({ where: { nagsPartNumber: transfer.nagsPartNumber } });
    if (nagsPart) {
      await prisma.shopInventory.updateMany({
        where: { shopId: transfer.fromShopId, nagsPartId: nagsPart.id },
        data: { quantity: { decrement: transfer.quantity } },
      });
    }

    res.json({ success: true, data: transfer });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to ship transfer' });
  }
});

// PUT /api/inventory/transfers/:id/receive
inventoryRouter.put('/transfers/:id/receive', async (req: AuthRequest, res: Response) => {
  try {
    const transfer = await prisma.inventoryTransfer.update({
      where: { id: req.params.id },
      data: { status: 'received', receivedAt: new Date() },
    });

    // Add to destination shop
    const nagsPart = await prisma.nAGSPart.findUnique({ where: { nagsPartNumber: transfer.nagsPartNumber } });
    if (nagsPart) {
      await prisma.shopInventory.upsert({
        where: { shopId_nagsPartId: { shopId: transfer.toShopId, nagsPartId: nagsPart.id } },
        update: { quantity: { increment: transfer.quantity } },
        create: { shopId: transfer.toShopId, nagsPartId: nagsPart.id, quantity: transfer.quantity, cost: 0, retailPrice: 0 },
      });
    }

    res.json({ success: true, data: transfer });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to receive transfer' });
  }
});

// ═══════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════

// GET /api/inventory/purchase-orders
inventoryRouter.get('/purchase-orders', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, status } = req.query;
    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: { select: { id: true, name: true, code: true } },
        lineItems: true,
      },
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch purchase orders' });
  }
});

// POST /api/inventory/purchase-orders
inventoryRouter.post('/purchase-orders', async (req: AuthRequest, res: Response) => {
  try {
    const { shopId, vendor, lineItems, notes } = req.body;
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + item.total, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: generatePONumber(),
        shopId,
        vendor,
        subtotal,
        totalAmount: subtotal,
        notes,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    });
    res.status(201).json({ success: true, data: po });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create purchase order' });
  }
});

// PUT /api/inventory/purchase-orders/:id/receive - Receive PO and update inventory
inventoryRouter.put('/purchase-orders/:id/receive', async (req: AuthRequest, res: Response) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { lineItems: true },
    });
    if (!po) return res.status(404).json({ success: false, error: 'PO not found' });

    // Update inventory for each line item
    for (const item of po.lineItems) {
      const nagsPart = await prisma.nAGSPart.findUnique({ where: { nagsPartNumber: item.nagsPartNumber } });
      if (nagsPart) {
        await prisma.shopInventory.upsert({
          where: { shopId_nagsPartId: { shopId: po.shopId, nagsPartId: nagsPart.id } },
          update: {
            quantity: { increment: item.quantity },
            cost: item.unitCost,
            lastOrderedAt: new Date(),
            status: 'in_stock',
          },
          create: {
            shopId: po.shopId,
            nagsPartId: nagsPart.id,
            quantity: item.quantity,
            cost: item.unitCost,
            retailPrice: item.unitCost * 1.45,
            lastOrderedAt: new Date(),
          },
        });
      }
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'received', receivedAt: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to receive purchase order' });
  }
});
