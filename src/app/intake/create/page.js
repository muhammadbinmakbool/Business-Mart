import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import { prisma } from "@/lib/prisma";
import IntakeForm from "./IntakeForm";

export const dynamic = "force-dynamic";

export default async function CreateIntakePage({ searchParams: searchParamsPromise }) {
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/intake";

  const [suppliers, products] = await Promise.all([
    PartyService.listParties(), // We'll filter for suppliers in the component or just show all
    ProductService.listProducts()
  ]);

  // Filter for parties that can be suppliers
  const activeSuppliers = suppliers.filter(p => p.isActive && (p.partyType === "SUPPLIER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive);

  const settingsRecord = await prisma.systemSetting.findUnique({
    where: { key: "adjustment_visibility" }
  });
  const settings = settingsRecord ? JSON.parse(settingsRecord.value) : {};

  const { getFeatureFlags } = await import("@/lib/settings/featureFlags");
  const flags = await getFeatureFlags();

  // Fetch active adjustments from DB
  const { AdjustmentService } = await import("@/modules/adjustments/services/AdjustmentService");
  const dbAdjustments = await AdjustmentService.listActiveAdjustments();
  
  // Filter supplier adjustments and check feature flags
  let activeSupplierAdjustments = dbAdjustments.filter(
    adj => adj.applicableTo === "SUPPLIER" || adj.applicableTo === "BOTH"
  );
  
  if (!flags.features?.gst) {
    activeSupplierAdjustments = activeSupplierAdjustments.filter(adj => adj.code !== "GST");
  }
  if (!flags.features?.discount) {
    activeSupplierAdjustments = activeSupplierAdjustments.filter(adj => adj.code !== "DISCOUNT");
  }

  return (
    <IntakeForm 
      suppliers={activeSuppliers} 
      products={activeProducts} 
      settings={settings} 
      backUrl={backUrl} 
      featureFlags={flags} 
      adjustmentDefinitions={activeSupplierAdjustments}
    />
  );
}

