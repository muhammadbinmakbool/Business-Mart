import { z } from "zod";

export const intakeSchema = z.object({
  partyId: z.coerce.number().min(1, "Supplier is required"),
  productId: z.coerce.number().min(1, "Product is required"),
  entryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  bagCount: z.coerce.number().optional().nullable(),
  grossWeight: z.coerce.number().min(0.01, "Weight must be greater than 0"),
  rate: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().default("PENDING"),
});

export const advanceSchema = z.object({
  partyId: z.coerce.number().min(1, "Party is required"),
  intakeTransactionId: z.coerce.number().optional().nullable(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  notes: z.string().optional().nullable(),
});
