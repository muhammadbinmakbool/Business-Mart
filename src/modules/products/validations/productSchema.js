import { z } from "zod";
import { UNIT_CATEGORIES } from "@/lib/constants";
import { DEFAULT_UNIT } from "@/lib/units";

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.nativeEnum(UNIT_CATEGORIES).default(UNIT_CATEGORIES.WEIGHT),
  primaryUnit: z.string().default(DEFAULT_UNIT),
  unitConversion: z.coerce.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

