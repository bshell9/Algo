-- CreateTable
CREATE TABLE "AgentReferral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentName" TEXT NOT NULL,
    "agentEmail" TEXT NOT NULL,
    "agentPhone" TEXT,
    "agencyName" TEXT,
    "agentCity" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerCity" TEXT,
    "customerZip" TEXT,
    "vehicleYear" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "damage" TEXT,
    "carrier" TEXT,
    "claimNumber" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'agent_portal',
    "firstContactAt" DATETIME,
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "workOrderId" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AgentReferral_agentEmail_idx" ON "AgentReferral"("agentEmail");

-- CreateIndex
CREATE INDEX "AgentReferral_status_idx" ON "AgentReferral"("status");

-- CreateIndex
CREATE INDEX "AgentReferral_receivedAt_idx" ON "AgentReferral"("receivedAt");
