-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'csr',
    "phone" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "shopId" TEXT,
    "podId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fein" TEXT,
    "nagsId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "laborRate" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'walk_in',
    "isFleet" BOOLEAN NOT NULL DEFAULT false,
    "fleetName" TEXT,
    "notes" TEXT,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vin" TEXT,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "subModel" TEXT,
    "bodyStyle" TEXT,
    "color" TEXT,
    "plateNumber" TEXT,
    "plateState" TEXT,
    "nagsVehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "podId" TEXT,
    "technicianId" TEXT,
    "csrId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "jobType" TEXT NOT NULL DEFAULT 'replacement',
    "glassPosition" TEXT NOT NULL DEFAULT 'windshield',
    "scheduledDate" TIMESTAMP(3),
    "scheduledSlot" TEXT,
    "scheduledTime" TEXT,
    "serviceLocation" TEXT NOT NULL DEFAULT 'shop',
    "serviceAddress" TEXT,
    "serviceCity" TEXT,
    "serviceState" TEXT,
    "serviceZip" TEXT,
    "nagsPartNumber" TEXT,
    "partDescription" TEXT,
    "partType" TEXT NOT NULL DEFAULT 'aftermarket',
    "glassVendor" TEXT,
    "retailPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moldingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isInsuranceJob" BOOLEAN NOT NULL DEFAULT false,
    "insuranceCompanyCode" TEXT,
    "claimNumber" TEXT,
    "policyNumber" TEXT,
    "deductible" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurancePays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerPays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresCalibration" BOOLEAN NOT NULL DEFAULT false,
    "calibrationType" TEXT,
    "calibrationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "csrNotes" TEXT,
    "techNotes" TEXT,
    "dispatchNotes" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderLineItem" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "nagsPartNumber" TEXT,
    "partType" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'glass',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "vehiclePlate" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "shopId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationUpdate" TIMESTAMP(3),
    "maxJobsPerDay" INTEGER NOT NULL DEFAULT 6,
    "serviceRadius" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NAGSPart" (
    "id" TEXT NOT NULL,
    "nagsPartNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "partType" TEXT NOT NULL DEFAULT 'aftermarket',
    "glassPosition" TEXT,
    "fitsYearFrom" INTEGER,
    "fitsYearTo" INTEGER,
    "fitsMake" TEXT,
    "fitsModel" TEXT,
    "fitsSubModel" TEXT,
    "fitsBodyStyle" TEXT,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "thickness" DOUBLE PRECISION,
    "tinted" BOOLEAN NOT NULL DEFAULT false,
    "heated" BOOLEAN NOT NULL DEFAULT false,
    "antenna" BOOLEAN NOT NULL DEFAULT false,
    "sensor" BOOLEAN NOT NULL DEFAULT false,
    "adasCompatible" BOOLEAN NOT NULL DEFAULT false,
    "encapsulated" BOOLEAN NOT NULL DEFAULT false,
    "vendor" TEXT,
    "vendorPartNumber" TEXT,
    "listPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NAGSPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopInventory" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "nagsPartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 10,
    "reorderPoint" INTEGER NOT NULL DEFAULT 2,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retailPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "binLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_stock',
    "lastCountedAt" TIMESTAMP(3),
    "lastOrderedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodInventory" (
    "id" TEXT NOT NULL,
    "podId" TEXT NOT NULL,
    "nagsPartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "loadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoldingKit" (
    "id" TEXT NOT NULL,
    "nagsPartId" TEXT NOT NULL,
    "moldingPartNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retailPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoldingKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromShopId" TEXT NOT NULL,
    "toShopId" TEXT NOT NULL,
    "nagsPartNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderedAt" TIMESTAMP(3),
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "nagsPartNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "podId" TEXT,
    "technicianId" TEXT,
    "shopId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'morning',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "estimatedDuration" INTEGER NOT NULL DEFAULT 90,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "insuranceCompanyCode" TEXT NOT NULL,
    "insuranceCompanyName" TEXT NOT NULL,
    "adjusterName" TEXT,
    "adjusterPhone" TEXT,
    "adjusterEmail" TEXT,
    "dateOfLoss" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvalNumber" TEXT,
    "approvedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductible" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerResponsibility" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ediReferralId" TEXT,
    "ediLastTransactionType" TEXT,
    "ediLastTransactionDate" TIMESTAMP(3),
    "deductibleWaiver" BOOLEAN NOT NULL DEFAULT false,
    "waiverAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EDIMessage" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "parsedData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EDIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "posSessionId" TEXT,
    "transactionType" TEXT NOT NULL DEFAULT 'sale',
    "paymentMethod" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "tipAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referenceNumber" TEXT,
    "authorizationCode" TEXT,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "checkNumber" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "processedById" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "refundReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBalance" DOUBLE PRECISION,
    "cashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cardSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "checkSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRefunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POSSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrawerAction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashDrawerAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "shopId" TEXT NOT NULL,
    "vehicleYear" INTEGER NOT NULL,
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehicleSubModel" TEXT,
    "vin" TEXT,
    "glassPosition" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'replacement',
    "nagsPartNumber" TEXT,
    "partDescription" TEXT,
    "partType" TEXT NOT NULL DEFAULT 'aftermarket',
    "partCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moldingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calibrationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isInsuranceJob" BOOLEAN NOT NULL DEFAULT false,
    "insuranceCompanyCode" TEXT,
    "deductible" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerPays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurancePays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "convertedWorkOrderId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_shopId_idx" ON "User"("shopId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_code_key" ON "Shop"("code");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_lastName_idx" ON "Customer"("lastName");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_company_idx" ON "Customer"("company");

-- CreateIndex
CREATE INDEX "Vehicle_customerId_idx" ON "Vehicle"("customerId");

-- CreateIndex
CREATE INDEX "Vehicle_vin_idx" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_year_make_model_idx" ON "Vehicle"("year", "make", "model");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_orderNumber_key" ON "WorkOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "WorkOrder_shopId_idx" ON "WorkOrder"("shopId");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_scheduledDate_idx" ON "WorkOrder"("scheduledDate");

-- CreateIndex
CREATE INDEX "WorkOrder_orderNumber_idx" ON "WorkOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "WorkOrder_podId_idx" ON "WorkOrder"("podId");

-- CreateIndex
CREATE INDEX "WorkOrder_technicianId_idx" ON "WorkOrder"("technicianId");

-- CreateIndex
CREATE INDEX "WorkOrderLineItem_workOrderId_idx" ON "WorkOrderLineItem"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Pod_code_key" ON "Pod"("code");

-- CreateIndex
CREATE INDEX "Pod_shopId_idx" ON "Pod"("shopId");

-- CreateIndex
CREATE INDEX "Pod_status_idx" ON "Pod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NAGSPart_nagsPartNumber_key" ON "NAGSPart"("nagsPartNumber");

-- CreateIndex
CREATE INDEX "NAGSPart_nagsPartNumber_idx" ON "NAGSPart"("nagsPartNumber");

-- CreateIndex
CREATE INDEX "NAGSPart_fitsMake_fitsModel_idx" ON "NAGSPart"("fitsMake", "fitsModel");

-- CreateIndex
CREATE INDEX "NAGSPart_fitsYearFrom_fitsYearTo_idx" ON "NAGSPart"("fitsYearFrom", "fitsYearTo");

-- CreateIndex
CREATE INDEX "NAGSPart_glassPosition_idx" ON "NAGSPart"("glassPosition");

-- CreateIndex
CREATE INDEX "ShopInventory_shopId_idx" ON "ShopInventory"("shopId");

-- CreateIndex
CREATE INDEX "ShopInventory_nagsPartId_idx" ON "ShopInventory"("nagsPartId");

-- CreateIndex
CREATE INDEX "ShopInventory_status_idx" ON "ShopInventory"("status");

-- CreateIndex
CREATE INDEX "ShopInventory_quantity_idx" ON "ShopInventory"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "ShopInventory_shopId_nagsPartId_key" ON "ShopInventory"("shopId", "nagsPartId");

-- CreateIndex
CREATE INDEX "PodInventory_podId_idx" ON "PodInventory"("podId");

-- CreateIndex
CREATE UNIQUE INDEX "PodInventory_podId_nagsPartId_key" ON "PodInventory"("podId", "nagsPartId");

-- CreateIndex
CREATE INDEX "MoldingKit_nagsPartId_idx" ON "MoldingKit"("nagsPartId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_transferNumber_key" ON "InventoryTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "InventoryTransfer_fromShopId_idx" ON "InventoryTransfer"("fromShopId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_toShopId_idx" ON "InventoryTransfer"("toShopId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_status_idx" ON "InventoryTransfer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_shopId_idx" ON "PurchaseOrder"("shopId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendor_idx" ON "PurchaseOrder"("vendor");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_workOrderId_key" ON "ScheduleEntry"("workOrderId");

-- CreateIndex
CREATE INDEX "ScheduleEntry_date_idx" ON "ScheduleEntry"("date");

-- CreateIndex
CREATE INDEX "ScheduleEntry_podId_date_idx" ON "ScheduleEntry"("podId", "date");

-- CreateIndex
CREATE INDEX "ScheduleEntry_technicianId_date_idx" ON "ScheduleEntry"("technicianId", "date");

-- CreateIndex
CREATE INDEX "ScheduleEntry_shopId_date_idx" ON "ScheduleEntry"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_workOrderId_key" ON "InsuranceClaim"("workOrderId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_claimNumber_idx" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "InsuranceClaim_insuranceCompanyCode_idx" ON "InsuranceClaim"("insuranceCompanyCode");

-- CreateIndex
CREATE INDEX "InsuranceClaim_status_idx" ON "InsuranceClaim"("status");

-- CreateIndex
CREATE INDEX "EDIMessage_claimId_idx" ON "EDIMessage"("claimId");

-- CreateIndex
CREATE INDEX "EDIMessage_transactionType_idx" ON "EDIMessage"("transactionType");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_workOrderId_key" ON "Invoice"("workOrderId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_idx" ON "Invoice"("shopId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_receiptNumber_idx" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_posSessionId_idx" ON "Payment"("posSessionId");

-- CreateIndex
CREATE INDEX "Payment_paymentMethod_idx" ON "Payment"("paymentMethod");

-- CreateIndex
CREATE INDEX "Payment_processedAt_idx" ON "Payment"("processedAt");

-- CreateIndex
CREATE INDEX "POSSession_shopId_idx" ON "POSSession"("shopId");

-- CreateIndex
CREATE INDEX "POSSession_isOpen_idx" ON "POSSession"("isOpen");

-- CreateIndex
CREATE INDEX "CashDrawerAction_sessionId_idx" ON "CashDrawerAction"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_shopId_idx" ON "Quote"("shopId");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_quoteNumber_idx" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_csrId_fkey" FOREIGN KEY ("csrId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLineItem" ADD CONSTRAINT "WorkOrderLineItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInventory" ADD CONSTRAINT "ShopInventory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInventory" ADD CONSTRAINT "ShopInventory_nagsPartId_fkey" FOREIGN KEY ("nagsPartId") REFERENCES "NAGSPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodInventory" ADD CONSTRAINT "PodInventory_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodInventory" ADD CONSTRAINT "PodInventory_nagsPartId_fkey" FOREIGN KEY ("nagsPartId") REFERENCES "NAGSPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoldingKit" ADD CONSTRAINT "MoldingKit_nagsPartId_fkey" FOREIGN KEY ("nagsPartId") REFERENCES "NAGSPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_fromShopId_fkey" FOREIGN KEY ("fromShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_toShopId_fkey" FOREIGN KEY ("toShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EDIMessage" ADD CONSTRAINT "EDIMessage_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "POSSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSession" ADD CONSTRAINT "POSSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSession" ADD CONSTRAINT "POSSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerAction" ADD CONSTRAINT "CashDrawerAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "POSSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerAction" ADD CONSTRAINT "CashDrawerAction_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
