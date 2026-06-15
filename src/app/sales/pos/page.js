import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import PosBillingClient from "./PosBillingClient";
import { getPrintSettingsAction, getGeneralSettingsAction } from "@/modules/settings/controllers/settingsActions";
import { getMergedDocumentConfig } from "@/print/config/documentConfig";

export const dynamic = "force-dynamic";

export default async function PosSalesPage() {
  const [parties, products, printSettingsRes, generalSettingsRes] = await Promise.all([
    PartyService.listParties(),
    ProductService.listProducts(),
    getPrintSettingsAction(),
    getGeneralSettingsAction()
  ]);

  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive);

  const { prisma } = await import("@/lib/prisma");
  const settingsRecord = await prisma.systemSetting.findUnique({
    where: { key: "adjustment_visibility" }
  });
  const settings = settingsRecord ? JSON.parse(settingsRecord.value) : { adjustmentVisibility: {} };

  const printConfig = getMergedDocumentConfig(
    printSettingsRes?.success ? printSettingsRes.settings : {},
    generalSettingsRes?.success ? generalSettingsRes.settings : {}
  );

  return (
    <PosBillingClient 
      buyers={buyers} 
      products={activeProducts} 
      settings={settings}
      printConfig={printConfig}
    />
  );
}
