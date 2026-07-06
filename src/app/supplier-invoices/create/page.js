import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSupplierSettlementSetup } from "@/modules/aggregations/supplierAggregator";
import InvoiceGenerator from "./InvoiceGenerator";
import { getFeatureFlags } from "@/lib/settings/featureFlags";
import { ADJUSTMENT_TYPES_SUPPLIER } from "@/lib/constants";
import { getVisibleAdjustments } from "@/lib/settings/adjustmentsVisibility";

export const dynamic = "force-dynamic";

export default async function CreateSupplierInvoicePage({ searchParams: searchParamsPromise }) {
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/supplier-invoices";

  const [flags, setupData] = await Promise.all([
    getFeatureFlags(),
    getSupplierSettlementSetup()
  ]);

  const { suppliers, settings } = setupData;

  // Fetch active adjustments from DB
  const { AdjustmentService } = await import("@/modules/adjustments/services/AdjustmentService");
  const dbAdjustments = await AdjustmentService.listActiveAdjustments();
  
  // Filter supplier adjustments
  const activeSupplierAdjustments = dbAdjustments.filter(
    adj => adj.applicableTo === "SUPPLIER" || adj.applicableTo === "BOTH"
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link
          href={backUrl}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Settlement</h1>
          <p className="text-sm text-muted-foreground">Create a financial snapshot for supplier settlement.</p>
        </div>
      </div>

      <InvoiceGenerator 
        suppliers={suppliers} 
        adjustmentDefinitions={activeSupplierAdjustments} 
        backUrl={backUrl} 
      />
    </div>
  );
}
