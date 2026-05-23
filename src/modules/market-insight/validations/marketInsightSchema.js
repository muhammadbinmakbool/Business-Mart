import { z } from "zod";

export const marketInsightSchema = z.object({
  productId: z.coerce.number().int().positive("Product is required"),
  rate: z.coerce.number().positive("Rate must be a positive number"),
  unit: z.string().min(1, "Unit is required"),
  date: z.coerce.date().default(() => new Date()),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
});
