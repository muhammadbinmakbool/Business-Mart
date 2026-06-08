export const dynamic = "force-dynamic";

import React from "react";
import { MarketInsightService } from "@/modules/market-insight/services/MarketInsightService";
import { ProductService } from "@/modules/products/services/ProductService";
import { prisma } from "@/lib/prisma";
import MarketInsightDashboardClient from "./MarketInsightDashboardClient";

export default async function MarketInsightDashboardPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const period = searchParams.period || "30d";
  const productIdParam = searchParams.productId;
  const auditFilter = searchParams.auditFilter || "ACTIVE"; // ACTIVE, ARCHIVED, ALL

  let productId = null;
  if (productIdParam === "all") {
    productId = null;
  } else if (productIdParam) {
    productId = parseInt(productIdParam);
  } else {
    // Check default preferences from settings
    const settingsRecord = await prisma.systemSetting.findUnique({
      where: { key: "adjustment_visibility" }
    });
    const settings = settingsRecord ? JSON.parse(settingsRecord.value) : {};
    const defaults = settings?.defaults || {};
    const defaultProductVal = defaults.activeMarketProductId || defaults.productId || null;
    if (defaultProductVal) {
      productId = parseInt(defaultProductVal);
    }
  }

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

