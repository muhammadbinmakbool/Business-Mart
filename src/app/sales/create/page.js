import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import SaleForm from "./SaleForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CreateSalePage({ searchParams: searchParamsPromise }) {
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/sales";

  const [parties, products] = await Promise.all([
    PartyService.listParties(),
    ProductService.listProducts()
  ]);

  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive);

  const { prisma } = await import("@/lib/prisma");
  const settingsRecord = await prisma.systemSetting.findUnique({
    where: { key: "adjustment_visibility" }
  });
  const settings = settingsRecord ? JSON.parse(settingsRecord.value) : { adjustmentVisibility: {} };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={backUrl}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Sale Invoice</h1>
          <p className="text-sm text-muted-foreground">Create a new billing record for a buyer.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <SaleForm buyers={buyers} products={activeProducts} settings={settings} backUrl={backUrl} />
      </div>
    </div>
  );
}
