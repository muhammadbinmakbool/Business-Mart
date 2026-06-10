import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import InvoiceGenerator from "./InvoiceGenerator";

export const dynamic = "force-dynamic";

export default async function CreateSupplierInvoicePage({ searchParams: searchParamsPromise }) {
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/supplier-invoices";

  // Query active suppliers (SUPPLIER or BOTH) with uninvoiced intakes whose status is SOLD
  const suppliers = await prisma.party.findMany({
    where: {
      isActive: true,
      OR: [
        { partyType: "SUPPLIER" },
        { partyType: "BOTH" }
      ],
      intakeTransactions: {
        some: {
          status: { in: ["SOLD", "PARTIAL"] },
          OR: [
            {
              invoiceItems: {
                none: {
                  invoice: {
                    status: {
                      not: "SUPERSEDED"
                    }
                  }
                }
              }
            },
            {
              salesTracks: {
                some: {
                  isSettled: false
                }
              }
            }
          ]
        }
      }
    },
    orderBy: { name: "asc" }
  });

  const settingsRecord = await prisma.systemSetting.findUnique({
    where: { key: "adjustment_visibility" }
  });
  const settings = settingsRecord ? JSON.parse(settingsRecord.value) : { adjustmentVisibility: {} };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link
          href={backUrl}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Settlement</h1>
          <p className="text-sm text-muted-foreground">Create a financial snapshot for supplier settlement.</p>
        </div>
      </div>

      <InvoiceGenerator suppliers={JSON.parse(JSON.stringify(suppliers))} settings={settings} backUrl={backUrl} />
    </div>
  );
}
