-- AlterTable
ALTER TABLE "SaleTransaction" ADD COLUMN "deleteReason" TEXT;
ALTER TABLE "SaleTransaction" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "SaleTransaction" ADD COLUMN "deletedBy" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IntakeTransaction" (
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "deleteReason" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntakeTransaction_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "IntakeTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
INSERT INTO "new_IntakeTransaction" ("Bardana", "Khot", "bagCount", "businessId", "createdAt", "entryDate", "grossWeight", "id", "intakeNumber", "netWeight", "normalizedWeight", "notes", "partyId", "productId", "rate", "rateUnit", "remainingWeight", "status", "unit", "updatedAt", "userId") SELECT "Bardana", "Khot", "bagCount", "businessId", "createdAt", "entryDate", "grossWeight", "id", "intakeNumber", "netWeight", "normalizedWeight", "notes", "partyId", "productId", "rate", "rateUnit", "remainingWeight", "status", "unit", "updatedAt", "userId" FROM "IntakeTransaction";
DROP TABLE "IntakeTransaction";
ALTER TABLE "new_IntakeTransaction" RENAME TO "IntakeTransaction";
CREATE UNIQUE INDEX "IntakeTransaction_intakeNumber_key" ON "IntakeTransaction"("intakeNumber");
CREATE TABLE "new_LedgerSession" (
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "deleteReason" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LedgerSession" ("businessId", "buyerInvoiceCount", "buyerTotal", "createdAt", "difference", "endDate", "id", "notes", "startDate", "status", "supplierInvoiceCount", "supplierTotal", "title", "updatedAt", "userId") SELECT "businessId", "buyerInvoiceCount", "buyerTotal", "createdAt", "difference", "endDate", "id", "notes", "startDate", "status", "supplierInvoiceCount", "supplierTotal", "title", "updatedAt", "userId" FROM "LedgerSession";
DROP TABLE "LedgerSession";
ALTER TABLE "new_LedgerSession" RENAME TO "LedgerSession";
CREATE TABLE "new_Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "partyType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "deleteReason" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Party" ("address", "businessId", "createdAt", "id", "isActive", "name", "notes", "partyType", "phoneNumber", "updatedAt", "userId") SELECT "address", "businessId", "createdAt", "id", "isActive", "name", "notes", "partyType", "phoneNumber", "updatedAt", "userId" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'WEIGHT',
    "primaryUnit" TEXT NOT NULL DEFAULT 'KG',
    "unitConversion" DECIMAL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "deleteReason" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("businessId", "category", "createdAt", "id", "isActive", "name", "primaryUnit", "quantity", "unitConversion", "updatedAt", "userId") SELECT "businessId", "category", "createdAt", "id", "isActive", "name", "primaryUnit", "quantity", "unitConversion", "updatedAt", "userId" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE TABLE "new_SalesTrack" (
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "deleteReason" TEXT,
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
INSERT INTO "new_SalesTrack" ("baseAmount", "businessId", "buyerPartyId", "buyingRate", "createdAt", "id", "intakeTransactionId", "isBilled", "isSettled", "netWeight", "notes", "productId", "quantity", "rateUnit", "saleItemId", "saleTransactionId", "sellingRate", "supplierPartyId", "updatedAt", "userId") SELECT "baseAmount", "businessId", "buyerPartyId", "buyingRate", "createdAt", "id", "intakeTransactionId", "isBilled", "isSettled", "netWeight", "notes", "productId", "quantity", "rateUnit", "saleItemId", "saleTransactionId", "sellingRate", "supplierPartyId", "updatedAt", "userId" FROM "SalesTrack";
DROP TABLE "SalesTrack";
ALTER TABLE "new_SalesTrack" RENAME TO "SalesTrack";
CREATE TABLE "new_SupplierInvoice" (
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "deleteReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastCalculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierInvoice_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
INSERT INTO "new_SupplierInvoice" ("businessId", "createdAt", "entryDate", "finalPayableAmount", "id", "invoiceNumber", "isOutdated", "lastCalculatedAt", "paidAmount", "partyId", "paymentStatus", "status", "totalAdvances", "totalDeductions", "totalGrossValue", "updatedAt", "userId", "version") SELECT "businessId", "createdAt", "entryDate", "finalPayableAmount", "id", "invoiceNumber", "isOutdated", "lastCalculatedAt", "paidAmount", "partyId", "paymentStatus", "status", "totalAdvances", "totalDeductions", "totalGrossValue", "updatedAt", "userId", "version" FROM "SupplierInvoice";
DROP TABLE "SupplierInvoice";
ALTER TABLE "new_SupplierInvoice" RENAME TO "SupplierInvoice";
CREATE UNIQUE INDEX "SupplierInvoice_invoiceNumber_key" ON "SupplierInvoice"("invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
