import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import { getFeatureFlags } from "@/lib/settings/featureFlags";
import SalesWorkbenchClient from "./SalesWorkbenchClient";

export const dynamic = "force-dynamic";

export default async function SalesWorkbenchPage() {
  const [flags, parties, products] = await Promise.all([
    getFeatureFlags(),
    PartyService.listParties(),
    ProductService.listProducts()
  ]);

  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <SalesWorkbenchClient 
        buyers={buyers} 
        products={activeProducts} 
        flags={flags} 
      />
    </div>
  );
}
