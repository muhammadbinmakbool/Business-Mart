"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, FileText, AlertCircle, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import DataTable from "@/components/ui/DataTable";

export default function SupplierInvoiceListClient({ invoices = [], defaultPreset = "all" }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [showFilters, setShowFilters] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => getDefaultFilterState(defaultPreset));

  const dateFilteredInvoices = useMemo(() => {
    return filterByDateRange(invoices, "entryDate", dateFilter);
  }, [invoices, dateFilter]);

  const filteredInvoices = useMemo(() => {
    return dateFilteredInvoices.filter((invoice) => {
      if (activeTab === "ALL") {
        if (invoice.status === "SUPERSEDED") return false;
      } else if (invoice.status !== activeTab) {
        return false;
      }
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase();
      const matchNumber = invoice.invoiceNumber?.toLowerCase().includes(query);
      const matchSupplier = invoice.party?.name?.toLowerCase().includes(query);
      return matchNumber || matchSupplier;
    });
  }, [dateFilteredInvoices, searchQuery, activeTab]);

  // Pre-calculate fields for sorting
  const mappedInvoices = useMemo(() => {
    return filteredInvoices.map((invoice) => {
      const total = Number(invoice.finalPayableAmount);
      const paid = Number(invoice.paidAmount || 0);
      return {
        ...invoice,
        supplierName: invoice.party?.name || "",
        remaining: Math.max(0, total - paid)
      };
    });
  }, [filteredInvoices]);

  const {
    sortedData: sortedInvoices,
    sortField,
    sortDirection,
    requestSort,
  } = useTableSorting(mappedInvoices, "entryDate", "desc");

  const tabs = [
    { key: "ALL", label: "All", count: dateFilteredInvoices.filter(i => i.status !== "SUPERSEDED").length },
    { key: "PENDING", label: "Pending", count: dateFilteredInvoices.filter(i => i.status === "PENDING").length },
    { key: "PARTIAL", label: "Partial", count: dateFilteredInvoices.filter(i => i.status === "PARTIAL").length },
    { key: "CLEARED", label: "Cleared", count: dateFilteredInvoices.filter(i => i.status === "CLEARED").length },
    { key: "SUPERSEDED", label: "Superseded", count: dateFilteredInvoices.filter(i => i.status === "SUPERSEDED").length },
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
              onChange={setSearchQuery}
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
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        <div 
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            showFilters ? "opacity-100 max-h-32 mt-4" : "opacity-0 max-h-0 pointer-events-none mt-0"
          )}
        >
          <StatusFilterTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={tabs}
          />
        </div>
      </div>

      <DataTable
        data={sortedInvoices}
        emptyMessage="No settlement invoices found."
        containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
        rowClassName={(row) => cn(row.status === "SUPERSEDED" && "opacity-60 bg-muted/10")}
        sortField={sortField}
        sortDirection={sortDirection}
        onRequestSort={requestSort}
        columns={[
          {
            key: "invoiceNumber",
            label: "Invoice #",
            className: "px-4 py-3",
            render: (row, val) => (
              <div className="flex flex-col">
                <span className="font-mono font-medium text-primary">{val}</span>
                {row.isOutdated && row.status !== "SUPERSEDED" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
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
          ...(activeTab === "PARTIAL"
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
    </div>
  );
}
