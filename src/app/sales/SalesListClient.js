"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, Eye, ReceiptText, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DateRangeFilter from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import { getUnitLabel } from "@/lib/units";
import DataTable from "@/components/ui/DataTable";
import PaginationControls from "@/components/ui/PaginationControls";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useHeaderAction } from "@/components/layout/HeaderActionContext";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatCurrency } from "@/lib/formatters/financialFormatter";
import { formatUnitDisplay } from "@/lib/formatters/unitFormatter";

export default function SalesListClient({
  sales = [],
  totalCount = 0,
  tabCounts = { all: 0, pending: 0, partial: 0, cleared: 0, cancelled: 0 },
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
  const { settings, decimalPlaces, currencySymbol } = useSettings();
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
    const params = new URLSearchParams(searchParams);
    
    // Page resets when filters change
    if (updates.page === undefined) {
      params.set("page", "1");
    }

    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val.toString());
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  // Gracefully handle deleting last item on the page
  useEffect(() => {
    if (currentPage > 1 && sales.length === 0) {
      updateFilters({ page: Math.max(1, currentPage - 1) });
    }
  }, [sales, currentPage]);

  const handleSort = (field, direction) => {
    updateFilters({
      sortField: field,
      sortDirection: direction
    });
  };

  // Pre-calculate custom fields for sorting/display
  const mappedSales = useMemo(() => {
    return sales.map(sale => {
      const buyerName = sale.buyer?.name || "N/A";
      const singleItem = sale.items?.length === 1 ? sale.items[0] : null;
      const rateVal = singleItem ? Number(singleItem.rate || 0) : 0;
      const total = Number(sale.finalAmount);
      const paid = Number(sale.paidAmount || 0);
      return {
        ...sale,
        buyerName,
        displayRate: rateVal,
        remaining: Math.max(0, total - paid)
      };
    });
  }, [sales]);

  const tabs = [
    { key: "ALL", label: "All", count: tabCounts.all },
    { key: "PENDING", label: "Pending", count: tabCounts.pending },
    { key: "PARTIAL", label: "Partial", count: tabCounts.partial },
    { key: "CLEARED", label: "Cleared", count: tabCounts.cleared },
    { key: "CANCELLED", label: "Cancelled", count: tabCounts.cancelled },
  ];

  const { setHeaderAction } = useHeaderAction();

  // Register the action button in the persistent tab row
  useEffect(() => {
    setHeaderAction(
      <Link
        href="/sales/create"
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        New Sale
      </Link>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction]);

  return (
    <div className="space-y-4">

      {/* Search and Filter Row */}
      <div>
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <DebouncedSearchInput
              value={searchQuery}
              onChange={(val) => updateFilters({ search: val })}
              placeholder="Search by sale #, buyer or product..."
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
          data={mappedSales}
          emptyMessage="No sale transactions found."
          containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
          sortField={currentSortField}
          sortDirection={currentSortDirection}
          onRequestSort={handleSort}
          columns={[
            {
              key: "saleNumber",
              label: "Sale #",
              className: "px-4 py-3.5 font-mono font-medium text-primary flex items-center gap-2",
              render: (row, val) => (
                <>
                  <ReceiptText className="h-3.5 w-3.5 opacity-40" />
                  {val}
                </>
              ),
            },
            {
              key: "entryDate",
              label: "Date",
              className: "px-4 py-3.5 whitespace-nowrap opacity-80",
              render: (row, val) => format(new Date(val), "dd MMM yyyy"),
            },
            {
              key: "buyerName",
              label: "Buyer",
              className: "px-4 py-3.5 font-semibold text-foreground",
            },
            {
              key: "totalWeight",
              label: "Net Weight",
              className: "px-4 py-3.5 text-right font-semibold",
              render: (row, val) => formatUnitDisplay(val, "KG", null, "en", null, settings),
            },
            {
              key: "displayRate",
              label: "Rate (Rs.)",
              className: "px-4 py-3.5 text-right font-mono text-xs text-muted-foreground",
              sortable: false,
              render: (row) =>
                row.items.length > 1 ? (
                  <span className="italic">Multiple</span>
                ) : (
                  <>
                    {formatCurrency(row.items[0]?.rate || 0, "en", currencySymbol, decimalPlaces)}
                    <span className="text-[9px] opacity-60 ml-1 uppercase">
                      /{" "}
                      {getUnitLabel(
                        row.items[0]?.unit === "BAG" ||
                          row.items[0]?.product?.category === "BAG" ||
                          row.items[0]?.product?.primaryUnit === "BAG"
                          ? "BAG"
                          : row.items[0]?.rateUnit || "KG"
                      )}
                    </span>
                  </>
                ),
            },
            {
              key: "finalAmount",
              label: "Final Amount",
              className: "px-4 py-3.5 text-right font-bold text-base",
              render: (row, val) => formatCurrency(val, "en", currencySymbol, decimalPlaces),
            },
            ...(currentTab === "PARTIAL"
              ? [
                  {
                    key: "remaining",
                    label: "Remaining",
                    className: "px-4 py-3.5 text-right font-semibold text-rose-600 font-mono text-xs",
                    render: (row, val) => formatCurrency(val, "en", currencySymbol, decimalPlaces),
                  },
                ]
              : []),
            {
              key: "status",
              label: "Status",
              className: "px-4 py-3.5 text-center",
              render: (row, val) => (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                    val === "PENDING"
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : val === "PARTIAL"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : val === "CLEARED"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
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
              className: "px-4 py-3.5 text-center",
              sortable: false,
              render: (row) => (
                <Link
                  href={`/sales/${row.id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
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
