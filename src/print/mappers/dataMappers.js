// Print Subsystem Data Mappers
import { format } from "date-fns";
import { UNIT_IDS, DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { formatCurrency } from "@/lib/formatters/financialFormatter";

/**
 * Maps a Prisma Intake record to a print-ready model.
 */
export function mapIntakeToPrintModel(intake, printConfig) {
  const decimalPlaces = printConfig?.decimalPlaces !== undefined ? Number(printConfig.decimalPlaces) : 2;
  const currencySymbol = printConfig?.defaultCurrency || "Rs.";
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
    
    product: intake.product ? {
      ...intake.product,
      name: intake.product.name,
      category: intake.product.category || "N/A"
    } : {
      name: "N/A",
      category: "N/A"
    },
    
    grossWeight: Number(intake.grossWeight || 0),
    unit: intake.unit || DEFAULT_WEIGHT_UNIT,
    bagCount: intake.bagCount ? Number(intake.bagCount) : null,
    
    isSold,
    buyer: isSold && track ? {
      name: track.buyer?.name || "N/A",
      phone: track.buyer?.phoneNumber || "N/A"
    } : null,
    
    soldDetails: isSold && track ? {
      product: intake.product,
      netWeight: Number(track.quantity),
      rate: formatCurrency(track.sellingRate, "en", currencySymbol, decimalPlaces),
      rateUnit: intake.rateUnit || DEFAULT_WEIGHT_UNIT,
      bardanaWeight: Number(intake.Bardana || 0),
      khotWeight: Number(intake.Khot || 0),
      baseAmount: formatCurrency(track.quantity * track.sellingRate, "en", currencySymbol, decimalPlaces)
    } : null
  };
}

/**
 * Maps a Prisma Sale (Invoice) record to a print-ready model.
 */
export function mapSaleToPrintModel(sale, printConfig) {
  const decimalPlaces = printConfig?.decimalPlaces !== undefined ? Number(printConfig.decimalPlaces) : 2;
  const currencySymbol = printConfig?.defaultCurrency || "Rs.";
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
      product: item.product,
      weight: Number(item.weight),
      unit: item.unit === UNIT_IDS.MAUND ? "MND" : item.unit || DEFAULT_WEIGHT_UNIT,
      rate: formatCurrency(item.rate, "en", currencySymbol, decimalPlaces),
      rateUnit: item.rateUnit === UNIT_IDS.MAUND ? "MND" : item.rateUnit || DEFAULT_WEIGHT_UNIT,
      amount: formatCurrency(item.amount, "en", currencySymbol, decimalPlaces)
    })),
    
    adjustments: (sale.adjustments || []).map(adj => ({
      id: adj.id,
      type: adj.adjustmentType,
      method: adj.method === "PERCENTAGE" ? `${adj.value}% of Base` : 
              adj.method === "PER_WEIGHT" ? `${formatCurrency(adj.value, "en", currencySymbol, decimalPlaces)} per ${adj.unit || DEFAULT_WEIGHT_UNIT}` : 
              `Fixed ${formatCurrency(adj.value, "en", currencySymbol, decimalPlaces)}`,
      direction: adj.direction,
      amount: formatCurrency(adj.calculatedAmount, "en", currencySymbol, decimalPlaces)
    })),
    
    totals: {
      baseAmount: formatCurrency(sale.baseAmount, "en", currencySymbol, decimalPlaces),
      totalWeight: Number(sale.totalWeight),
      totalAdjustments: formatCurrency(sale.totalAdjustments, "en", currencySymbol, decimalPlaces),
      finalAmount: formatCurrency(sale.finalAmount, "en", currencySymbol, decimalPlaces),
      adjustmentsDirection: sale.totalAdjustments >= 0 ? "+" : ""
    }
  };
}

/**
 * Maps a Prisma Supplier Settlement (Invoice) record to a print-ready model.
 */
export function mapSettlementToPrintModel(invoice, intakeBreakdowns = [], summaryAdjustments = [], printConfig) {
  const decimalPlaces = printConfig?.decimalPlaces !== undefined ? Number(printConfig.decimalPlaces) : 2;
  const currencySymbol = printConfig?.defaultCurrency || "Rs.";
  return {
    documentId: invoice.invoiceNumber || `SET-${invoice.id}`,
    entryDate: format(new Date(invoice.entryDate || invoice.createdAt), "dd MMM yyyy"),
    systemTimestamp: format(new Date(invoice.createdAt), "dd MMM yyyy, hh:mm a"),
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
        product: item.intake?.product,
        intakeNumber: item.intake?.intakeNumber || `INT-${item.intakeTransactionId}`,
        weight: Number(item.weight),
        unit: item.intake?.unit || DEFAULT_WEIGHT_UNIT,
        rate: formatCurrency(item.rate, "en", currencySymbol, decimalPlaces),
        rateUnit: item.intake?.rateUnit || DEFAULT_WEIGHT_UNIT,
        grossAmount: formatCurrency(item.amount, "en", currencySymbol, decimalPlaces),
        netAmount: formatCurrency(breakdown.net, "en", currencySymbol, decimalPlaces),
        adjustments: (breakdown.adjustments || []).map(adj => ({
          type: adj.adjustmentType,
          description: adj.method === "PERCENTAGE" ? `${adj.value}%` : 
                       adj.method === "PER_WEIGHT" ? `${formatCurrency(adj.value, "en", currencySymbol, decimalPlaces)}/${adj.unit || DEFAULT_WEIGHT_UNIT}` : 
                       `Fixed`,
          direction: adj.direction,
          amount: formatCurrency(adj.calculatedAmount, "en", currencySymbol, decimalPlaces)
        }))
      };
    }),
    
    adjustmentsSummary: summaryAdjustments.map(adj => ({
      type: adj.adjustmentType,
      rule: adj.method === "PERCENTAGE" ? `${adj.value}%` : 
            adj.method === "PER_WEIGHT" ? `${formatCurrency(adj.value, "en", currencySymbol, decimalPlaces)} per ${adj.unit || DEFAULT_WEIGHT_UNIT}` : 
            `Fixed ${formatCurrency(adj.value, "en", currencySymbol, decimalPlaces)}`,
      direction: adj.direction,
      amount: formatCurrency(adj.calculatedAmount, "en", currencySymbol, decimalPlaces)
    })),
    
    advances: (invoice.advances || []).map(adv => ({
      id: adv.id,
      notes: adv.notes || "Advance Settlement",
      amount: formatCurrency(adv.amount, "en", currencySymbol, decimalPlaces)
    })),
    
    totals: {
      grossValue: formatCurrency(invoice.totalGrossValue, "en", currencySymbol, decimalPlaces),
      deductions: formatCurrency(invoice.totalDeductions, "en", currencySymbol, decimalPlaces),
      advances: formatCurrency(invoice.totalAdvances, "en", currencySymbol, decimalPlaces),
      finalPayable: formatCurrency(invoice.finalPayableAmount, "en", currencySymbol, decimalPlaces)
    }
  };
}

/**
 * Maps Ledger dashboard state or historical session data to a print-ready model.
 */
export function mapLedgerToPrintModel(rawData, printConfig) {
  const {
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
  } = rawData;
  const decimalPlaces = printConfig?.decimalPlaces !== undefined ? Number(printConfig.decimalPlaces) : 2;
  const currencySymbol = printConfig?.defaultCurrency || "Rs.";
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
        saved: formatCurrency(f.saved || 0, "en", currencySymbol, decimalPlaces),
        live: formatCurrency(f.live || 0, "en", currencySymbol, decimalPlaces),
        diff: formatCurrency(f.difference || 0, "en", currencySymbol, decimalPlaces)
      }))
    } : null,
    
    summary: summary ? {
      supplier: {
        gross: formatCurrency(summary.supplier?.gross || 0, "en", currencySymbol, decimalPlaces),
        deductions: formatCurrency(summary.supplier?.deductions || 0, "en", currencySymbol, decimalPlaces),
        advances: formatCurrency(summary.supplier?.advances || 0, "en", currencySymbol, decimalPlaces),
        net: formatCurrency(summary.supplier?.baseTotal || 0, "en", currencySymbol, decimalPlaces),
        count: summary.supplier?.activeCount || 0
      },
      buyer: {
        base: formatCurrency(summary.buyer?.base || 0, "en", currencySymbol, decimalPlaces),
        adjustments: formatCurrency(summary.buyer?.adjustments || 0, "en", currencySymbol, decimalPlaces),
        net: formatCurrency(summary.buyer?.baseTotal || 0, "en", currencySymbol, decimalPlaces),
        count: summary.buyer?.activeCount || 0
      },
      difference: formatCurrency(summary.difference || 0, "en", currencySymbol, decimalPlaces),
      isMatched: summary.matched
    } : null,
    
    invoices: invoices.map(inv => ({
      date: format(new Date(inv.entryDate || inv.createdAt), "dd MMM yyyy"),
      number: inv.invoiceNumber,
      party: inv.party?.name || "N/A",
      gross: formatCurrency(inv.totalGrossValue, "en", currencySymbol, decimalPlaces),
      deductions: formatCurrency(inv.totalDeductions, "en", currencySymbol, decimalPlaces),
      advances: formatCurrency(inv.totalAdvances, "en", currencySymbol, decimalPlaces),
      net: formatCurrency(inv.finalPayableAmount, "en", currencySymbol, decimalPlaces)
    })),
    
    sales: sales.map(sale => ({
      date: format(new Date(sale.entryDate), "dd MMM yyyy"),
      number: sale.saleNumber,
      party: sale.party?.name || "N/A",
      base: formatCurrency(sale.baseAmount, "en", currencySymbol, decimalPlaces),
      adjustments: formatCurrency(sale.totalAdjustments, "en", currencySymbol, decimalPlaces),
      net: formatCurrency(sale.finalAmount, "en", currencySymbol, decimalPlaces)
    }))
  };
}
