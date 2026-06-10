import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PartyService } from "@/modules/parties/services/PartyService";
import AdvanceForm from "./AdvanceForm";

export const dynamic = "force-dynamic";

export default async function CreateAdvancePage({ searchParams: searchParamsPromise }) {
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/advances";
  const parties = await PartyService.listParties();
  const suppliers = parties.filter(p => p.isActive && (p.partyType === "SUPPLIER" || p.partyType === "BOTH"));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={backUrl}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Advance Payment</h1>
          <p className="text-sm text-muted-foreground">Log a standalone payment made to a supplier.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <AdvanceForm suppliers={suppliers} backUrl={backUrl} />
      </div>
    </div>
  );
}
