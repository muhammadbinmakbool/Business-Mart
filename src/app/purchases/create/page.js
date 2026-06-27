import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import PurchaseCreateClient from "./PurchaseCreateClient";

export const dynamic = "force-dynamic";

export default async function CreatePurchasePage({ searchParams: searchParamsPromise }) {
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/supplier-invoices";

  const [parties, products] = await Promise.all([
    PartyService.listParties(),
    ProductService.listProducts(),
  ]);

  const activeSuppliers = parties.filter(
    (p) => p.isActive && (p.partyType === "SUPPLIER" || p.partyType === "BOTH")
  );
  const activeProducts = products.filter((p) => p.isActive);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link
          href={backUrl}
          className="rounded-xl p-2.5 hover:bg-accent border border-border/40 shadow-sm transition-colors bg-card"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Purchase Invoice</h1>
          <p className="text-sm text-muted-foreground">
            Record a new purchase transaction with suppliers.
          </p>
        </div>
      </div>

      <PurchaseCreateClient
        suppliers={activeSuppliers}
        products={activeProducts}
        backUrl={backUrl}
      />
    </div>
  );
}
