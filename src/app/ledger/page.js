export const dynamic = "force-dynamic";

import React from "react";
import { getLedgerOverview } from "@/modules/aggregations/ledgerAggregator";
import { getDateRangeFromFilter } from "@/lib/dateFilters";
import LedgerClient from "./LedgerClient";

export default async function LedgerPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  
  const historyPage = parseInt(resolvedSearchParams.page) || 1;
  const historyLimit = parseInt(resolvedSearchParams.limit) || 50;

  // Live filters and pagination from URL parameters
  const supplierId = resolvedSearchParams.supplierId || "ALL";
  const buyerId = resolvedSearchParams.buyerId || "ALL";
  const preset = resolvedSearchParams.preset || "this_month";
  const startDate = resolvedSearchParams.startDate || "";
  const endDate = resolvedSearchParams.endDate || "";
  const month = resolvedSearchParams.month || "";
  const searchQuery = resolvedSearchParams.search || "";
  const invPage = parseInt(resolvedSearchParams.invPage) || 1;
  const salePage = parseInt(resolvedSearchParams.salePage) || 1;
  const limit = parseInt(resolvedSearchParams.limit) || 50;

  const dateRange = getDateRangeFromFilter({ preset, startDate, endDate, month });

  const {
    suppliers,
    buyers,
    printConfig,
    settlementSettings,
    liveData,
    sessionsResult
  } = await getLedgerOverview({
    startDate: dateRange.start ? dateRange.start.toISOString() : "",
    endDate: dateRange.end ? dateRange.end.toISOString() : "",
    supplierId,
    buyerId,
    invPage,
    invLimit: limit,
    salePage,
    saleLimit: limit,
    searchQuery,
    page: historyPage,
    limit: historyLimit
  });

  return (
    <LedgerClient
      initialInvoices={liveData.invoices}
      initialInvoicesCount={liveData.invoicesCount}
      initialSales={liveData.sales}
      initialSalesCount={liveData.salesCount}
      initialSummary={liveData.summary}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
      buyers={JSON.parse(JSON.stringify(buyers))}
      initialSessions={sessionsResult.items}
      initialSessionsCount={sessionsResult.totalCount}
      initialPage={historyPage}
      initialLimit={historyLimit}
      initialInvPage={invPage}
      initialSalePage={salePage}
      initialLiveLimit={limit}
      initialSearchQuery={searchQuery}
      printConfig={printConfig}
      settlementSettings={settlementSettings}
    />
  );
}
