import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import IntakeForm from "./IntakeForm";

export default async function CreateIntakePage() {
  const [suppliers, products] = await Promise.all([
    PartyService.listParties(), // We'll filter for suppliers in the component or just show all
    ProductService.listProducts()
  ]);

  // Filter for parties that can be suppliers
  const activeSuppliers = suppliers.filter(p => p.isActive && (p.partyType === "SUPPLIER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/intake"
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Goods Intake</h1>
          <p className="text-sm text-muted-foreground">Log new arrival of goods from a supplier.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <IntakeForm suppliers={activeSuppliers} products={activeProducts} />
      </div>
    </div>
  );
}
