import { z } from "zod";

export const adjustmentSchema = z.object({
  code: z.string()
    .min(2, "Code must be at least 2 characters")
    .max(100, "Code must be 100 characters or less")
    .regex(/^[A-Z0-9_]+$/, "Code must contain only uppercase letters, numbers, and underscores"),
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be 255 characters or less"),
  method: z.enum(["FIXED", "PERCENTAGE", "PER_WEIGHT", "PER_BAG"]),
  direction: z.enum(["ADD", "SUBTRACT"]),
  defaultConfiguredValue: z.coerce.number().min(0, "Value cannot be negative").nullable().optional(),
  isUserEditable: z.boolean().default(true),
  isEnabledByDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isSystemDefined: z.boolean().default(false),
  applicableTo: z.enum(["BUYER", "SUPPLIER", "BOTH"]).default("BOTH"),
  displayOrder: z.coerce.number().int().default(0),
  description: z.string().max(500, "Description must be 500 characters or less").nullable().optional()
});
