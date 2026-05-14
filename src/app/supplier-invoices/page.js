export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus, Search, FileText, User, Calendar, CheckCircle2, AlertCircle, History } from "lucide-react";
import { listSupplierInvoicesAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default async function SupplierInvoicesPage() {
  const result = await listSupplierInvoicesAction();
  const invoices = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Settlements</h1>
          <p className="text-muted-foreground">Manage and track settlement invoices for suppliers.</p>
        </div>
        <Link
          href="/supplier-invoices/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Generate Settlement
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search by invoice #, supplier..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors">
                <th className="px-4 py-3 font-semibold">Invoice #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold text-right">Net Payable</th>
                <th className="px-4 py-3 font-semibold text-center">Version</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic">
                    No settlement invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className={cn(
                    "border-b hover:bg-muted/30 transition-colors",
                    invoice.status === "SUPERSEDED" && "opacity-60 bg-muted/10"
                  )}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono font-medium text-primary">{invoice.invoiceNumber}</span>
                        {invoice.isOutdated && invoice.status !== "SUPERSEDED" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                            <AlertCircle className="h-3 w-3" /> Outdated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(invoice.entryDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 font-medium">{invoice.party.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      Rs. {Number(invoice.finalPayableAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-[10px] font-bold">
                        V{invoice.version}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                        invoice.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        invoice.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link 
                        href={`/supplier-invoices/${invoice.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
