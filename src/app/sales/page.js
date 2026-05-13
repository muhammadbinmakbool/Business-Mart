export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus, Search, Eye, ReceiptText } from "lucide-react";
import { SaleService } from "@/modules/sales/services/SaleService";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default async function SalesPage() {
  const sales = await SaleService.listSales();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales / Billing</h1>
          <p className="text-muted-foreground">Manage buyer invoices and marketplace billing.</p>
        </div>
        <Link
          href="/sales/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Sale
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search by sale #, buyer or product..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                <th className="px-4 py-4">Sale #</th>
                <th className="px-4 py-4">Date</th>
                <th className="px-4 py-4">Buyer</th>
                <th className="px-4 py-4 text-right">Weight</th>
                <th className="px-4 py-4 text-right">Final Amount</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic">
                    No sale transactions found.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3.5 font-mono font-medium text-primary flex items-center gap-2">
                      <ReceiptText className="h-3.5 w-3.5 opacity-40" />
                      {sale.saleNumber}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap opacity-80">
                      {format(new Date(sale.entryDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">{sale.party.name}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                      {sale.totalWeight.toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">KG</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-base">
                      Rs. {sale.finalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                        sale.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        sale.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        "bg-rose-100 text-rose-700 border-rose-200"
                      )}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Link 
                        href={`/sales/${sale.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                      >
                        <Eye className="h-4 w-4" />
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
