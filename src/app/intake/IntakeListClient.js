"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Eye, ShoppingBag, BadgeCheck, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";

export default function IntakeListClient({ intakes = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  // Filter logic: Filter by tab first, then search query
  const filteredIntakes = intakes.filter((intake) => {
    // 1. Status Filter
    if (activeTab !== "ALL" && intake.status !== activeTab) {
      return false;
    }

    // 2. Search Query Filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchNumber = intake.intakeNumber?.toLowerCase().includes(query);
      const matchSupplier = intake.party?.name?.toLowerCase().includes(query);
      const matchProduct = intake.product?.name?.toLowerCase().includes(query);
      return matchNumber || matchSupplier || matchProduct;
    }

    return true;
  });

  // Pre-calculate initialTotal for sorting and rendering
  const mappedIntakes = useMemo(() => {
    return filteredIntakes.map(intake => ({
      ...intake,
      initialTotal: Number(intake.netWeight || intake.grossWeight || 0) * Number(intake.rate || 0)
    }));
  }, [filteredIntakes]);

  const { sortedData: sortedIntakes, sortField, sortDirection, requestSort } = useTableSorting(mappedIntakes, "entryDate", "desc");

  // Calculate dynamic tab counts
  const tabs = [
    { key: "ALL", label: "All", count: intakes.length },
    { key: "PENDING", label: "Pending", count: intakes.filter(i => i.status === "PENDING").length },
    { key: "SOLD", label: "Sold", count: intakes.filter(i => i.status === "SOLD").length },
    { key: "CLEARED", label: "Cleared", count: intakes.filter(i => i.status === "CLEARED").length },
    { key: "CANCELLED", label: "Cancelled", count: intakes.filter(i => i.status === "CANCELLED").length },
  ];

  const showSoldColumns = activeTab === "SOLD" || activeTab === "CLEARED";

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by intake #, supplier or product..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Reusable Tab Filtering Buttons */}
      <StatusFilterTabs 
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={tabs}
      />

      {/* Table Section */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                <SortableHeader field="intakeNumber" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort}>Intake #</SortableHeader>
                <SortableHeader field="entryDate" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort}>Date</SortableHeader>
                <SortableHeader field="party.name" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort}>Supplier</SortableHeader>
                <SortableHeader field="product.name" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort}>Product</SortableHeader>
                <SortableHeader field="bagCount" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort} className="text-right">Bags</SortableHeader>
                <SortableHeader field="grossWeight" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort} className="text-right">Gross Weight</SortableHeader>
                {showSoldColumns && (
                  <>
                    <SortableHeader field="rate" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort} className="text-right">Rate</SortableHeader>
                    <th className="px-4 py-3 font-semibold text-right select-none">Bardana</th>
                    <th className="px-4 py-3 font-semibold text-right select-none">Khot</th>
                    <SortableHeader field="netWeight" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort} className="text-right">Net Weight</SortableHeader>
                    <SortableHeader field="initialTotal" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort} className="text-right">Initial Total</SortableHeader>
                  </>
                )}
                <SortableHeader field="status" currentSortField={sortField} currentSortDirection={sortDirection} onRequestSort={requestSort} className="text-center">Status</SortableHeader>
                <th className="px-4 py-3 font-semibold text-center select-none">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedIntakes.length === 0 ? (
                <tr>
                  <td colSpan={showSoldColumns ? 13 : 8} className="px-4 py-12 text-center text-muted-foreground italic">
                    No matching intake transactions found.
                  </td>
                </tr>
              ) : (
                sortedIntakes.map((intake) => (
                  <tr key={intake.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-primary">{intake.intakeNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(intake.entryDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 font-medium">{intake.party.name}</td>
                    <td className="px-4 py-3">{intake.product.name}</td>
                    <td className="px-4 py-3 text-right">{intake.bagCount || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(intake.grossWeight).toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">{intake.unit === "MAUND" ? "MND" : intake.unit}</span>
                    </td>
                    {showSoldColumns && (
                      <>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          Rs. {Number(intake.rate || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">/{intake.unit === "MAUND" ? "MND" : "KG"}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                          {intake.Bardana !== null ? `${Number(intake.Bardana).toLocaleString()} KG` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                          {intake.Khot !== null ? `${Number(intake.Khot).toLocaleString()} KG` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                          {intake.netWeight !== null ? (
                            <>
                              {Number(intake.netWeight).toLocaleString()} <span className="text-[10px] uppercase text-muted-foreground">{intake.unit === "MAUND" ? "MND" : intake.unit}</span>
                            </>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700 whitespace-nowrap">
                          Rs. {intake.initialTotal.toLocaleString()}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                        intake.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        intake.status === "SOLD" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        intake.status === "CLEARED" ? "bg-blue-100 text-blue-700 border-blue-200" :
                        "bg-rose-100 text-rose-700 border-rose-200"
                      )}>
                        {intake.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link 
                        href={`/intake/${intake.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground"
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
