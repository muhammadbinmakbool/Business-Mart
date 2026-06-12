import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReconciliationTable({ invoices = [], sales = [] }) {
  // Format currency helper
  const formatRs = (val) => {
    return Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const [mounted, setMounted] = React.useState(false);
  const [invPage, setInvPage] = React.useState(1);
  const [salePage, setSalePage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setInvPage(1);
  }, [invoices.length]);

  React.useEffect(() => {
    setSalePage(1);
  }, [sales.length]);

  const paginatedInvoices = React.useMemo(() => {
    return invoices.slice((invPage - 1) * pageSize, invPage * pageSize);
  }, [invoices, invPage]);

  const paginatedSales = React.useMemo(() => {
    return sales.slice((salePage - 1) * pageSize, salePage * pageSize);
  }, [sales, salePage]);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Supplier Settlements Side */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-base font-bold text-foreground">Supplier Settlements</h2>
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase">
            {invoices.length} Active Records
          </span>
        </div>
        
        <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 font-bold text-muted-foreground uppercase text-[9px] tracking-wider">
                  <th className="px-3 py-2">Invoice #</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2 text-right">Base Amount</th>
                  <th className="px-3 py-2 text-right">Total Adjustments</th>
                  <th className="px-3 py-2 text-right">Final Total</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground italic">
                      No supplier settlements in this selection.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono font-medium text-primary">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {inv.entryDate ? format(new Date(inv.entryDate), "dd MMM yy") : "-"}
                      </td>
                      <td className="px-3 py-2 font-medium truncate max-w-[120px]">
                        {inv.party?.name || "Unknown"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatRs(inv.totalGrossValue)}
                      </td>
                      <td className="px-3 py-2 text-right text-rose-600">
                        -{formatRs(inv.totalDeductions)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formatRs(inv.finalPayableAmount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.25 text-[8px] font-bold uppercase",
                          inv.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Link 
                          href={`/supplier-invoices/${inv.id}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="View Invoice details"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {invoices.length > pageSize && (
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2 text-xs">
              <span className="text-muted-foreground">
                Showing {Math.min(invoices.length, (invPage - 1) * pageSize + 1)}-{Math.min(invoices.length, invPage * pageSize)} of {invoices.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInvPage(prev => Math.max(1, prev - 1))}
                  disabled={invPage === 1}
                  className="px-2 py-1 rounded border bg-background hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="font-semibold">
                  {invPage} / {Math.ceil(invoices.length / pageSize)}
                </span>
                <button
                  onClick={() => setInvPage(prev => Math.min(Math.ceil(invoices.length / pageSize), prev + 1))}
                  disabled={invPage === Math.ceil(invoices.length / pageSize)}
                  className="px-2 py-1 rounded border bg-background hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buyer Billing Side */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-base font-bold text-foreground">Buyer Billing / Invoices</h2>
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase">
            {sales.length} Active Records
          </span>
        </div>
        
        <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 font-bold text-muted-foreground uppercase text-[9px] tracking-wider">
                  <th className="px-3 py-2">Sale #</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Buyer</th>
                  <th className="px-3 py-2 text-right">Base Amount</th>
                  <th className="px-3 py-2 text-right">Adjustments</th>
                  <th className="px-3 py-2 text-right">Final Total</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground italic">
                      No buyer billing in this selection.
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono font-medium text-primary">
                        {sale.saleNumber}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {sale.entryDate ? format(new Date(sale.entryDate), "dd MMM yy") : "-"}
                      </td>
                      <td className="px-3 py-2 font-medium truncate max-w-[120px]">
                        {sale.party?.name || "Unknown"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatRs(sale.baseAmount)}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-600">
                        {Number(sale.totalAdjustments) >= 0 ? "+" : ""}{formatRs(sale.totalAdjustments)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formatRs(sale.finalAmount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.25 text-[8px] font-bold uppercase",
                          sale.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Link 
                          href={`/sales/${sale.id}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="View Sale details"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {sales.length > pageSize && (
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2 text-xs">
              <span className="text-muted-foreground">
                Showing {Math.min(sales.length, (salePage - 1) * pageSize + 1)}-{Math.min(sales.length, salePage * pageSize)} of {sales.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSalePage(prev => Math.max(1, prev - 1))}
                  disabled={salePage === 1}
                  className="px-2 py-1 rounded border bg-background hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="font-semibold">
                  {salePage} / {Math.ceil(sales.length / pageSize)}
                </span>
                <button
                  onClick={() => setSalePage(prev => Math.min(Math.ceil(sales.length / pageSize), prev + 1))}
                  disabled={salePage === Math.ceil(sales.length / pageSize)}
                  className="px-2 py-1 rounded border bg-background hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
