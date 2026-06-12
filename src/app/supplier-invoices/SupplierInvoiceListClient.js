"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, FileText, AlertCircle, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DateRangeFilter from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import DataTable from "@/components/ui/DataTable";
import PaginationControls from "@/components/ui/PaginationControls";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function SupplierInvoiceListClient({
  invoices = [],
  totalCount = 0,
  tabCounts = { all: 0, pending: 0, partial: 0, cleared: 0, superseded: 0 },
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
    if (currentPage > 1 && invoices.length === 0) {
      updateFilters({ page: Math.max(1, currentPage - 1) });
    }
  }, [invoices, currentPage]);

  const handleSort = (field) => {
    let direction = "asc";
    if (currentSortField === field && currentSortDirection === "asc") {
      direction = "desc";
    }
    updateFilters({ sortField: field, sortDirection: direction });
  };

  // Pre-calculate fields for display/sorting
  const mappedInvoices = useMemo(() => {
    return invoices.map((invoice) => {
      const total = Number(invoice.finalPayableAmount);
      const paid = Number(invoice.paidAmount || 0);
      return {
        ...invoice,
        supplierName: invoice.party?.name || "",
        remaining: Math.max(0, total - paid)
      };
    });
  }, [invoices]);

  const tabs = [
    { key: "ALL", label: "All", count: tabCounts.all },
    { key: "PENDING", label: "Pending", count: tabCounts.pending },
    { key: "PARTIAL", label: "Partial", count: tabCounts.partial },
    { key: "CLEARED", label: "Cleared", count: tabCounts.cleared },
    { key: "SUPERSEDED", label: "Superseded", count: tabCounts.superseded },
  ];

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

      {/* Search and Filter Row */}
      <div>
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <DebouncedSearchInput
              value={searchQuery}
              onChange={(val) => updateFilters({ search: val })}
              placeholder="Search by invoice #, supplier..."
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
          data={mappedInvoices}
          emptyMessage="No settlement invoices found."
          containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
          rowClassName={(row) => cn(row.status === "SUPERSEDED" && "opacity-60 bg-muted/10")}
          sortField={currentSortField}
          sortDirection={currentSortDirection}
          onRequestSort={handleSort}
          columns={[
            {
              key: "invoiceNumber",
              label: "Invoice #",
              className: "px-4 py-3",
              render: (row, val) => (
                <div className="flex flex-col">
                  <span className="font-mono font-medium text-primary">{val}</span>
                  {row.isOutdated && row.status !== "SUPERSEDED" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase mt-1">
                      <AlertCircle className="h-3 w-3" /> Outdated
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "entryDate",
              label: "Date",
              className: "px-4 py-3 whitespace-nowrap",
              render: (row, val) => format(new Date(val), "dd MMM yyyy"),
            },
            {
              key: "supplierName",
              label: "Supplier",
              className: "px-4 py-3 font-medium",
            },
            {
              key: "finalPayableAmount",
              label: "Final Total",
              className: "px-4 py-3 text-right font-bold text-lg",
              render: (row, val) => `Rs. ${Number(val).toLocaleString()}`,
            },
            ...(currentTab === "PARTIAL"
              ? [
                  {
                    key: "remaining",
                    label: "Remaining",
                    className: "px-4 py-3 text-right font-semibold text-rose-600 font-mono",
                    render: (row, val) => `Rs. ${Number(val).toLocaleString()}`,
                  },
                ]
              : []),
            {
              key: "version",
              label: "Version",
              className: "px-4 py-3 text-center",
              render: (row, val) => (
                <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-[10px] font-bold">
                  V{val}
                </span>
              ),
            },
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
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : val === "CLEARED"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
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
                  href={`/supplier-invoices/${row.id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground"
                >
                  <FileText className="h-4 w-4" />
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
