export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SaleService } from "@/modules/sales/services/SaleService";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import { SalesTrackService } from "@/modules/sales/services/SalesTrackService";
import MappingForm from "../MappingForm";

export default async function CreateMappingPage() {
  const [sales, intakes, parties, products, tracks] = await Promise.all([
    SaleService.listSales(),
    IntakeService.listIntakes(),
    PartyService.listParties(),
    ProductService.listProducts(),
    SalesTrackService.list()
  ]);

  const mappedIntakeIds = new Set(tracks.map(t => t.intakeTransactionId).filter(Boolean));
  const unmappedIntakes = intakes.filter(i => !mappedIntakeIds.has(i.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/source-tracking" 
          className="h-9 w-9 flex items-center justify-center rounded-full border bg-card hover:bg-muted transition-colors shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Mapping Entry</h1>
          <p className="text-muted-foreground text-sm">Add a new business record to the source tracking register.</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-8 shadow-sm">
        <MappingForm 
          sales={sales} 
          intakes={unmappedIntakes} 
          parties={parties} 
          products={products} 
        />
      </div>
    </div>
  );
}
