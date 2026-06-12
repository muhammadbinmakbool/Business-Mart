export const dynamic = "force-dynamic";

import React from "react";
import { listSupplierInvoicesPaginatedAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import SupplierInvoiceListClient from "./SupplierInvoiceListClient";
import { getDateRangeFromFilter } from "@/lib/dateFilters";

export default async function SupplierInvoicesPage({ searchParams }) {
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

  const result = await listSupplierInvoicesPaginatedAction({
    page,
    limit,
    searchQuery: search,
    status: tab,
    dateRange,
    sortField,
    sortDirection
  });

  const { items: invoices, totalCount, tabCounts } = result.success ? result.data : {
    items: [],
    totalCount: 0,
    tabCounts: { all: 0, pending: 0, partial: 0, cleared: 0, superseded: 0 }
  };

  return (
    <SupplierInvoiceListClient
      invoices={invoices}
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

