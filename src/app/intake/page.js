export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import IntakeListClient from "./IntakeListClient";
import { getDateRangeFromFilter } from "@/lib/dateFilters";

export default async function IntakePage({ searchParams }) {
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

  const { items: intakes, totalCount, tabCounts } = await IntakeService.listIntakesPaginated({
    page,
    limit,
    searchQuery: search,
    status: tab,
    dateRange,
    sortField,
    sortDirection
  });

  const { getFeatureFlags } = await import("@/lib/settings/featureFlags");
  const flags = await getFeatureFlags();

  return (
    <IntakeListClient
      intakes={intakes}
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
      featureFlags={flags}
    />
  );
}

