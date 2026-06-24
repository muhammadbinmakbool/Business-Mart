"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Eye, Filter, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DateRangeFilter from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import { getUnitLabel, convertRate } from "@/lib/units";
import DataTable from "@/components/ui/DataTable";
import PaginationControls from "@/components/ui/PaginationControls";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatCurrency } from "@/lib/formatters/financialFormatter";

export default function IntakeListClient({
  intakes = [],
  totalCount = 0,
  tabCounts = { all: 0, pending: 0, sold: 0, cleared: 0, cancelled: 0 },
  currentPage = 1,
  currentLimit = 50,
  currentSearch = "",
  currentTab = "ALL",
  currentPreset = "all",
  currentStartDate = "",
  currentEndDate = "",
  currentMonth = "",
  currentSortField = "entryDate",
  currentSortDirection = "desc"
}) {
  const { decimalPlaces, currencySymbol } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [showFilters, setShowFilters] = useState(true);

  // Sync internal search query state with URL changes
  useEffect(() => {
    setSearchQuery(currentSearch);
  }, [currentSearch]);

  const dateFilter = useMemo(() => ({
    preset: currentPreset,
    startDate: currentStartDate,
    endDate: currentEndDate,
    month: currentMonth
  }), [currentPreset, currentStartDate, currentEndDate, currentMonth]);

  const updateFilters = (updates) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    if (!("page" in updates)) {
      params.set("page", "1");
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  // Gracefully handle deleting last item on the page
  useEffect(() => {
    if (currentPage > 1 && intakes.length === 0) {
      updateFilters({ page: Math.max(1, currentPage - 1) });
    }
  }, [intakes, currentPage]);

  const handleSort = (field) => {
    let direction = "asc";
    if (currentSortField === field && currentSortDirection === "asc") {
      direction = "desc";
    }
    updateFilters({ sortField: field, sortDirection: direction });
  };

  // Pre-calculate initialTotal for rendering
  const mappedIntakes = useMemo(() => {
    return intakes.map(intake => {
      const hasTracks = intake.salesTracks && intake.salesTracks.length > 0;
      
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
  }, [intakes]);

  const tabs = [
    { key: "ALL", label: "All", count: tabCounts.all },
    { key: "PENDING", label: "Pending", count: tabCounts.pending },
    { key: "SOLD", label: "Sold", count: tabCounts.sold },
    { key: "CLEARED", label: "Cleared", count: tabCounts.cleared },
    { key: "CANCELLED", label: "Cancelled", count: tabCounts.cancelled },
  ];

  const showSoldColumns = currentTab === "SOLD" || currentTab === "CLEARED";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Goods Intake Ledger</h1>
        <Link
          href="/intake/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Record Intake
        </Link>
      </div>

      {/* Search and Filter Row */}
      <div>
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <DebouncedSearchInput
              value={searchQuery}
              onChange={(val) => updateFilters({ search: val })}
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
          <DateRangeFilter
            value={dateFilter}
            onChange={(newDateFilter) => updateFilters({
              preset: newDateFilter.preset,
              startDate: newDateFilter.startDate,
              endDate: newDateFilter.endDate,
              month: newDateFilter.month
            })}
          />
        </div>

        <div 
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            showFilters ? "opacity-100 max-h-32 mt-4" : "opacity-0 max-h-0 pointer-events-none mt-0"
          )}
        >
          <StatusFilterTabs 
            activeTab={currentTab}
            onChange={(newTab) => updateFilters({ tab: newTab })}
            tabs={tabs}
          />
        </div>
      </div>

      <div className="space-y-4">
        <DataTable
          data={mappedIntakes}
          emptyMessage="No matching intake transactions found."
          containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
          sortField={currentSortField}
          sortDirection={currentSortDirection}
          onRequestSort={handleSort}
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
              label: "Packaging",
              className: "px-4 py-3 text-right font-medium",
              render: (row, val) => {
                const packaging = row.packagingMeta ? (typeof row.packagingMeta === "string" ? JSON.parse(row.packagingMeta) : row.packagingMeta) : null;
                if (packaging) {
                  return `${packaging.count} ${packaging.type}`;
                }
                return val ? `${val} Bags` : "-";
              },
            },
            {
              key: "grossWeight",
              label: "Gross Quantity",
              className: "px-4 py-3 text-right font-semibold",
              render: (row, val) =>
                row.unit === "BAG" ? (
                  <>
                    {Number(row.baseQuantity).toLocaleString()}{" "}
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
                            {row.distinctRates.map((r) => formatCurrency(r, "en", currencySymbol, decimalPlaces)).join(", ")}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase">
                            / {getUnitLabel(row.rateUnit || "KG")}
                          </span>
                        </div>
                      ) : (
                        <>
                          {formatCurrency(row.rate || 0, "en", currencySymbol, decimalPlaces)}{" "}
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
                                const baseQuantity = Number(row.baseQuantity) || 0;
                                const factor =
                                  grossWeight > 0
                                    ? baseQuantity / grossWeight
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
                          <span>{formatCurrency(val, "en", currencySymbol, decimalPlaces)}</span>
                          <span className="text-[9px] text-muted-foreground font-normal">
                            ({row.trackTotals.map((t) => formatCurrency(t, "en", currencySymbol, decimalPlaces)).join(" + ")})
                          </span>
                        </div>
                      ) : (
                        <>{formatCurrency(val, "en", currencySymbol, decimalPlaces)}</>
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

        <PaginationControls
          currentPage={currentPage}
          totalCount={totalCount}
          limit={currentLimit}
          onPageChange={(newPage) => updateFilters({ page: newPage })}
          onLimitChange={(newLimit) => updateFilters({ limit: newLimit })}
        />
      </div>
    </div>
  );
}
