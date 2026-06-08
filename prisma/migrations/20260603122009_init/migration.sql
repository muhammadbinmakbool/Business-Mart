-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phoneNumber" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "partyType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'WEIGHT',
    "primaryUnit" TEXT NOT NULL DEFAULT 'KG',
    "unitConversion" DECIMAL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntakeTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intakeNumber" TEXT NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partyId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "bagCount" INTEGER,
    "rate" DECIMAL,
    "rateUnit" TEXT NOT NULL DEFAULT 'KG',
    "grossWeight" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "normalizedWeight" DECIMAL NOT NULL DEFAULT 0,
    "Bardana" DECIMAL,
    "Khot" DECIMAL,
    "netWeight" DECIMAL,
    "remainingWeight" DECIMAL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntakeTransaction_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "IntakeTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "IntakeAdvance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intakeTransactionId" INTEGER,
    "partyId" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "notes" TEXT,
    "supplierInvoiceId" INTEGER,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntakeAdvance_intakeTransactionId_fkey" FOREIGN KEY ("intakeTransactionId") REFERENCES "IntakeTransaction" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "IntakeAdvance_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "IntakeAdvance_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SaleTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleNumber" TEXT NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partyId" INTEGER NOT NULL,
    "totalWeight" DECIMAL NOT NULL,
    "baseAmount" DECIMAL NOT NULL,
    "totalAdjustments" DECIMAL NOT NULL,
    "finalAmount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAmount" DECIMAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "changeLog" TEXT,
    "previousState" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaleTransaction_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "weight" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "normalizedWeight" DECIMAL NOT NULL DEFAULT 0,
    "rate" DECIMAL NOT NULL,
    "rateUnit" TEXT NOT NULL DEFAULT 'KG',
    "amount" DECIMAL NOT NULL,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SaleTransaction" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SalesTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleTransactionId" INTEGER,
    "saleItemId" INTEGER,
    "intakeTransactionId" INTEGER,
    "supplierPartyId" INTEGER,
    "buyerPartyId" INTEGER,
    "productId" INTEGER,
    "quantity" DECIMAL NOT NULL,
    "buyingRate" DECIMAL,
    "sellingRate" DECIMAL,
    "rateUnit" TEXT DEFAULT 'KG',
    "netWeight" DECIMAL,
    "baseAmount" DECIMAL,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesTrack_saleTransactionId_fkey" FOREIGN KEY ("saleTransactionId") REFERENCES "SaleTransaction" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "SalesTrack_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "SalesTrack_intakeTransactionId_fkey" FOREIGN KEY ("intakeTransactionId") REFERENCES "IntakeTransaction" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "SalesTrack_supplierPartyId_fkey" FOREIGN KEY ("supplierPartyId") REFERENCES "Party" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "SalesTrack_buyerPartyId_fkey" FOREIGN KEY ("buyerPartyId") REFERENCES "Party" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "SalesTrack_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "TransactionAdjustment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "calculatedAmount" DECIMAL NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ADD',
    "unit" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TransactionAdjustment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SaleTransaction" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceNumber" TEXT NOT NULL,
    "partyId" INTEGER NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalGrossValue" DECIMAL NOT NULL,
    "totalDeductions" DECIMAL NOT NULL,
    "totalAdvances" DECIMAL NOT NULL,
    "finalPayableAmount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAmount" DECIMAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isOutdated" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastCalculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierInvoice_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SupplierInvoiceAdjustment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierInvoiceItemId" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "calculatedAmount" DECIMAL NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ADD',
    "unit" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SupplierInvoiceAdjustment_supplierInvoiceItemId_fkey" FOREIGN KEY ("supplierInvoiceItemId") REFERENCES "SupplierInvoiceItem" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SupplierInvoiceItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierInvoiceId" INTEGER NOT NULL,
    "intakeTransactionId" INTEGER NOT NULL,
    "weight" DECIMAL NOT NULL,
    "rate" DECIMAL NOT NULL,
    "amount" DECIMAL NOT NULL,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SupplierInvoiceItem_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "SupplierInvoiceItem_intakeTransactionId_fkey" FOREIGN KEY ("intakeTransactionId") REFERENCES "IntakeTransaction" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "LedgerSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "supplierTotal" DECIMAL NOT NULL,
    "buyerTotal" DECIMAL NOT NULL,
    "difference" DECIMAL NOT NULL,
    "supplierInvoiceCount" INTEGER NOT NULL DEFAULT 0,
    "buyerInvoiceCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "rate" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdBy" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "userName" TEXT,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PartyPayment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "amount" DECIMAL NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartyPayment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "PartyPaymentAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "allocatedAmount" DECIMAL NOT NULL,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartyPaymentAllocation_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "PartyPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PartyPayment" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeTransaction_intakeNumber_key" ON "IntakeTransaction"("intakeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SaleTransaction_saleNumber_key" ON "SaleTransaction"("saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_invoiceNumber_key" ON "SupplierInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_idx" ON "ActivityLog"("entityType");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartyPayment_paymentNumber_key" ON "PartyPayment"("paymentNumber");

-- CreateIndex
CREATE INDEX "PartyPayment_partyId_idx" ON "PartyPayment"("partyId");

-- CreateIndex
CREATE INDEX "PartyPayment_paymentNumber_idx" ON "PartyPayment"("paymentNumber");

-- CreateIndex
CREATE INDEX "PartyPayment_createdAt_idx" ON "PartyPayment"("createdAt");

-- CreateIndex
CREATE INDEX "PartyPaymentAllocation_partyId_idx" ON "PartyPaymentAllocation"("partyId");

-- CreateIndex
CREATE INDEX "PartyPaymentAllocation_referenceType_referenceId_idx" ON "PartyPaymentAllocation"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");
