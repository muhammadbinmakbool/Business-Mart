import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/modules/ledger/services/LedgerService";
import { getPrintSettingsAction, getGeneralSettingsAction, getSettlementLedgerSettingsAction } from "@/modules/settings/controllers/settingsActions";
import { getMergedDocumentConfig } from "@/print/config/documentConfig";
import { getCached, setCached } from "./cache";

/**
 * Domain Aggregator: Ledger
 * Gathers and caches live reconciliation metrics, session logs, print configurations,
 * and list of active suppliers/buyers in a single execution.
 */
export async function getLedgerOverview({ 
  startDate = "", 
  endDate = "", 
  supplierId = "ALL", 
  buyerId = "ALL",
  invPage = 1,
  invLimit = 50,
  salePage = 1,
  saleLimit = 50,
  searchQuery = "",
  page = 1,
  limit = 50 
} = {}) {
  // Construct dynamic cache keys based on filters to support different queries
  const liveDataKey = `live_${startDate}_${endDate}_${supplierId}_${buyerId}_${invPage}_${salePage}_${invLimit}_${saleLimit}_${searchQuery}`;
  const sessionsKey = `sessions_${page}_${limit}`;
  const staticDataKey = "static_ledger_setup";

  // Check cache for setup configurations and parties (expires in 60s)
  let staticData = getCached("ledger", staticDataKey);
  if (!staticData) {
    const [parties, printRes, generalRes, settlementRes] = await Promise.all([
      prisma.party.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" }
      }),
      getPrintSettingsAction(),
      getGeneralSettingsAction(),
      getSettlementLedgerSettingsAction()
    ]);

    const suppliers = parties.filter(p => p.partyType === "SUPPLIER" || p.partyType === "BOTH");
    const buyers = parties.filter(p => p.partyType === "BUYER" || p.partyType === "BOTH");
    const printConfig = getMergedDocumentConfig(
      printRes?.success ? printRes.settings : {},
      generalRes?.success ? generalRes.settings : {}
    );
    const settlementSettings = settlementRes?.success ? settlementRes.settings : {};

    staticData = { suppliers, buyers, printConfig, settlementSettings };
    setCached("ledger", staticDataKey, staticData, 60 * 1000);
  }

  // Check cache for live reconciliation data
  let liveData = getCached("ledger", liveDataKey);
  if (!liveData) {
    const [invoicesResult, salesResult, summary] = await Promise.all([
      LedgerService.getLiveInvoices({
        startDate,
        endDate,
        supplierId,
        buyerId,
        searchQuery,
        page: invPage,
        limit: invLimit
      }),
      LedgerService.getLiveSales({
        startDate,
        endDate,
        supplierId,
        buyerId,
        searchQuery,
        page: salePage,
        limit: saleLimit
      }),
      LedgerService.getLiveReconciliationSummary({
        startDate,
        endDate,
        supplierId,
        buyerId
      })
    ]);

    liveData = {
      invoices: invoicesResult.items,
      invoicesCount: invoicesResult.totalCount,
      sales: salesResult.items,
      salesCount: salesResult.totalCount,
      summary
    };
    setCached("ledger", liveDataKey, liveData, 30 * 1000);
  }

  // Check cache for saved session history logs
  let sessionsResult = getCached("ledger", sessionsKey);
  if (!sessionsResult) {
    sessionsResult = await LedgerService.listSessionsPaginated({ page, limit });
    setCached("ledger", sessionsKey, sessionsResult, 30 * 1000);
  }

  return {
    ...staticData,
    liveData,
    sessionsResult
  };
}
