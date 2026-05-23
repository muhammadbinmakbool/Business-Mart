import { prisma } from "@/lib/prisma";
import { 
  calculateSupplierTotals, 
  calculateBuyerTotals, 
  calculateReconciliationSummary 
} from "@/lib/reconciliation";

export class DashboardService {
  /**
   * Operational Dashboard = Read-Only Visibility Layer
   * Strictly Observational. NO Mutations allowed.
   * Grouped per domain to avoid cross-widget coupling.
   */

  // --- 1. FINANCE DOMAIN ---
  static async getFinanceOverview() {
    // 1. Fetch active invoices (non-superseded)
    const invoices = await prisma.supplierInvoice.findMany({
      where: { status: { not: "SUPERSEDED" } }
    });

    // 2. Fetch active sales (non-deleted, non-cancelled)
    const sales = await prisma.saleTransaction.findMany({
      where: { 
        isDeleted: false,
        status: { not: "CANCELLED" }
      }
    });

    const supplierStats = calculateSupplierTotals(invoices);
    const buyerStats = calculateBuyerTotals(sales);

    // Today's commissions
    const { start, end } = this.getTodayRange();
    const todayCommissions = await prisma.transactionAdjustment.aggregate({
      _sum: {
        calculatedAmount: true
      },
      where: {
        adjustmentType: "Commission",
        sale: {
          entryDate: { gte: start, lte: end },
          isDeleted: false
        }
      }
    });

    return {
      supplierPayableTotal: supplierStats.finalPayable,
      buyerReceivableTotal: buyerStats.final,
      todayCommissionTotal: todayCommissions._sum.calculatedAmount ? Number(todayCommissions._sum.calculatedAmount) : 0,
      activeInvoicesCount: supplierStats.activeCount,
      activeSalesCount: buyerStats.activeCount
    };
  }

  // --- 2. INVENTORY DOMAIN ---
  static async getInventoryOverview() {
    const products = await prisma.product.findMany({
      where: { isActive: true }
    });

    const totalStockQuantity = products.reduce((sum, p) => sum + Number(p.quantity), 0);
    const lowStockCount = products.filter(p => Number(p.quantity) < 50).length;

    return {
      totalStockQuantity,
      lowStockCount,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        quantity: Number(p.quantity)
      }))
    };
  }

  // --- 3. LEDGER DOMAIN ---
  static async getLedgerOverview() {
    const latestSession = await prisma.ledgerSession.findFirst({
      orderBy: { endDate: "desc" }
    });

    if (!latestSession) {
      return {
        hasSession: false,
        difference: 0,
        status: "N/A",
        matched: true,
        title: "No saved sessions"
      };
    }

    const difference = Number(latestSession.difference);
    const matched = Math.abs(difference) <= 1.00; // default tolerance of 1.00

    return {
      hasSession: true,
      title: latestSession.title,
      difference,
      status: latestSession.status, // OPEN | LOCKED
      matched
    };
  }

  // --- 4. ACTIVITY & SUMMARIES DOMAIN ---
  static async getActivityOverview() {
    const { start, end } = this.getTodayRange();

    const [todayIntakesCount, todaySalesCount, todaySettlementsCount] = await Promise.all([
      prisma.intakeTransaction.count({
        where: { entryDate: { gte: start, lte: end } }
      }),
      prisma.saleTransaction.count({
        where: { 
          isDeleted: false,
          entryDate: { gte: start, lte: end } 
        }
      }),
      prisma.supplierInvoice.count({
        where: {
          status: { not: "SUPERSEDED" },
          entryDate: { gte: start, lte: end }
        }
      })
    ]);

    // Feed items merging
    const [latestIntakes, latestSales, latestSettlements, latestAdvances, latestSessions] = await Promise.all([
      prisma.intakeTransaction.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { party: true }
      }),
      prisma.saleTransaction.findMany({
        take: 10,
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: { party: true }
      }),
      prisma.supplierInvoice.findMany({
        take: 10,
        where: { status: { not: "SUPERSEDED" } },
        orderBy: { createdAt: "desc" },
        include: { party: true }
      }),
      prisma.intakeAdvance.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { party: true }
      }),
      prisma.ledgerSession.findMany({
        take: 10,
        orderBy: { createdAt: "desc" }
      })
    ]);

    const feed = [];

    latestIntakes.forEach(item => {
      feed.push({
        id: item.id,
        type: "INTAKE",
        title: `Intake ${item.intakeNumber}`,
        partyName: item.party?.name || "Unknown Party",
        value: `${Number(item.grossWeight)} ${item.unit}`,
        createdAt: item.createdAt,
        link: `/intake/${item.id}`
      });
    });

    latestSales.forEach(item => {
      feed.push({
        id: item.id,
        type: "SALE",
        title: `Sale ${item.saleNumber}`,
        partyName: item.party?.name || "Unknown Party",
        value: `Rs. ${Number(item.finalAmount)}`,
        createdAt: item.createdAt,
        link: `/sales/${item.id}`
      });
    });

    latestSettlements.forEach(item => {
      feed.push({
        id: item.id,
        type: "SETTLEMENT",
        title: `Settlement ${item.invoiceNumber}`,
        partyName: item.party?.name || "Unknown Party",
        value: `Rs. ${Number(item.finalPayableAmount)}`,
        createdAt: item.createdAt,
        link: `/supplier-invoices/${item.id}`
      });
    });

    latestAdvances.forEach(item => {
      feed.push({
        id: item.id,
        type: "ADVANCE",
        title: `Advance (Intake)`,
        partyName: item.party?.name || "Unknown Party",
        value: `Rs. ${Number(item.amount)}`,
        createdAt: item.createdAt,
        link: `/intake/${item.intakeTransactionId || ""}`
      });
    });

    latestSessions.forEach(item => {
      feed.push({
        id: item.id,
        type: "LEDGER_SESSION",
        title: `Session: ${item.title}`,
        partyName: "System Ledger",
        value: `Diff: Rs. ${Number(item.difference)}`,
        createdAt: item.createdAt,
        link: `/ledger`
      });
    });

    // Sort combined feed by date desc
    const sortedFeed = feed
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12);

    return {
      todayIntakesCount,
      todaySalesCount,
      todaySettlementsCount,
      todayBuyerInvoicesCount: todaySalesCount, // SaleTransaction IS the buyer invoice
      feed: sortedFeed
    };
  }

  // --- 5. PENDING ATTENTION DOMAIN ---
  static async getPendingAttention() {
    // A. Pending Intakes (status = "PENDING")
    const pendingIntakes = await prisma.intakeTransaction.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { entryDate: "desc" },
      include: { party: true, product: true }
    });

    // B. Pending Settlements (SOLD intakes not yet settled in active invoices)
    const pendingSettlements = await prisma.intakeTransaction.findMany({
      where: {
        status: "SOLD",
        invoiceItems: {
          none: {
            invoice: {
              status: { not: "SUPERSEDED" }
            }
          }
        }
      },
      take: 5,
      orderBy: { entryDate: "desc" },
      include: { party: true, product: true }
    });

    // C. Pending Buyer Billing (unbilled SalesTrack records)
    const pendingBilling = await prisma.salesTrack.findMany({
      where: { isBilled: false },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { buyer: true, product: true }
    });

    // D. Reconciliation alerts: drift warnings check on the last 5 saved sessions
    const lastSessions = await prisma.ledgerSession.findMany({
      take: 5,
      orderBy: { endDate: "desc" }
    });

    const driftAlerts = [];
    for (const session of lastSessions) {
      // Fetch live data for the session interval
      const [invoices, sales] = await Promise.all([
        prisma.supplierInvoice.findMany({
          where: {
            status: { not: "SUPERSEDED" },
            entryDate: {
              gte: session.startDate,
              lte: session.endDate
            }
          }
        }),
        prisma.saleTransaction.findMany({
          where: {
            isDeleted: false,
            status: { not: "CANCELLED" },
            entryDate: {
              gte: session.startDate,
              lte: session.endDate
            }
          }
        })
      ]);

      const liveSummary = calculateReconciliationSummary(invoices, sales);
      const hasDrift = 
        Number(liveSummary.supplier.baseTotal) !== Number(session.supplierTotal) ||
        Number(liveSummary.buyer.baseTotal) !== Number(session.buyerTotal) ||
        liveSummary.supplier.activeCount !== session.supplierInvoiceCount ||
        liveSummary.buyer.activeCount !== session.buyerInvoiceCount;

      if (hasDrift) {
        driftAlerts.push({
          id: session.id,
          title: session.title,
          savedDifference: Number(session.difference),
          liveDifference: Number(liveSummary.difference),
          driftAmount: Math.abs(Number(liveSummary.difference) - Number(session.difference))
        });
      }
    }

    return {
      pendingIntakes: pendingIntakes.map(this.serializeIntake),
      pendingSettlements: pendingSettlements.map(this.serializeIntake),
      pendingBilling: pendingBilling.map(this.serializeTrack),
      driftAlerts
    };
  }

  // --- 6. CHARTS DOMAIN ---
  static async getChartsData() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    // Fetch 7-day counts
    const [intakes, sales, invoices] = await Promise.all([
      prisma.intakeTransaction.findMany({
        where: { entryDate: { gte: start, lte: end } },
        select: { entryDate: true, normalizedWeight: true }
      }),
      prisma.saleTransaction.findMany({
        where: { 
          isDeleted: false,
          entryDate: { gte: start, lte: end } 
        },
        select: { entryDate: true, finalAmount: true }
      }),
      prisma.supplierInvoice.findMany({
        where: { 
          status: { not: "SUPERSEDED" },
          entryDate: { gte: start, lte: end } 
        },
        select: { entryDate: true, finalPayableAmount: true }
      })
    ]);

    // Build day list
    const dailyMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      dailyMap[dateStr] = {
        date: dateStr,
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        intakeCount: 0,
        saleCount: 0,
        settlementValue: 0,
        saleValue: 0
      };
    }

    intakes.forEach(item => {
      const dStr = new Date(item.entryDate).toISOString().split("T")[0];
      if (dailyMap[dStr]) dailyMap[dStr].intakeCount += 1;
    });

    sales.forEach(item => {
      const dStr = new Date(item.entryDate).toISOString().split("T")[0];
      if (dailyMap[dStr]) {
        dailyMap[dStr].saleCount += 1;
        dailyMap[dStr].saleValue += Number(item.finalAmount);
      }
    });

    invoices.forEach(item => {
      const dStr = new Date(item.entryDate).toISOString().split("T")[0];
      if (dailyMap[dStr]) {
        dailyMap[dStr].settlementValue += Number(item.finalPayableAmount);
      }
    });

    // Top 5 moving products
    const productMovements = await prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: {
        normalizedWeight: true
      },
      orderBy: {
        _sum: {
          normalizedWeight: "desc"
        }
      },
      take: 5
    });

    const products = await prisma.product.findMany({
      where: { id: { in: productMovements.map(pm => pm.productId) } }
    });

    const formattedProductMovement = productMovements.map(pm => {
      const prod = products.find(p => p.id === pm.productId);
      return {
        productId: pm.productId,
        name: prod?.name || `Product ${pm.productId}`,
        weight: pm._sum.normalizedWeight ? Number(pm._sum.normalizedWeight) : 0
      };
    });

    // Ledger trends: last 5 sessions
    const sessions = await prisma.ledgerSession.findMany({
      take: 5,
      orderBy: { endDate: "desc" }
    });

    const ledgerHistory = sessions.reverse().map(s => ({
      id: s.id,
      title: s.title,
      difference: Number(s.difference),
      matched: Math.abs(Number(s.difference)) <= 1.00
    }));

    return {
      dailyActivity: Object.values(dailyMap),
      productMovement: formattedProductMovement,
      reconciliationTrend: ledgerHistory
    };
  }

  // --- CENTRAL BATCH RESOLVER ---
  static async getOverviewData() {
    // Resolving in a single round-trip Promise.all for high performance
    const [
      finance,
      inventory,
      ledger,
      activity,
      pending,
      charts
    ] = await Promise.all([
      this.getFinanceOverview(),
      this.getInventoryOverview(),
      this.getLedgerOverview(),
      this.getActivityOverview(),
      this.getPendingAttention(),
      this.getChartsData()
    ]);

    return {
      finance,
      inventory,
      ledger,
      activity,
      pending,
      charts
    };
  }

  // --- HELPERS ---
  static getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  static serializeIntake(intake) {
    return {
      id: intake.id,
      intakeNumber: intake.intakeNumber,
      entryDate: intake.entryDate,
      grossWeight: Number(intake.grossWeight),
      netWeight: intake.netWeight ? Number(intake.netWeight) : null,
      unit: intake.unit,
      status: intake.status,
      partyName: intake.party?.name || "Unknown Party",
      productName: intake.product?.name || "Unknown Product"
    };
  }

  static serializeTrack(track) {
    return {
      id: track.id,
      quantity: Number(track.quantity),
      buyingRate: track.buyingRate ? Number(track.buyingRate) : null,
      sellingRate: track.sellingRate ? Number(track.sellingRate) : null,
      notes: track.notes,
      buyerName: track.buyer?.name || "Unknown Buyer",
      productName: track.product?.name || "Unknown Product",
      createdAt: track.createdAt
    };
  }
}
