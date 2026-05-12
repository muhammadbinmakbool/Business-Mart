import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import EditPartyForm from "./EditPartyForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditPartyPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const party = await PartyService.getParty(params.id);

  if (!party) {
    return <div className="p-8 text-center">Party not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/parties"
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Party</h1>
          <p className="text-sm text-muted-foreground">Update supplier or buyer details.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <EditPartyForm party={party} />
      </div>
    </div>
  );
}
