export const dynamic = "force-dynamic";

import React from "react";
import { SalesTrackService } from "@/modules/sales/services/SalesTrackService";
import SourceTrackingListClient from "./SourceTrackingListClient";

export default async function SourceTrackingPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  const page = parseInt(resolvedSearchParams.page) || 1;
  const limit = parseInt(resolvedSearchParams.limit) || 50;
  const search = resolvedSearchParams.search || "";
  const preset = resolvedSearchParams.preset || "all";
  const startDate = resolvedSearchParams.startDate || "";
  const endDate = resolvedSearchParams.endDate || "";
  const month = resolvedSearchParams.month || "";
  const sortField = resolvedSearchParams.sortField || "createdAt";
  const sortDirection = resolvedSearchParams.sortDirection || "desc";

  const { items: tracks, totalCount } = await SalesTrackService.listPaginated({
    page,
    limit,
    searchQuery: search,
    preset,
    startDate,
    endDate,
    month,
    sortField,
    sortDirection
  });

  return (
    <SourceTrackingListClient
      tracks={tracks}
      totalCount={totalCount}
      currentPage={page}
      currentLimit={limit}
      currentSearch={search}
      currentPreset={preset}
      currentStartDate={startDate}
      currentEndDate={endDate}
      currentMonth={month}
      currentSortField={sortField}
      currentSortDirection={sortDirection}
    />
  );
}
