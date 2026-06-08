import { z } from "zod";

export const activityLogSchema = z.object({
  entityType: z.enum(["PRODUCT", "PARTY", "INTAKE", "SALE", "SETTLEMENT", "SYSTEM"]),
  entityId: z.number().int().nullable().optional(),
  action: z.enum([
    "CREATED",
    "UPDATED",
    "DELETED",
    "COMPLETED",
    "CANCELLED",
    "ARCHIVED",
    "SUPERSEDED",
    "SOLD",
    "CLEARED",
    "PARTIALLY_SOLD",
    "DESTRUCTIVE_MODE_ENABLED",
    "DESTRUCTIVE_MODE_DISABLED",
    "HARD_DELETED"
  ]),
  description: z.string().nullable().optional(),
  userId: z.number().int().default(0),
  userName: z.string().nullable().optional().default("system"),
  businessId: z.number().int().default(0),
  meta: z.any().optional()
});
