import { z } from "zod";

export const backupMetadataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  checksum: z.string().optional(),
});

export const fullBackupSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  data: z.object({
    User: z.array(z.any()).optional().default([]),
    Party: z.array(z.any()).optional().default([]),
    Product: z.array(z.any()).optional().default([]),
    IntakeTransaction: z.array(z.any()).optional().default([]),
    IntakeAdvance: z.array(z.any()).optional().default([]),
    SaleTransaction: z.array(z.any()).optional().default([]),
    SaleItem: z.array(z.any()).optional().default([]),
    SalesTrack: z.array(z.any()).optional().default([]),
    TransactionAdjustment: z.array(z.any()).optional().default([]),
    SupplierInvoice: z.array(z.any()).optional().default([]),
    SupplierInvoiceAdjustment: z.array(z.any()).optional().default([]),
    SupplierInvoiceItem: z.array(z.any()).optional().default([]),
    LedgerSession: z.array(z.any()).optional().default([]),
    ProductRate: z.array(z.any()).optional().default([]),
    ActivityLog: z.array(z.any()).optional().default([]),
    PartyPayment: z.array(z.any()).optional().default([]),
    PartyPaymentAllocation: z.array(z.any()).optional().default([]),
    SystemSetting: z.array(z.any()).optional().default([]),
  }),
});
