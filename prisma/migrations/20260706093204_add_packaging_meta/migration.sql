-- AlterTable
ALTER TABLE "IntakeTransaction" ADD COLUMN "packagingMeta" JSONB;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN "packagingMeta" JSONB;
