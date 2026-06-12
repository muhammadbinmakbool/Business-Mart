export const dynamic = "force-dynamic";

import React from "react";
import { getLedgerOverview } from "@/modules/aggregations/ledgerAggregator";
import { getDateRangeFromFilter } from "@/lib/dateFilters";
import LedgerClient from "./LedgerClient";

export default async function LedgerPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  
  const historyPage = parseInt(resolvedSearchParams.page) || 1;
  const historyLimit = parseInt(resolvedSearchParams.limit) || 50;

  // Live filters from URL parameters
  const supplierId = resolvedSearchParams.supplierId || "ALL";
  const buyerId = resolvedSearchParams.buyerId || "ALL";
  const preset = resolvedSearchParams.preset || "this_month";
  const startDate = resolvedSearchParams.startDate || "";
  const endDate = resolvedSearchParams.endDate || "";
  const month = resolvedSearchParams.month || "";

  const dateRange = getDateRangeFromFilter({ preset, startDate, endDate, month });

  const {
    suppliers,
    buyers,
    printConfig,
    settlementSettings,
    liveData,
    sessionsResult
  } = await getLedgerOverview({
    startDate: dateRange.startDate ? dateRange.startDate.toISOString() : "",
    endDate: dateRange.endDate ? dateRange.endDate.toISOString() : "",
    supplierId,
    buyerId,
    page: historyPage,
    limit: historyLimit
  });

  return (
    <LedgerClient
      initialInvoices={liveData.invoices}
      initialSales={liveData.sales}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
      buyers={JSON.parse(JSON.stringify(buyers))}
      initialSessions={sessionsResult.items}
      initialSessionsCount={sessionsResult.totalCount}
      initialPage={historyPage}
      initialLimit={historyLimit}
      printConfig={printConfig}
      settlementSettings={settlementSettings}
    />
  );
}
