export const dynamic = "force-dynamic";

import React from "react";
import { MarketInsightService } from "@/modules/market-insight/services/MarketInsightService";
import { ProductService } from "@/modules/products/services/ProductService";
import MarketInsightDashboardClient from "./MarketInsightDashboardClient";

export default async function MarketInsightDashboardPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const period = searchParams.period || "30d";
  const productId = searchParams.productId ? parseInt(searchParams.productId) : null;
  const auditFilter = searchParams.auditFilter || "ACTIVE"; // ACTIVE, ARCHIVED, ALL

  const products = await ProductService.listProducts();
  const activeRates = await MarketInsightService.listRates("ACTIVE");
  const archivedRates = await MarketInsightService.listRates("ARCHIVED");
  const allRates = await MarketInsightService.listRates("ALL");
  const analyticsData = await MarketInsightService.getAnalytics(period, productId);

  return (
    <MarketInsightDashboardClient
      products={products}
      activeRates={activeRates}
      archivedRates={archivedRates}
      allRates={allRates}
      analyticsData={analyticsData}
      currentPeriod={period}
      currentProductId={productId}
      currentAuditFilter={auditFilter}
    />
  );
}
