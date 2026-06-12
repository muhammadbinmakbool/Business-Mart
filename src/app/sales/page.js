export const dynamic = "force-dynamic";

import React from "react";
import { SaleService } from "@/modules/sales/services/SaleService";
import SalesListClient from "./SalesListClient";
import { getDateRangeFromFilter } from "@/lib/dateFilters";

export default async function SalesPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  const page = parseInt(resolvedSearchParams.page) || 1;
  const limit = parseInt(resolvedSearchParams.limit) || 50;
  const search = resolvedSearchParams.search || "";
  const tab = resolvedSearchParams.tab || "ALL";
  const preset = resolvedSearchParams.preset || "all";
  const startDate = resolvedSearchParams.startDate || "";
  const endDate = resolvedSearchParams.endDate || "";
  const month = resolvedSearchParams.month || "";
  const sortField = resolvedSearchParams.sortField || "entryDate";
  const sortDirection = resolvedSearchParams.sortDirection || "desc";

  const dateRange = getDateRangeFromFilter({ preset, startDate, endDate, month });

  const { items: sales, totalCount, tabCounts } = await SaleService.listSalesPaginated({
    page,
    limit,
    searchQuery: search,
    status: tab,
    dateRange,
    sortField,
    sortDirection
  });

  return (
    <SalesListClient
      sales={sales}
      totalCount={totalCount}
      tabCounts={tabCounts}
      currentPage={page}
      currentLimit={limit}
      currentSearch={search}
      currentTab={tab}
      currentPreset={preset}
      currentStartDate={startDate}
      currentEndDate={endDate}
      currentMonth={month}
      currentSortField={sortField}
      currentSortDirection={sortDirection}
    />
  );
}

