export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { PartyProfileService } from "@/modules/parties/services/PartyProfileService";
import PartyProfileClient from "./PartyProfileClient";
import { User } from "lucide-react";

export default async function PartyProfilePage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const profile = await PartyProfileService.getPartyProfile(params.id);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <User className="h-12 w-12 text-muted-foreground opacity-20" />
        <h1 className="text-xl font-bold text-muted-foreground">Party not found</h1>
        <Link href="/parties" className="text-primary hover:underline">Back to Parties</Link>
      </div>
    );
  }

  // Serialize for client transport
  const serialized = JSON.parse(JSON.stringify(profile));

  return <PartyProfileClient profile={serialized} />;
}
