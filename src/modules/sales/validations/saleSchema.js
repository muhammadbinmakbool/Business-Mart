import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  weight: z.coerce.number().min(0.01, "Weight must be greater than 0"),
  rate: z.coerce.number().min(0.01, "Rate must be greater than 0"),
  amount: z.coerce.number().optional(), // Calculated by service
});

export const adjustmentSchema = z.object({
  adjustmentType: z.string().min(1, "Adjustment type is required"),
  method: z.enum(["FIXED", "PERCENTAGE", "PER_WEIGHT"]),
  value: z.coerce.number().min(0, "Value must be positive"),
  direction: z.enum(["ADD", "SUBTRACT"]).default("ADD"),
});

export const saleSchema = z.object({
  partyId: z.coerce.number().min(1, "Buyer is required"),
  entryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  notes: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  adjustments: z.array(adjustmentSchema).optional().default([]),
});
