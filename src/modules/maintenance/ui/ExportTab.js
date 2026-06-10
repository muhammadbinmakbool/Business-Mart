"use client";

import React, { useState } from "react";
import { Download, Database, Calendar, AlertCircle } from "lucide-react";
import DateRangeFilter, { getDefaultFilterState } from "@/components/DateRangeFilter";
import { cn } from "@/lib/utils";

export default function ExportTab() {
  const [resource, setResource] = useState("sales");
  const [format, setFormat] = useState("xlsx");
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [dateFilter, setDateFilter] = useState(() => getDefaultFilterState("all"));

  const resources = [
    { id: "sales", label: "Sales & Billing Registry" },
    { id: "settlements", label: "Supplier Settlements Registry" },
    { id: "ledger", label: "Ledger Reconciliation Snapshots" }
  ];

  const handleExport = () => {
    const params = new URLSearchParams({
      format,
      searchQuery: searchQuery.trim(),
      status,
      preset: dateFilter.preset || "all",
      startDate: dateFilter.startDate || "",
      endDate: dateFilter.endDate || "",
      month: dateFilter.month || ""
    });

    const url = `/api/export/${resource}?${params.toString()}`;
    window.open(url, "_blank");
  };

  // Reset status filter depending on resource changes (since different resources have different statuses)
  const handleResourceChange = (newResource) => {
    setResource(newResource);
    setStatus("ALL");
    setSearchQuery("");
    setDateFilter(getDefaultFilterState("all"));
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      {/* Tab Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-primary/10 text-primary rounded-xl">
          <Download className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Data Export Panel</h2>
          <p className="text-xs text-muted-foreground">Export clean, raw transactional datasets to Excel and CSV spreadsheets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Resource Selection */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Select Dataset</h3>
          <div className="flex flex-col gap-2">
            {resources.map((res) => {
              const isSelected = resource === res.id;
              return (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => handleResourceChange(res.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-input hover:bg-accent/40 hover:text-foreground"
                  )}
                >
                  {res.label}
                </button>
              );
            })}
          </div>
          
          {/* Format Selection Card */}
          <div className="p-4 rounded-xl border bg-accent/10 space-y-3 mt-4">
            <h4 className="text-xs font-bold text-foreground">File Format</h4>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === "xlsx"}
                  onChange={(e) => setFormat(e.target.value)}
                  className="accent-primary"
                />
                <span>Excel (.xlsx)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === "csv"}
                  onChange={(e) => setFormat(e.target.value)}
                  className="accent-primary"
                />
                <span>CSV (.csv)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right column: Filter Options */}
        <div className="lg:col-span-2 space-y-4 border-l lg:pl-6 border-muted/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Configure Filters</h3>
          
          {/* Text Search Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Text Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                resource === "sales"
                  ? "Search by sale #, buyer, product..."
                  : resource === "settlements"
                  ? "Search by invoice #, supplier..."
                  : "Search session title..."
              }
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Status Filter Dropdown (Conditional) */}
          {resource !== "ledger" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Record Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Statuses</option>
                {resource === "sales" ? (
                  <>
                    <option value="PENDING">Pending</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="CLEARED">Cleared</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="PENDING">Pending</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="CLEARED">Cleared</option>
                    <option value="SUPERSEDED">Superseded</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Temporal / Date Range Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Date Range Filter</label>
            <div className="rounded-xl border p-3.5 bg-background">
              <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
            </div>
          </div>

          {/* Download Action Trigger */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all text-sm cursor-pointer shadow-md"
            >
              <Download className="h-4 w-4" />
              Download Dataset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
