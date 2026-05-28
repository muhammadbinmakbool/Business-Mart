"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";

export default function SupplierInvoiceListClient({ invoices = [], defaultPreset = "all" }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [dateFilter, setDateFilter] = useState(() => getDefaultFilterState(defaultPreset));

  const dateFilteredInvoices = useMemo(() => {
    return filterByDateRange(invoices, "entryDate", dateFilter);
  }, [invoices, dateFilter]);

  const filteredInvoices = useMemo(() => {
    return dateFilteredInvoices.filter((invoice) => {
      if (activeTab !== "ALL" && invoice.status !== activeTab) {
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
    return filteredInvoices.map((invoice) => ({
      ...invoice,
      supplierName: invoice.party?.name || "",
    }));
  }, [filteredInvoices]);

  const {
    sortedData: sortedInvoices,
    sortField,
    sortDirection,
    requestSort,
  } = useTableSorting(mappedInvoices, "entryDate", "desc");

  const tabs = [
    { key: "ALL", label: "All", count: dateFilteredInvoices.length },
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
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <DebouncedSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by invoice #, supplier..."
        />
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <StatusFilterTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={tabs}
      />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                <SortableHeader
                  field="invoiceNumber"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Invoice #
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
                  field="supplierName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Supplier
                </SortableHeader>
                <SortableHeader
                  field="finalPayableAmount"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right"
                >
                  Final Total
                </SortableHeader>
                <SortableHeader
                  field="version"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-center"
                >
                  Version
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
            <tbody>
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic">
                    No settlement invoices found.
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={cn(
                      "border-b hover:bg-muted/30 transition-colors",
                      invoice.status === "SUPERSEDED" && "opacity-60 bg-muted/10"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono font-medium text-primary">{invoice.invoiceNumber}</span>
                        {invoice.isOutdated && invoice.status !== "SUPERSEDED" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                            <AlertCircle className="h-3 w-3" /> Outdated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(invoice.entryDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 font-medium">{invoice.supplierName}</td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      Rs. {Number(invoice.finalPayableAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-[10px] font-bold">
                        V{invoice.version}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                          invoice.status === "PENDING"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : invoice.status === "PARTIAL"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : invoice.status === "CLEARED"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/supplier-invoices/${invoice.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground"
                      >
                        <FileText className="h-4 w-4" />
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
