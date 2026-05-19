import { z } from "zod";

export const adjustmentSchema = z.object({
  adjustmentType: z.string().min(1, "Adjustment type is required"),
  method: z.enum(["FIXED", "PERCENTAGE", "PER_WEIGHT"]),
  value: z.coerce.number().min(0, "Value must be positive"),
  direction: z.enum(["ADD", "SUBTRACT"]).default("ADD"),
});
