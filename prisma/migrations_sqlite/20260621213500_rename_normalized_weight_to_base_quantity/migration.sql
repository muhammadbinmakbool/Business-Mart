-- Rename columns normalizedWeight -> baseQuantity
ALTER TABLE "IntakeTransaction" RENAME COLUMN "normalizedWeight" TO "baseQuantity";
ALTER TABLE "SaleItem" RENAME COLUMN "normalizedWeight" TO "baseQuantity";
