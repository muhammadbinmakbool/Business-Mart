import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import PosBillingClient from "./PosBillingClient";
import { getFeatureFlags } from "@/lib/settings/featureFlags";
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

  // Fetch active adjustments from DB
  const { AdjustmentService } = await import("@/modules/adjustments/services/AdjustmentService");
  const dbAdjustments = await AdjustmentService.listActiveAdjustments();
  
  // Filter buyer adjustments
  const activeBuyerAdjustments = dbAdjustments.filter(
    adj => adj.applicableTo === "BUYER" || adj.applicableTo === "BOTH"
  );

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
      adjustmentDefinitions={activeBuyerAdjustments}
      printConfig={printConfig}
    />
  );
}
