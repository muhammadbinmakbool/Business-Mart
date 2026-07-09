import { z } from "zod";

export const intakeSchema = z.object({
  partyId: z.coerce.number().min(1, "Supplier is required"),
  productId: z.coerce.number().min(1, "Product is required"),
  entryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  bagCount: z.coerce.number().optional().nullable(),
  grossWeight: z.coerce.number().min(0.01, "Weight must be greater than 0"),
  netWeight: z.coerce.number().optional().nullable(),
  Bardana: z.coerce.number().optional().nullable(),
  Khot: z.coerce.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  rate: z.coerce.number().optional().nullable(),
  rateUnit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  packagingMeta: z.any().optional().nullable(),
});

export const arrivalSchema = z.object({
  partyId: z.coerce.number().min(1, "Supplier is required"),
  productId: z.coerce.number().min(1, "Product is required"),
  entryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  notes: z.string().optional().nullable(),
  arrivalMeta: z.any().optional().nullable(),
  grossWeight: z.coerce.number().optional().nullable(),
  bagCount: z.coerce.number().optional().nullable(),
  unit: z.string().optional().nullable(),
});

export const receiptIntakeSchema = z.object({
  partyId: z.coerce.number().min(1, "Supplier is required"),
  productId: z.coerce.number().min(1, "Product is required"),
  entryDate: z.string().or(z.date()).transform((val) => new Date(val)),
  bagCount: z.coerce.number().optional().nullable(),
  grossWeight: z.coerce.number().optional().nullable(),
  netWeight: z.coerce.number().optional().nullable(),
  Bardana: z.coerce.number().optional().nullable(),
  Khot: z.coerce.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  rate: z.coerce.number().optional().nullable(),
  rateUnit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  packagingMeta: z.any().optional().nullable(),
  arrivalMeta: z.any().optional().nullable(),
});

export const sellingSchema = z.object({
  buyerPartyId: z.coerce.number().min(1, "Buyer is required"),
  rate: z.coerce.number().min(0.01, "Rate must be greater than 0"),
  rateUnit: z.string().min(1, "Rate Unit is required"),
  soldQuantity: z.coerce.number().optional().nullable(),
  isPartialSale: z.boolean().optional().nullable(),
});

export const weightSchema = z.object({
  grossWeight: z.coerce.number().min(0.01, "Gross Weight must be greater than 0"),
  bagCount: z.coerce.number().min(1, "Bag Count must be greater than 0"),
  Bardana: z.coerce.number().optional().nullable(),
  Khot: z.coerce.number().optional().nullable(),
});

export const advanceSchema = z.object({
  partyId: z.coerce.number().min(1, "Party is required"),
  intakeTransactionId: z.coerce.number().optional().nullable(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  notes: z.string().optional().nullable(),
});

