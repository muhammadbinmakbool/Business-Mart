// Print Subsystem Data Mappers
import { format } from "date-fns";

/**
 * Maps a Prisma Intake record to a print-ready model.
 */
export function mapIntakeToPrintModel(intake) {
  const isSold = intake.status === "SOLD" || intake.status === "CLEARED";
  const track = intake.salesTracks?.[0] || null;

  return {
    documentId: intake.intakeNumber || `INT-${intake.id}`,
    entryDate: format(new Date(intake.entryDate), "PPPP"),
    systemTimestamp: format(new Date(intake.createdAt), "dd MMM yyyy, hh:mm a"),
    status: intake.status,
    notes: intake.notes || "No notes recorded.",
    
    party: {
      name: intake.party?.name || "N/A",
      phone: intake.party?.phoneNumber || "N/A",
      type: "SUPPLIER"
    },
    
    product: {
      name: intake.product?.name || "N/A",
      category: intake.product?.category || "N/A"
    },
    
    grossWeight: Number(intake.grossWeight || 0).toLocaleString(),
    unit: intake.unit || "KG",
    bagCount: intake.bagCount ? Number(intake.bagCount).toLocaleString() : null,
    
    isSold,
    buyer: isSold && track ? {
      name: track.buyer?.name || "N/A",
      phone: track.buyer?.phoneNumber || "N/A"
    } : null,
    
    soldDetails: isSold && track ? {
      netWeight: Number(track.quantity).toLocaleString(),
      rate: Number(track.sellingRate).toLocaleString(),
      rateUnit: intake.rateUnit || "KG",
      bardanaWeight: Number(intake.Bardana || 0).toLocaleString(),
      khotWeight: Number(intake.Khot || 0).toLocaleString(),
      baseAmount: Number(track.quantity * track.sellingRate).toLocaleString()
    } : null
  };
}

/**
 * Maps a Prisma Sale (Invoice) record to a print-ready model.
 */
export function mapSaleToPrintModel(sale) {
  return {
    documentId: sale.saleNumber || `SAL-${sale.id}`,
    entryDate: format(new Date(sale.entryDate), "PPPP"),
    systemTimestamp: format(new Date(sale.createdAt), "dd MMM yyyy, hh:mm a"),
    status: sale.status,
    notes: sale.notes || "No notes recorded.",
    
    party: {
      name: sale.party?.name || "N/A",
      phone: sale.party?.phoneNumber || "N/A",
      type: "BUYER"
    },
    
    items: (sale.items || []).map(item => ({
      id: item.id,
      productName: item.product?.name || "N/A",
      weight: Number(item.weight).toLocaleString(),
      unit: item.unit === "MAUND" ? "MND" : item.unit || "KG",
      rate: Number(item.rate).toLocaleString(),
      rateUnit: item.rateUnit === "MAUND" ? "MND" : item.rateUnit || "KG",
      amount: Number(item.amount).toLocaleString()
    })),
    
    adjustments: (sale.adjustments || []).map(adj => ({
      id: adj.id,
      type: adj.adjustmentType,
      method: adj.method === "PERCENTAGE" ? `${adj.value}% of Base` : 
              adj.method === "PER_WEIGHT" ? `Rs. ${adj.value} per ${adj.unit || "KG"}` : 
              `Fixed Rs. ${adj.value}`,
      direction: adj.direction,
      amount: Number(adj.calculatedAmount).toLocaleString()
    })),
    
    totals: {
      baseAmount: Number(sale.baseAmount).toLocaleString(),
      totalWeight: Number(sale.totalWeight).toLocaleString(),
      totalAdjustments: Number(sale.totalAdjustments).toLocaleString(),
      finalAmount: Number(sale.finalAmount).toLocaleString(),
      adjustmentsDirection: sale.totalAdjustments >= 0 ? "+" : ""
    }
  };
}

/**
 * Maps a Prisma Supplier Settlement (Invoice) record to a print-ready model.
 */
export function mapSettlementToPrintModel(invoice, intakeBreakdowns = [], summaryAdjustments = []) {
  return {
    documentId: invoice.invoiceNumber || `SET-${invoice.id}`,
    entryDate: format(new Date(invoice.createdAt), "dd MMM yyyy, hh:mm a"),
    version: invoice.version,
    status: invoice.status,
    isOutdated: invoice.isOutdated,
    
    party: {
      name: invoice.party?.name || "N/A",
      phone: invoice.party?.phoneNumber || "N/A",
      type: "SUPPLIER"
    },
    
    items: (invoice.items || []).map(item => {
      const breakdown = intakeBreakdowns.find(b => b.intakeId === item.id) || {
        net: Number(item.amount),
        adjustments: []
      };
      
      return {
        id: item.id,
        productName: item.intake?.product?.name || "N/A",
        intakeNumber: item.intake?.intakeNumber || `INT-${item.intakeTransactionId}`,
        weight: Number(item.weight).toLocaleString(),
        unit: item.intake?.unit || "KG",
        rate: Number(item.rate).toLocaleString(),
        rateUnit: item.intake?.rateUnit || "KG",
        grossAmount: Number(item.amount).toLocaleString(),
        netAmount: Number(breakdown.net).toLocaleString(),
        adjustments: (breakdown.adjustments || []).map(adj => ({
          type: adj.adjustmentType,
          description: adj.method === "PERCENTAGE" ? `${adj.value}%` : 
                       adj.method === "PER_WEIGHT" ? `Rs. ${adj.value}/${adj.unit || "KG"}` : 
                       `Fixed`,
          direction: adj.direction,
          amount: Number(adj.calculatedAmount).toLocaleString()
        }))
      };
    }),
    
    adjustmentsSummary: summaryAdjustments.map(adj => ({
      type: adj.adjustmentType,
      rule: adj.method === "PERCENTAGE" ? `${adj.value}%` : 
            adj.method === "PER_WEIGHT" ? `Rs. ${adj.value} per ${adj.unit || "KG"}` : 
            `Fixed Rs. ${adj.value}`,
      direction: adj.direction,
      amount: Number(adj.calculatedAmount).toLocaleString()
    })),
    
    advances: (invoice.advances || []).map(adv => ({
      id: adv.id,
      notes: adv.notes || "Advance Settlement",
      amount: Number(adv.amount).toLocaleString()
    })),
    
    totals: {
      grossValue: Number(invoice.totalGrossValue).toLocaleString(),
      deductions: Number(invoice.totalDeductions).toLocaleString(),
      advances: Number(invoice.totalAdvances).toLocaleString(),
      finalPayable: Number(invoice.finalPayableAmount).toLocaleString()
    }
  };
}

/**
 * Maps Ledger dashboard state or historical session data to a print-ready model.
 */
export function mapLedgerToPrintModel({
  title,
  startDate,
  endDate,
  supplierName = "All Suppliers",
  buyerName = "All Buyers",
  invoices = [],
  sales = [],
  summary = null,
  isSavedSession = false,
  drift = null
}) {
  const dateStr = startDate && endDate 
    ? `${format(new Date(startDate), "dd MMM yyyy")} to ${format(new Date(endDate), "dd MMM yyyy")}`
    : "Live Reconciliation Period";
    
  return {
    title: title || "Ledger Reconciliation Report",
    period: dateStr,
    generatedAt: format(new Date(), "dd MMM yyyy, hh:mm a"),
    filters: {
      supplier: supplierName,
      buyer: buyerName
    },
    isSavedSession,
    drift: drift ? {
      hasDrift: drift.hasDrift,
      fields: Object.entries(drift.fields || {}).map(([key, f]) => ({
        field: key,
        saved: Number(f.saved || 0).toLocaleString(),
        live: Number(f.live || 0).toLocaleString(),
        diff: Number(f.difference || 0).toLocaleString()
      }))
    } : null,
    
    summary: summary ? {
      supplier: {
        gross: Number(summary.supplier?.gross || 0).toLocaleString(),
        deductions: Number(summary.supplier?.deductions || 0).toLocaleString(),
        advances: Number(summary.supplier?.advances || 0).toLocaleString(),
        net: Number(summary.supplier?.baseTotal || 0).toLocaleString(),
        count: summary.supplier?.activeCount || 0
      },
      buyer: {
        base: Number(summary.buyer?.base || 0).toLocaleString(),
        adjustments: Number(summary.buyer?.adjustments || 0).toLocaleString(),
        net: Number(summary.buyer?.baseTotal || 0).toLocaleString(),
        count: summary.buyer?.activeCount || 0
      },
      difference: Number(summary.difference || 0).toLocaleString(),
      isMatched: summary.matched
    } : null,
    
    invoices: invoices.map(inv => ({
      date: format(new Date(inv.entryDate || inv.createdAt), "dd MMM yyyy"),
      number: inv.invoiceNumber,
      party: inv.party?.name || "N/A",
      gross: Number(inv.totalGrossValue).toLocaleString(),
      deductions: Number(inv.totalDeductions).toLocaleString(),
      advances: Number(inv.totalAdvances).toLocaleString(),
      net: Number(inv.finalPayableAmount).toLocaleString()
    })),
    
    sales: sales.map(sale => ({
      date: format(new Date(sale.entryDate), "dd MMM yyyy"),
      number: sale.saleNumber,
      party: sale.party?.name || "N/A",
      base: Number(sale.baseAmount).toLocaleString(),
      adjustments: Number(sale.totalAdjustments).toLocaleString(),
      net: Number(sale.finalAmount).toLocaleString()
    }))
  };
}
