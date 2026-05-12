import { z } from "zod";
import { PARTY_TYPES } from "@/lib/constants";

export const partySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string().min(7, "Phone number is too short"),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  partyType: z.enum([PARTY_TYPES.SUPPLIER, PARTY_TYPES.BUYER, PARTY_TYPES.BOTH]),
  isActive: z.boolean().default(true),
});
