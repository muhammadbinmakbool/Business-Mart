"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Eye, ShoppingBag, BadgeCheck, Clock, XCircle, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";
import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import { normalizeQuantity, getUnitLabel, UNIT_IDS, convertRate } from "@/lib/units";
import DataTable from "@/components/ui/DataTable";

export default function IntakeListClient({ intakes = [], defaultPreset = "all" }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [showFilters, setShowFilters] = useState(true);
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
        <div className="flex-1 flex gap-2">
          <DebouncedSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by intake #, supplier or product..."
          />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
              showFilters
                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                : "bg-card text-muted-foreground border-muted hover:text-foreground hover:bg-muted/10"
            )}
            title={showFilters ? "Hide Filters" : "Show Filters"}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <div 
        hidden={!showFilters}
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          showFilters ? "opacity-100 max-h-32 !mt-4" : "opacity-0 max-h-0 pointer-events-none !mt-0"
        )}
      >
        <StatusFilterTabs 
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={tabs}
        />
      </div>

      <DataTable
        data={sortedIntakes}
        emptyMessage="No matching intake transactions found."
        containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
        sortField={sortField}
        sortDirection={sortDirection}
        onRequestSort={requestSort}
        columns={[
          {
            key: "intakeNumber",
            label: "Intake #",
            className: "px-4 py-3 font-mono font-medium text-primary",
          },
          {
            key: "entryDate",
            label: "Date",
            className: "px-4 py-3 whitespace-nowrap",
            render: (row, val) => format(new Date(val), "dd MMM yyyy"),
          },
          {
            key: "party.name",
            label: "Supplier",
            className: "px-4 py-3 font-medium",
          },
          {
            key: "product.name",
            label: "Product",
            className: "px-4 py-3",
          },
          {
            key: "bagCount",
            label: "Bags",
            className: "px-4 py-3 text-right",
            render: (row, val) => val || "-",
          },
          {
            key: "grossWeight",
            label: "Gross Weight",
            className: "px-4 py-3 text-right font-semibold",
            render: (row, val) =>
              row.unit === "BAG" ? (
                <>
                  {Number(row.normalizedWeight).toLocaleString()}{" "}
                  <span className="text-[10px] text-muted-foreground uppercase">KG</span>
                </>
              ) : (
                <>
                  {Number(val).toLocaleString()}{" "}
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {getUnitLabel(row.unit)}
                  </span>
                </>
              ),
          },
          ...(showSoldColumns
            ? [
                {
                  key: "rate",
                  label: "Rate",
                  className: "px-4 py-3 text-right font-medium whitespace-nowrap",
                  render: (row) =>
                    row.distinctRates && row.distinctRates.length > 1 ? (
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-foreground">
                          Rs. {row.distinctRates.map((r) => r.toLocaleString()).join(", ")}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase">
                          / {getUnitLabel(row.rateUnit || "KG")}
                        </span>
                      </div>
                    ) : (
                      <>
                        Rs. {Number(row.rate || 0).toLocaleString()}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          /{getUnitLabel(row.rateUnit || "KG")}
                        </span>
                      </>
                    ),
                },
                {
                  key: "Bardana",
                  label: "Bardana",
                  className: "px-4 py-3 text-right text-muted-foreground whitespace-nowrap",
                  sortable: false,
                  render: (row, val) => (val !== null ? `${Number(val).toLocaleString()} KG` : "-"),
                },
                {
                  key: "Khot",
                  label: "Khot",
                  className: "px-4 py-3 text-right text-muted-foreground whitespace-nowrap",
                  sortable: false,
                  render: (row, val) => (val !== null ? `${Number(val).toLocaleString()} KG` : "-"),
                },
                {
                  key: "netWeight",
                  label: "Net Weight",
                  className: "px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap",
                  render: (row, val) =>
                    val !== null ? (
                      <>
                        {row.unit === "BAG" && row.product ? (
                          <>
                            {(() => {
                              const grossWeight = Number(row.grossWeight) || 0;
                              const normalizedWeight = Number(row.normalizedWeight) || 0;
                              const factor =
                                grossWeight > 0
                                  ? normalizedWeight / grossWeight
                                  : row.product.unitConversion
                                  ? Number(row.product.unitConversion)
                                  : 1;
                              return (Number(val) * factor).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });
                            })()}{" "}
                            <span className="text-[10px] uppercase text-muted-foreground">KG</span>
                          </>
                        ) : (
                          <>
                            {Number(val).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            <span className="text-[10px] uppercase text-muted-foreground">
                              {getUnitLabel(row.unit)}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      "-"
                    ),
                },
                {
                  key: "initialTotal",
                  label: "Initial Total",
                  className: "px-4 py-3 text-right font-bold text-amber-700 whitespace-nowrap",
                  render: (row, val) =>
                    row.trackTotals && row.trackTotals.length > 1 ? (
                      <div className="flex flex-col items-end">
                        <span>Rs. {val.toLocaleString()}</span>
                        <span className="text-[9px] text-muted-foreground font-normal">
                          ({row.trackTotals.map((t) => `Rs. ${t.toLocaleString()}`).join(" + ")})
                        </span>
                      </div>
                    ) : (
                      <>Rs. {val.toLocaleString()}</>
                    ),
                },
              ]
            : []),
          {
            key: "status",
            label: "Status",
            className: "px-4 py-3 text-center",
            render: (row, val) => (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                  val === "PENDING"
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : val === "PARTIAL"
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : val === "SOLD"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : val === "CLEARED"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-rose-100 text-rose-700 border-rose-200"
                )}
              >
                {val}
              </span>
            ),
          },
          {
            key: "actions",
            label: "Actions",
            className: "px-4 py-3 text-center",
            sortable: false,
            render: (row) => (
              <Link
                href={`/intake/${row.id}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground"
              >
                <Eye className="h-4 w-4" />
              </Link>
            ),
          },
        ]}
      />
    </div>
  );

}
