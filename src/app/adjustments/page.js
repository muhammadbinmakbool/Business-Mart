export const dynamic = "force-dynamic";

import React from "react";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdjustmentService } from "@/modules/adjustments/services/AdjustmentService";
import AdjustmentsListClient from "./AdjustmentsListClient";

export default async function AdjustmentsPage({ searchParams }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page) || 1;
  const limit = parseInt(resolvedSearchParams.limit) || 50;
  const search = resolvedSearchParams.search || "";
  const applicableTo = resolvedSearchParams.applicableTo || "ALL";

  const { items: adjustments, totalCount } = await AdjustmentService.listAdjustmentsPaginated({
    page,
    limit,
    searchQuery: search,
    applicableTo,
    sortField: "displayOrder",
    sortDirection: "asc"
  });

  return (
    <AdjustmentsListClient
      adjustments={adjustments}
      totalCount={totalCount}
      currentPage={page}
      currentLimit={limit}
      currentSearch={search}
      currentApplicableTo={applicableTo}
    />
  );
}
