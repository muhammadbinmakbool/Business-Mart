import { z } from "zod";

// Mapping of user-facing unit abbreviations and names to standard database UNIT_IDS
export const UNIT_MAPPING = {
  kg: "KG",
  kilogram: "KG",
  maund: "MAUND",
  mnd: "MAUND",
  ton: "TON",
  bag: "BAG",
  ml: "ML",
  milliliter: "ML",
  liter: "LITER",
  ltr: "LITER",
  piece: "PIECE",
  pcs: "PIECE",
  pack: "PACK",
  pck: "PACK",
  box: "BOX"
};

// Normalized party schema
export const partyImportSchema = z.object({
  name: z.string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .trim(),
  phoneNumber: z.string({ required_error: "Phone number is required" })
    .min(5, "Phone number must be at least 5 digits")
    .trim(),
  address: z.string().optional().nullable().default(""),
  partyType: z.preprocess(
    (val) => String(val || "").toUpperCase().trim(),
    z.enum(["BUYER", "SUPPLIER"], {
      errorMap: () => ({ message: "Party Type must be BUYER or SUPPLIER" })
    })
  ),
  openingBalance: z.preprocess(
    (val) => (val === undefined || val === null || val === "" ? 0 : Number(val)),
    z.number().nonnegative("Opening balance must be greater than or equal to 0").default(0)
  ),
  openingBalanceType: z.preprocess(
    (val) => {
      const s = String(val || "").toUpperCase().trim();
      return s === "PAYABLE" ? "PAYABLE" : "RECEIVABLE";
    },
    z.enum(["RECEIVABLE", "PAYABLE"]).default("RECEIVABLE")
  ),
  notes: z.string().optional().nullable().default("")
});

// Normalized product schema
export const productImportSchema = z.object({
  name: z.string({ required_error: "Name is required" })
    .min(2, "Product name must be at least 2 characters")
    .trim(),
  category: z.preprocess(
    (val) => String(val || "").toUpperCase().trim() || "WEIGHT",
    z.enum(["WEIGHT", "LIQUID", "QUANTITY"]).default("WEIGHT")
  ),
  primaryUnit: z.preprocess(
    (val) => {
      const raw = String(val || "").toLowerCase().trim();
      return UNIT_MAPPING[raw] || "KG";
    },
    z.string().min(1, "Primary Unit is required")
  ),
  unitConversion: z.preprocess(
    (val) => (val === undefined || val === null || val === "" ? null : Number(val)),
    z.number().positive("Unit conversion must be a positive number").nullable().optional()
  ),
  initialStock: z.preprocess(
    (val) => (val === undefined || val === null || val === "" ? 0 : Number(val)),
    z.number().nonnegative("Initial stock must be greater than or equal to 0").default(0)
  ),
  initialStockUnit: z.preprocess(
    (val) => {
      const raw = String(val || "").toLowerCase().trim();
      return UNIT_MAPPING[raw] || null;
    },
    z.string().optional().nullable()
  ),
  notes: z.string().optional().nullable().default("")
});
