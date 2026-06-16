import React from "react";
import { SaleService } from "@/modules/sales/services/SaleService";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import SaleForm from "../../create/SaleForm";
import RevertStatusButton from "../RevertStatusButton";
import Link from "next/link";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { getFeatureFlags } from "@/lib/settings/featureFlags";

export default async function EditSalePage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const [flags, sale, parties, products] = await Promise.all([
    getFeatureFlags(),
    SaleService.getSale(params.id),
    PartyService.listParties(),
    ProductService.listProducts()
  ]);

  if (!sale) {
    return redirect("/sales");
  }

  // Enforce "PENDING" status for editing
  if (sale.status !== "PENDING") {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-6">
        <div className="h-20 w-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Cannot Edit Completed Invoice</h1>
          <p className="text-muted-foreground leading-relaxed">
            Invoice <span className="font-mono font-bold text-foreground">{sale.saleNumber}</span> is currently marked as <span className="font-bold uppercase">{sale.status}</span>.
            Please revert it to <span className="font-bold uppercase">PENDING</span> status before making any changes.
          </p>
          <div className="pt-2">
            <RevertStatusButton id={sale.id} />
          </div>
        </div>
        <Link 
          href={`/sales/${sale.id}`}
          className="inline-flex bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          Back to Details
        </Link>
      </div>
    );
  }

  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive);

  // Fetch active adjustments from DB
  const { AdjustmentService } = await import("@/modules/adjustments/services/AdjustmentService");
  const dbAdjustments = await AdjustmentService.listActiveAdjustments();
  
  // Filter buyer adjustments and check feature flags
  let activeBuyerAdjustments = dbAdjustments.filter(
    adj => adj.applicableTo === "BUYER" || adj.applicableTo === "BOTH"
  );
  
  if (!flags.features?.gst) {
    activeBuyerAdjustments = activeBuyerAdjustments.filter(adj => adj.code !== "GST");
  }
  if (!flags.features?.discount) {
    activeBuyerAdjustments = activeBuyerAdjustments.filter(adj => adj.code !== "DISCOUNT");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link
          href={`/sales/${sale.id}`}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Invoice {sale.saleNumber}</h1>
          <p className="text-sm text-muted-foreground">Modify products, rates, or billing adjustments.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <SaleForm 
          buyers={buyers} 
          products={activeProducts} 
          initialData={sale} 
          adjustmentDefinitions={activeBuyerAdjustments} 
        />
      </div>
    </div>
  );
}
