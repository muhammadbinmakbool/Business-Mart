export const dynamic = "force-dynamic";

import React from "react";
import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/modules/ledger/services/LedgerService";
import LedgerClient from "./LedgerClient";

export default async function LedgerPage() {
  // Query active parties for filtering
  const [parties, liveData, sessionsResult] = await Promise.all([
    prisma.party.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    }),
    LedgerService.getLiveReconciliationData(),
    LedgerService.listSessions()
  ]);

  const suppliers = parties.filter(p => p.partyType === "SUPPLIER" || p.partyType === "BOTH");
  const buyers = parties.filter(p => p.partyType === "BUYER" || p.partyType === "BOTH");

  return (
    <LedgerClient
      initialInvoices={liveData.invoices}
      initialSales={liveData.sales}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
      buyers={JSON.parse(JSON.stringify(buyers))}
      initialSessions={sessionsResult}
    />
  );
}
