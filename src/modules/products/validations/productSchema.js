import { z } from "zod";
import { UNIT_TYPES } from "@/lib/constants";

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  unitType: z.enum([UNIT_TYPES.BAG, UNIT_TYPES.KG, UNIT_TYPES.MAUND, UNIT_TYPES.PIECE]),
  isActive: z.boolean().default(true),
});
