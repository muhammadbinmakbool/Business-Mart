import React from "react";
import Link from "next/link";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSupplierInvoiceAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import InvoiceGenerator from "../../create/InvoiceGenerator";

export default async function EditSupplierInvoicePage({ params }) {
  const { id } = await params;
  const result = await getSupplierInvoiceAction(id);

  if (!result.success) {
    return redirect("/supplier-invoices");
  }

  const invoice = result.data;

  // Enforce "PENDING" status for editing
  if (invoice.status !== "PENDING") {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-6">
        <div className="h-20 w-20 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Cannot Edit Completed Settlement</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Invoice <span className="font-mono font-bold text-foreground">{invoice.invoiceNumber}</span> is currently marked as <span className="font-bold uppercase text-foreground">{invoice.status}</span>.
            Please revert it to <span className="font-bold uppercase text-foreground">PENDING</span> status on the details page before making any changes.
          </p>
        </div>
        <div className="pt-4 flex gap-4 justify-center">
          <Link 
            href={`/supplier-invoices/${invoice.id}`}
            className="inline-flex bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm"
          >
            Back to Details
          </Link>
        </div>
      </div>
    );
  }

  // Fetch active suppliers
  const suppliers = await prisma.party.findMany({
    where: {
      isActive: true,
      OR: [
        { partyType: "SUPPLIER" },
        { partyType: "BOTH" }
      ]
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link
          href={`/supplier-invoices/${invoice.id}`}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Settlement {invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">Adjust selected intakes, advances, and billing deductions.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <InvoiceGenerator 
          suppliers={JSON.parse(JSON.stringify(suppliers))} 
          initialInvoice={invoice} 
        />
      </div>
    </div>
  );
}
