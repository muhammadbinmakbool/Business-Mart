"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Eye, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";

export default function SalesListClient({ sales = [] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase();
      const matchNumber = sale.saleNumber?.toLowerCase().includes(query);
      const matchBuyer = sale.party?.name?.toLowerCase().includes(query);
      const matchProduct = sale.items?.some((item) =>
        item.product?.name?.toLowerCase().includes(query)
      );
      return matchNumber || matchBuyer || matchProduct;
    });
  }, [sales, searchQuery]);

  // Pre-calculate custom fields for sorting
  const mappedSales = useMemo(() => {
    return filteredSales.map((sale) => {
      const singleItem = sale.items?.length === 1 ? sale.items[0] : null;
      const rateVal = singleItem ? Number(singleItem.rate || 0) : 0;
      return {
        ...sale,
        buyerName: sale.party?.name || "",
        displayRate: rateVal,
      };
    });
  }, [filteredSales]);

  const {
    sortedData: sortedSales,
    sortField,
    sortDirection,
    requestSort,
  } = useTableSorting(mappedSales, "entryDate", "desc");

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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by sale #, buyer or product..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                <SortableHeader
                  field="saleNumber"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Sale #
                </SortableHeader>
                <SortableHeader
                  field="entryDate"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Date
                </SortableHeader>
                <SortableHeader
                  field="buyerName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Buyer
                </SortableHeader>
                <SortableHeader
                  field="totalWeight"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right"
                >
                  Gross Weight
                </SortableHeader>
                <SortableHeader
                  field="displayRate"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right"
                >
                  Rate (Rs.)
                </SortableHeader>
                <SortableHeader
                  field="finalAmount"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right"
                >
                  Final Amount
                </SortableHeader>
                <SortableHeader
                  field="status"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-center"
                >
                  Status
                </SortableHeader>
                <th className="px-4 py-3 font-semibold text-center select-none">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground italic">
                    No sale transactions found.
                  </td>
                </tr>
              ) : (
                sortedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3.5 font-mono font-medium text-primary flex items-center gap-2">
                      <ReceiptText className="h-3.5 w-3.5 opacity-40" />
                      {sale.saleNumber}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap opacity-80">
                      {format(new Date(sale.entryDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">{sale.buyerName}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                      {sale.totalWeight.toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">KG</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-muted-foreground">
                      {sale.items.length > 1 ? (
                        <span className="italic">Multiple</span>
                      ) : (
                        <>
                          Rs. {Number(sale.items[0]?.rate || 0).toLocaleString()}
                          <span className="text-[9px] opacity-60 ml-1 uppercase">
                            / {sale.items[0]?.rateUnit === "MAUND" ? "MND" : "KG"}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-base">
                      Rs. {sale.finalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                          sale.status === "PENDING"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : sale.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-rose-100 text-rose-700 border-rose-200"
                        )}
                      >
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
