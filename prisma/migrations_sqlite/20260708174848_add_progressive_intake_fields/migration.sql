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
    "baseQuantity" DECIMAL NOT NULL DEFAULT 0,
    "Bardana" DECIMAL,
    "Khot" DECIMAL,
    "netWeight" DECIMAL,
    "remainingWeight" DECIMAL,
    "notes" TEXT,
    "packagingMeta" JSONB,
    "arrivalMeta" JSONB,
    "isWeightRecorded" BOOLEAN NOT NULL DEFAULT true,
    "arrivalCompletedAt" DATETIME,
    "sellingCompletedAt" DATETIME,
    "weightCompletedAt" DATETIME,
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
INSERT INTO "new_IntakeTransaction" ("Bardana", "Khot", "bagCount", "baseQuantity", "businessId", "createdAt", "deleteReason", "deletedAt", "deletedBy", "entryDate", "grossWeight", "id", "intakeNumber", "isDeleted", "netWeight", "notes", "packagingMeta", "partyId", "productId", "rate", "rateUnit", "remainingWeight", "status", "unit", "updatedAt", "userId") SELECT "Bardana", "Khot", "bagCount", "baseQuantity", "businessId", "createdAt", "deleteReason", "deletedAt", "deletedBy", "entryDate", "grossWeight", "id", "intakeNumber", "isDeleted", "netWeight", "notes", "packagingMeta", "partyId", "productId", "rate", "rateUnit", "remainingWeight", "status", "unit", "updatedAt", "userId" FROM "IntakeTransaction";
DROP TABLE "IntakeTransaction";
ALTER TABLE "new_IntakeTransaction" RENAME TO "IntakeTransaction";
CREATE UNIQUE INDEX "IntakeTransaction_intakeNumber_key" ON "IntakeTransaction"("intakeNumber");
CREATE INDEX "IntakeTransaction_partyId_idx" ON "IntakeTransaction"("partyId");
CREATE INDEX "IntakeTransaction_productId_idx" ON "IntakeTransaction"("productId");
CREATE INDEX "IntakeTransaction_status_idx" ON "IntakeTransaction"("status");
CREATE INDEX "IntakeTransaction_isDeleted_idx" ON "IntakeTransaction"("isDeleted");
CREATE INDEX "IntakeTransaction_entryDate_idx" ON "IntakeTransaction"("entryDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
