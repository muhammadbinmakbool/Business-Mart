"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Eye, ShoppingBag, BadgeCheck, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";
import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import { normalizeQuantity, getUnitLabel, UNIT_IDS, convertRate } from "@/lib/units";

export default function IntakeListClient({ intakes = [], defaultPreset = "all" }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [dateFilter, setDateFilter] = useState(() => getDefaultFilterState(defaultPreset));

  // 1. Date Range Filter
  const dateFilteredIntakes = useMemo(() => {
    return filterByDateRange(intakes, "entryDate", dateFilter);
  }, [intakes, dateFilter]);

  // 2. Tab & Search Filters
  const filteredIntakes = useMemo(() => {
    return dateFilteredIntakes.filter((intake) => {
      // Status Filter
      if (activeTab !== "ALL") {
        if (activeTab === "SOLD") {
          if (intake.status !== "SOLD" && intake.status !== "PARTIAL") return false;
        } else if (intake.status !== activeTab) {
          return false;
        }
      }

      // Search Query Filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchNumber = intake.intakeNumber?.toLowerCase().includes(query);
        const matchSupplier = intake.party?.name?.toLowerCase().includes(query);
        const matchProduct = intake.product?.name?.toLowerCase().includes(query);
        return matchNumber || matchSupplier || matchProduct;
      }

      return true;
    });
  }, [dateFilteredIntakes, activeTab, searchQuery]);

  // Pre-calculate initialTotal for sorting and rendering
  const mappedIntakes = useMemo(() => {
    return filteredIntakes.map(intake => {
      const hasTracks = intake.salesTracks && intake.salesTracks.length > 0;
      
      // Calculate dynamic netWeight, rate, and initialTotal if tracks exist
      let netWeight = intake.netWeight !== null ? Number(intake.netWeight) : null;
      let rate = intake.rate !== null ? Number(intake.rate) : 0;
      let initialTotal = 0;
      
      const distinctRates = hasTracks 
        ? Array.from(new Set(intake.salesTracks.map(t => Number(t.buyingRate || t.sellingRate || 0))))
        : [rate];
      const trackTotals = hasTracks
        ? intake.salesTracks.map(t => Number(t.baseAmount || 0))
        : [];

      let rateUnit = intake.rateUnit || "KG";
      if (intake.unit === "BAG" || intake.product?.primaryUnit === "BAG") {
        rateUnit = "BAG";
      } else if (hasTracks) {
        rateUnit = intake.salesTracks[0].rateUnit || "KG";
      }

      if (hasTracks) {
        const totalNetWeight = intake.salesTracks.reduce((sum, t) => sum + Number(t.netWeight || t.quantity || 0), 0);
        const totalBaseAmount = intake.salesTracks.reduce((sum, t) => sum + Number(t.baseAmount || 0), 0);
        const totalQuantity = intake.salesTracks.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
        
        netWeight = totalNetWeight;
        rate = totalQuantity > 0 ? (totalBaseAmount / totalQuantity) : rate;
        initialTotal = totalBaseAmount;
      } else {
        const rateInIntakeUnit = convertRate(rate, intake.rateUnit || "KG", intake.unit || "KG", intake.product);
        initialTotal = Number(netWeight || intake.grossWeight || 0) * rateInIntakeUnit;
      }

      return {
        ...intake,
        netWeight,
        rate,
        rateUnit,
        initialTotal,
        distinctRates,
        trackTotals
      };
    });
  }, [filteredIntakes]);

  const { sortedData: sortedIntakes, sortField, sortDirection, requestSort } = useTableSorting(mappedIntakes, "entryDate", "desc");

  // Calculate dynamic tab counts based on active date range
  const tabs = [
    { key: "ALL", label: "All", count: dateFilteredIntakes.length },
    { key: "PENDING", label: "Pending", count: dateFilteredIntakes.filter(i => i.status === "PENDING").length },
    { key: "SOLD", label: "Sold", count: dateFilteredIntakes.filter(i => i.status === "SOLD" || i.status === "PARTIAL").length },
    { key: "CLEARED", label: "Cleared", count: dateFilteredIntakes.filter(i => i.status === "CLEARED").length },
    { key: "CANCELLED", label: "Cancelled", count: dateFilteredIntakes.filter(i => i.status === "CANCELLED").length },
  ];

  const showSoldColumns = activeTab === "SOLD" || activeTab === "CLEARED";

  return (
    <div className="space-y-6">
      {/* Search and Filter Row */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <DebouncedSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by intake #, supplier or product..."
        />
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
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
                      {intake.unit === "BAG" ? (
                        <>
                          {Number(intake.normalizedWeight).toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">KG</span>
                        </>
                      ) : (
                        <>
                          {Number(intake.grossWeight).toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">{getUnitLabel(intake.unit)}</span>
                        </>
                      )}
                    </td>
                    {showSoldColumns && (
                      <>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          {intake.distinctRates && intake.distinctRates.length > 1 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-foreground">
                                Rs. {intake.distinctRates.map(r => r.toLocaleString()).join(", ")}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-semibold uppercase">
                                / {getUnitLabel(intake.rateUnit || "KG")}
                              </span>
                            </div>
                          ) : (
                            <>
                              Rs. {Number(intake.rate || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">/{getUnitLabel(intake.rateUnit || "KG")}</span>
                            </>
                          )}
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
                              {intake.unit === "BAG" && intake.product ? (
                                <>
                                  {(() => {
                                    const grossWeight = Number(intake.grossWeight) || 0;
                                    const normalizedWeight = Number(intake.normalizedWeight) || 0;
                                    const factor = grossWeight > 0 ? (normalizedWeight / grossWeight) : (intake.product.unitConversion ? Number(intake.product.unitConversion) : 1);
                                    return (Number(intake.netWeight) * factor).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  })()} <span className="text-[10px] uppercase text-muted-foreground">KG</span>
                                </>
                              ) : (
                                <>
                                  {Number(intake.netWeight).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] uppercase text-muted-foreground">{getUnitLabel(intake.unit)}</span>
                                </>
                              )}
                            </>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700 whitespace-nowrap">
                          {intake.trackTotals && intake.trackTotals.length > 1 ? (
                            <div className="flex flex-col items-end">
                              <span>Rs. {intake.initialTotal.toLocaleString()}</span>
                              <span className="text-[9px] text-muted-foreground font-normal">
                                ({intake.trackTotals.map(t => `Rs. ${t.toLocaleString()}`).join(" + ")})
                              </span>
                            </div>
                          ) : (
                            <>
                              Rs. {intake.initialTotal.toLocaleString()}
                            </>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                        intake.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        intake.status === "PARTIAL" ? "bg-purple-100 text-purple-700 border-purple-200" :
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
