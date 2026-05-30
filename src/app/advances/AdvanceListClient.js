"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, User } from "lucide-react";
import { format } from "date-fns";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";
import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";

export default function AdvanceListClient({ advances = [], defaultPreset = "all" }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(() => getDefaultFilterState(defaultPreset));

  const dateFilteredAdvances = useMemo(() => {
    return filterByDateRange(advances, "createdAt", dateFilter);
  }, [advances, dateFilter]);

  const filteredAdvances = useMemo(() => {
    return dateFilteredAdvances.filter((advance) => {
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase();
      const matchSupplier = advance.party?.name?.toLowerCase().includes(query);
      const matchNotes = advance.notes?.toLowerCase().includes(query);
      const matchIntakeNumber = advance.intakeTransaction?.intakeNumber?.toLowerCase().includes(query);
      return matchSupplier || matchNotes || matchIntakeNumber;
    });
  }, [dateFilteredAdvances, searchQuery]);

  // Pre-calculate fields for nested sorting
  const mappedAdvances = useMemo(() => {
    return filteredAdvances.map((advance) => ({
      ...advance,
      supplierName: advance.party?.name || "",
      intakeNumber: advance.intakeTransaction?.intakeNumber || "",
    }));
  }, [filteredAdvances]);

  const {
    sortedData: sortedAdvances,
    sortField,
    sortDirection,
    requestSort,
  } = useTableSorting(mappedAdvances, "createdAt", "desc");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Advances</h1>
          <p className="text-muted-foreground">Track all payments and advances made to suppliers.</p>
        </div>
        <Link
          href="/advances/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Advance
        </Link>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <DebouncedSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by supplier, remarks, or intake #..."
        />
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                <SortableHeader
                  field="createdAt"
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
                  field="amount"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right"
                >
                  Amount
                </SortableHeader>
                 <SortableHeader
                  field="intakeNumber"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Linked Intake
                </SortableHeader>
                <SortableHeader
                  field="supplierInvoiceId"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Settlement Status
                </SortableHeader>
                <SortableHeader
                  field="notes"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Remarks
                </SortableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedAdvances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic">
                    No advance payments recorded.
                  </td>
                </tr>
              ) : (
                sortedAdvances.map((advance) => (
                  <tr key={advance.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(advance.createdAt), "dd MMM yyyy, hh:mm a")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {advance.supplierName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      Rs. {Number(advance.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {advance.intakeTransaction ? (
                        <Link
                          href={`/intake/${advance.intakeTransactionId}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                        >
                          {advance.intakeNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Standalone</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {advance.supplierInvoice ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block w-fit">
                            Adjusted
                          </span>
                          <Link
                            href={`/supplier-invoices/${advance.supplierInvoiceId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs mt-0.5"
                          >
                            {advance.supplierInvoice.invoiceNumber}
                          </Link>
                        </div>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block w-fit">
                          Outstanding
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground italic">
                      {advance.notes || "-"}
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
