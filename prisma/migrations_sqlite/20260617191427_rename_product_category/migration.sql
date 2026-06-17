-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "deleteReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdjustmentDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "defaultConfiguredValue" DECIMAL,
    "isUserEditable" BOOLEAN NOT NULL DEFAULT true,
    "isEnabledByDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isSystemDefined" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "applicableTo" TEXT NOT NULL DEFAULT 'BOTH',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT 'WEIGHT',
    "unitCategory" TEXT NOT NULL DEFAULT 'WEIGHT',
    "productCategoryId" INTEGER,
    "primaryUnit" TEXT NOT NULL DEFAULT 'KG',
    "unitConversion" DECIMAL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "defaultBuyingRate" DECIMAL,
    "defaultSellingRate" DECIMAL,
    "buyingRateUnit" TEXT,
    "sellingRateUnit" TEXT,
    "defaultSellingUnit" TEXT,
    "displayOrder" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "deleteReason" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "migrationId" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("businessId", "category", "unitCategory", "createdAt", "deleteReason", "deletedAt", "deletedBy", "id", "isActive", "isDeleted", "migrationId", "name", "primaryUnit", "quantity", "source", "unitConversion", "updatedAt", "userId") SELECT "businessId", "category", "category", "createdAt", "deleteReason", "deletedAt", "deletedBy", "id", "isActive", "isDeleted", "migrationId", "name", "primaryUnit", "quantity", "source", "unitConversion", "updatedAt", "userId" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_isDeleted_idx" ON "Product"("isDeleted");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE TABLE "new_SupplierInvoiceAdjustment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierInvoiceItemId" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT 'LEGACY',
    "isLegacySnapshot" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "calculatedAmount" DECIMAL NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ADD',
    "unit" TEXT,
    "isUserEditable" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SupplierInvoiceAdjustment_supplierInvoiceItemId_fkey" FOREIGN KEY ("supplierInvoiceItemId") REFERENCES "SupplierInvoiceItem" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_SupplierInvoiceAdjustment" ("adjustmentType", "businessId", "calculatedAmount", "direction", "id", "method", "supplierInvoiceItemId", "unit", "userId", "value") SELECT "adjustmentType", "businessId", "calculatedAmount", "direction", "id", "method", "supplierInvoiceItemId", "unit", "userId", "value" FROM "SupplierInvoiceAdjustment";
DROP TABLE "SupplierInvoiceAdjustment";
ALTER TABLE "new_SupplierInvoiceAdjustment" RENAME TO "SupplierInvoiceAdjustment";
CREATE TABLE "new_TransactionAdjustment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT 'LEGACY',
    "isLegacySnapshot" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "calculatedAmount" DECIMAL NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ADD',
    "unit" TEXT,
    "isUserEditable" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TransactionAdjustment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SaleTransaction" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_TransactionAdjustment" ("adjustmentType", "businessId", "calculatedAmount", "direction", "id", "method", "saleId", "unit", "userId", "value") SELECT "adjustmentType", "businessId", "calculatedAmount", "direction", "id", "method", "saleId", "unit", "userId", "value" FROM "TransactionAdjustment";
DROP TABLE "TransactionAdjustment";
ALTER TABLE "new_TransactionAdjustment" RENAME TO "TransactionAdjustment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE INDEX "ProductCategory_isDeleted_idx" ON "ProductCategory"("isDeleted");

-- CreateIndex
CREATE INDEX "ProductCategory_isActive_idx" ON "ProductCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdjustmentDefinition_code_key" ON "AdjustmentDefinition"("code");

-- CreateIndex
CREATE INDEX "IntakeTransaction_partyId_idx" ON "IntakeTransaction"("partyId");

-- CreateIndex
CREATE INDEX "IntakeTransaction_productId_idx" ON "IntakeTransaction"("productId");

-- CreateIndex
CREATE INDEX "IntakeTransaction_status_idx" ON "IntakeTransaction"("status");

-- CreateIndex
CREATE INDEX "IntakeTransaction_isDeleted_idx" ON "IntakeTransaction"("isDeleted");

-- CreateIndex
CREATE INDEX "IntakeTransaction_entryDate_idx" ON "IntakeTransaction"("entryDate");

-- CreateIndex
CREATE INDEX "Party_isDeleted_idx" ON "Party"("isDeleted");

-- CreateIndex
CREATE INDEX "Party_isActive_idx" ON "Party"("isActive");

-- CreateIndex
CREATE INDEX "SaleTransaction_partyId_idx" ON "SaleTransaction"("partyId");

-- CreateIndex
CREATE INDEX "SaleTransaction_status_idx" ON "SaleTransaction"("status");

-- CreateIndex
CREATE INDEX "SaleTransaction_isDeleted_idx" ON "SaleTransaction"("isDeleted");

-- CreateIndex
CREATE INDEX "SaleTransaction_entryDate_idx" ON "SaleTransaction"("entryDate");

-- CreateIndex
CREATE INDEX "SalesTrack_isDeleted_idx" ON "SalesTrack"("isDeleted");

-- CreateIndex
CREATE INDEX "SalesTrack_intakeTransactionId_idx" ON "SalesTrack"("intakeTransactionId");

-- CreateIndex
CREATE INDEX "SalesTrack_saleTransactionId_idx" ON "SalesTrack"("saleTransactionId");

-- CreateIndex
CREATE INDEX "SalesTrack_supplierPartyId_idx" ON "SalesTrack"("supplierPartyId");

-- CreateIndex
CREATE INDEX "SalesTrack_buyerPartyId_idx" ON "SalesTrack"("buyerPartyId");

-- CreateIndex
CREATE INDEX "SalesTrack_productId_idx" ON "SalesTrack"("productId");

-- CreateIndex
CREATE INDEX "SupplierInvoice_partyId_idx" ON "SupplierInvoice"("partyId");

-- CreateIndex
CREATE INDEX "SupplierInvoice_status_idx" ON "SupplierInvoice"("status");

-- CreateIndex
CREATE INDEX "SupplierInvoice_isDeleted_idx" ON "SupplierInvoice"("isDeleted");

-- CreateIndex
CREATE INDEX "SupplierInvoice_entryDate_idx" ON "SupplierInvoice"("entryDate");
