-- AlterTable
ALTER TABLE "Party" ADD COLUMN "migrationId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "migrationId" TEXT;

-- CreateTable
CREATE TABLE "InitialStock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "notes" TEXT,
    "migrationId" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InitialStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartyOpeningBalance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "migrationId" TEXT,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "businessId" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartyOpeningBalance_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SalesTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleTransactionId" INTEGER,
    "saleItemId" INTEGER,
    "intakeTransactionId" INTEGER,
    "initialStockId" INTEGER,
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
    CONSTRAINT "SalesTrack_initialStockId_fkey" FOREIGN KEY ("initialStockId") REFERENCES "InitialStock" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "SalesTrack_supplierPartyId_fkey" FOREIGN KEY ("supplierPartyId") REFERENCES "Party" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "SalesTrack_buyerPartyId_fkey" FOREIGN KEY ("buyerPartyId") REFERENCES "Party" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "SalesTrack_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
INSERT INTO "new_SalesTrack" ("baseAmount", "businessId", "buyerPartyId", "buyingRate", "createdAt", "deleteReason", "deletedAt", "deletedBy", "id", "intakeTransactionId", "isBilled", "isDeleted", "isSettled", "netWeight", "notes", "productId", "quantity", "rateUnit", "saleItemId", "saleTransactionId", "sellingRate", "supplierPartyId", "updatedAt", "userId") SELECT "baseAmount", "businessId", "buyerPartyId", "buyingRate", "createdAt", "deleteReason", "deletedAt", "deletedBy", "id", "intakeTransactionId", "isBilled", "isDeleted", "isSettled", "netWeight", "notes", "productId", "quantity", "rateUnit", "saleItemId", "saleTransactionId", "sellingRate", "supplierPartyId", "updatedAt", "userId" FROM "SalesTrack";
DROP TABLE "SalesTrack";
ALTER TABLE "new_SalesTrack" RENAME TO "SalesTrack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InitialStock_productId_key" ON "InitialStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyOpeningBalance_partyId_key" ON "PartyOpeningBalance"("partyId");
