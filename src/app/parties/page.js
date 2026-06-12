export const dynamic = "force-dynamic";

import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import PartyListClient from "./PartyListClient";

export default async function PartiesPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  const page = parseInt(resolvedSearchParams.page) || 1;
  const limit = parseInt(resolvedSearchParams.limit) || 50;
  const search = resolvedSearchParams.search || "";
  const tab = resolvedSearchParams.tab || "ALL";
  const sortField = resolvedSearchParams.sortField || "name";
  const sortDirection = resolvedSearchParams.sortDirection || "asc";

  const { items: parties, totalCount, tabCounts } = await PartyService.listPartiesPaginated({
    page,
    limit,
    searchQuery: search,
    status: tab,
    sortField,
    sortDirection
  });

  return (
    <PartyListClient
      parties={parties}
      totalCount={totalCount}
      tabCounts={tabCounts}
      currentPage={page}
      currentLimit={limit}
      currentSearch={search}
      currentTab={tab}
      currentSortField={sortField}
      currentSortDirection={sortDirection}
    />
  );
}

