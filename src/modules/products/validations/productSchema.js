import { z } from "zod";
import { UNIT_CATEGORIES } from "@/lib/constants";
import { DEFAULT_WEIGHT_UNIT, isUnitCompatible } from "@/lib/units";

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.nativeEnum(UNIT_CATEGORIES).optional().nullable(), // Kept for backward compatibility/coexistence
  unitCategory: z.nativeEnum(UNIT_CATEGORIES).default(UNIT_CATEGORIES.WEIGHT),
  productCategoryId: z.coerce.number().optional().nullable(),
  primaryUnit: z.string().default(DEFAULT_WEIGHT_UNIT),
  unitConversion: z.coerce.number().optional().nullable(),
  defaultBuyingRate: z.coerce.number().optional().nullable(),
  defaultSellingRate: z.coerce.number().optional().nullable(),
  buyingRateUnit: z.string().optional().nullable(),
  sellingRateUnit: z.string().optional().nullable(),
  defaultSellingUnit: z.string().optional().nullable(),
  displayOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
}).superRefine((data, ctx) => {
  const cat = data.unitCategory;

  // Verify primary unit is compatible
  if (data.primaryUnit && !isUnitCompatible(data.primaryUnit, cat)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Primary unit is incompatible with unit category ${cat}`,
      path: ["primaryUnit"],
    });
  }

  // Verify buying rate unit is compatible
  if (data.buyingRateUnit && !isUnitCompatible(data.buyingRateUnit, cat)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Buying rate unit is incompatible with unit category ${cat}`,
      path: ["buyingRateUnit"],
    });
  }

  // Verify selling rate unit is compatible
  if (data.sellingRateUnit && !isUnitCompatible(data.sellingRateUnit, cat)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Selling rate unit is incompatible with unit category ${cat}`,
      path: ["sellingRateUnit"],
    });
  }

  // Verify default selling unit is compatible
  if (data.defaultSellingUnit && !isUnitCompatible(data.defaultSellingUnit, cat)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Default selling unit is incompatible with unit category ${cat}`,
      path: ["defaultSellingUnit"],
    });
  }
});

