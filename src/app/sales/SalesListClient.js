"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Eye, ReceiptText, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import { getUnitLabel } from "@/lib/units";
import DataTable from "@/components/ui/DataTable";

export default function SalesListClient({ sales = [], defaultPreset = "all" }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [showFilters, setShowFilters] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => getDefaultFilterState(defaultPreset));

  const dateFilteredSales = useMemo(() => {
    return filterByDateRange(sales, "entryDate", dateFilter);
  }, [sales, dateFilter]);

  const filteredSales = useMemo(() => {
    return dateFilteredSales.filter((sale) => {
      if (activeTab !== "ALL" && sale.status !== activeTab) {
        return false;
      }
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase();
      const matchNumber = sale.saleNumber?.toLowerCase().includes(query);
      const matchBuyer = sale.party?.name?.toLowerCase().includes(query);
      const matchProduct = sale.items?.some((item) =>
        item.product?.name?.toLowerCase().includes(query)
      );
      return matchNumber || matchBuyer || matchProduct;
    });
  }, [dateFilteredSales, searchQuery, activeTab]);

  // Pre-calculate custom fields for sorting
  const mappedSales = useMemo(() => {
    return filteredSales.map((sale) => {
      const singleItem = sale.items?.length === 1 ? sale.items[0] : null;
      const rateVal = singleItem ? Number(singleItem.rate || 0) : 0;
      const total = Number(sale.finalAmount);
      const paid = Number(sale.paidAmount || 0);
      return {
        ...sale,
        buyerName: sale.party?.name || "",
        displayRate: rateVal,
        remaining: Math.max(0, total - paid)
      };
    });
  }, [filteredSales]);

  const {
    sortedData: sortedSales,
    sortField,
    sortDirection,
    requestSort,
  } = useTableSorting(mappedSales, "entryDate", "desc");

  const tabs = [
    { key: "ALL", label: "All", count: dateFilteredSales.length },
    { key: "PENDING", label: "Pending", count: dateFilteredSales.filter(s => s.status === "PENDING").length },
    { key: "PARTIAL", label: "Partial", count: dateFilteredSales.filter(s => s.status === "PARTIAL").length },
    { key: "CLEARED", label: "Cleared", count: dateFilteredSales.filter(s => s.status === "CLEARED").length },
    { key: "CANCELLED", label: "Cancelled", count: dateFilteredSales.filter(s => s.status === "CANCELLED").length },
  ];

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

      {/* Search and Filter Row */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <DebouncedSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
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
        data={sortedSales}
        emptyMessage="No sale transactions found."
        containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
        sortField={sortField}
        sortDirection={sortDirection}
        onRequestSort={requestSort}
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
            className: "px-4 py-3.5 text-right font-mono text-xs",
            render: (row, val) => (
              <>
                {val.toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">KG</span>
              </>
            ),
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
                  Rs. {Number(row.items[0]?.rate || 0).toLocaleString()}
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
            render: (row, val) => `Rs. ${val.toLocaleString()}`,
          },
          ...(activeTab === "PARTIAL"
            ? [
                {
                  key: "remaining",
                  label: "Remaining",
                  className: "px-4 py-3.5 text-right font-semibold text-rose-600 font-mono text-xs",
                  render: (row, val) => `Rs. ${Number(val).toLocaleString()}`,
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
    </div>
  );
}
