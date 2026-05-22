import { z } from "zod";

export const IntakePrintSchema = z.object({
  documentId: z.string(),
  entryDate: z.string(),
  systemTimestamp: z.string(),
  status: z.string(),
  notes: z.string(),
  party: z.object({
    name: z.string(),
    phone: z.string(),
    type: z.literal("SUPPLIER")
  }),
  product: z.object({
    name: z.string(),
    category: z.string()
  }),
  grossWeight: z.string(),
  unit: z.string(),
  bagCount: z.string().nullable(),
  isSold: z.boolean(),
  buyer: z.object({
    name: z.string(),
    phone: z.string()
  }).nullable(),
  soldDetails: z.object({
    netWeight: z.string(),
    rate: z.string(),
    rateUnit: z.string(),
    bardanaWeight: z.string(),
    khotWeight: z.string(),
    baseAmount: z.string()
  }).nullable()
});

export const SalePrintSchema = z.object({
  documentId: z.string(),
  entryDate: z.string(),
  systemTimestamp: z.string(),
  status: z.string(),
  notes: z.string(),
  party: z.object({
    name: z.string(),
    phone: z.string(),
    type: z.literal("BUYER")
  }),
  items: z.array(z.object({
    id: z.number(),
    productName: z.string(),
    weight: z.string(),
    unit: z.string(),
    rate: z.string(),
    rateUnit: z.string(),
    amount: z.string()
  })),
  adjustments: z.array(z.object({
    id: z.number(),
    type: z.string(),
    method: z.string(),
    direction: z.enum(["ADD", "SUBTRACT"]),
    amount: z.string()
  })),
  totals: z.object({
    baseAmount: z.string(),
    totalWeight: z.string(),
    totalAdjustments: z.string(),
    finalAmount: z.string(),
    adjustmentsDirection: z.string()
  })
});

export const SettlementPrintSchema = z.object({
  documentId: z.string(),
  entryDate: z.string(),
  version: z.number(),
  status: z.string(),
  isOutdated: z.boolean(),
  party: z.object({
    name: z.string(),
    phone: z.string(),
    type: z.literal("SUPPLIER")
  }),
  items: z.array(z.object({
    id: z.number(),
    productName: z.string(),
    intakeNumber: z.string(),
    weight: z.string(),
    unit: z.string(),
    rate: z.string(),
    grossAmount: z.string(),
    netAmount: z.string(),
    adjustments: z.array(z.object({
      type: z.string(),
      description: z.string(),
      direction: z.enum(["ADD", "SUBTRACT"]),
      amount: z.string()
    }))
  })),
  adjustmentsSummary: z.array(z.object({
    type: z.string(),
    rule: z.string(),
    direction: z.enum(["ADD", "SUBTRACT"]),
    amount: z.string()
  })),
  advances: z.array(z.object({
    id: z.number(),
    notes: z.string(),
    amount: z.string()
  })),
  totals: z.object({
    grossValue: z.string(),
    deductions: z.string(),
    advances: z.string(),
    finalPayable: z.string()
  })
});

export const LedgerPrintSchema = z.object({
  title: z.string(),
  period: z.string(),
  generatedAt: z.string(),
  filters: z.object({
    supplier: z.string(),
    buyer: z.string()
  }),
  isSavedSession: z.boolean(),
  drift: z.object({
    hasDrift: z.boolean(),
    fields: z.array(z.object({
      field: z.string(),
      saved: z.string(),
      live: z.string(),
      diff: z.string()
    }))
  }).nullable(),
  summary: z.object({
    supplier: z.object({
      gross: z.string(),
      deductions: z.string(),
      advances: z.string(),
      net: z.string(),
      count: z.number()
    }),
    buyer: z.object({
      base: z.string(),
      adjustments: z.string(),
      net: z.string(),
      count: z.number()
    }),
    difference: z.string(),
    isMatched: z.boolean()
  }).nullable(),
  invoices: z.array(z.object({
    date: z.string(),
    number: z.string(),
    party: z.string(),
    gross: z.string(),
    deductions: z.string(),
    advances: z.string(),
    net: z.string()
  })),
  sales: z.array(z.object({
    date: z.string(),
    number: z.string(),
    party: z.string(),
    base: z.string(),
    adjustments: z.string(),
    net: z.string()
  }))
});
