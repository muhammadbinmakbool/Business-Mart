import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import PosBillingClient from "./PosBillingClient";
import { getFeatureFlags } from "@/lib/settings/featureFlags";
import { ADJUSTMENT_TYPES_BUYER } from "@/lib/constants";
import { getVisibleAdjustments } from "@/lib/settings/adjustmentsVisibility";
import { getPrintSettingsAction, getGeneralSettingsAction } from "@/modules/settings/controllers/settingsActions";
import { getMergedDocumentConfig } from "@/print/config/documentConfig";

export const dynamic = "force-dynamic";

export default async function PosSalesPage() {
  const [flags, parties, products] = await Promise.all([
    getFeatureFlags(),
    PartyService.listParties(),
    ProductService.listProducts()
  ]);

  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive);

  // Fetch adjustments visibility settings
  const { prisma } = await import("@/lib/prisma");
  const settingsRecord = await prisma.systemSetting.findUnique({
    where: { key: "adjustment_visibility" }
  });
  const settings = settingsRecord ? JSON.parse(settingsRecord.value) : { adjustmentVisibility: {} };

  // Filter adjustment types dynamically based on feature flags
  const allowedAdjustments = [
    ...ADJUSTMENT_TYPES_BUYER.filter(type => type !== "GST" && type !== "Discount"),
    ...(flags.features?.gst ? ["GST"] : []),
    ...(flags.features?.discount ? ["Discount"] : [])
  ];
  const visibleAdjustmentTypes = getVisibleAdjustments(allowedAdjustments, settings);

  const [printSettingsRes, generalSettingsRes] = await Promise.all([
    getPrintSettingsAction(),
    getGeneralSettingsAction()
  ]);
  const printConfig = getMergedDocumentConfig(
    printSettingsRes?.success ? printSettingsRes.settings : {},
    generalSettingsRes?.success ? generalSettingsRes.settings : {}
  );

  return (
    <PosBillingClient 
      buyers={buyers} 
      products={activeProducts} 
      visibleAdjustmentTypes={visibleAdjustmentTypes}
      printConfig={printConfig}
    />
  );
}
