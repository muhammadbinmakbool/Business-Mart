"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, User } from "lucide-react";
import { format } from "date-fns";
import { useTableSorting } from "@/hooks/useTableSorting";
import DataTable from "@/components/ui/DataTable";
import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import ModuleTabNav from "@/components/layout/ModuleTabNav";

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

  const tabItems = [
    { name: "Settlement Invoices", href: "/supplier-invoices", active: false },
    { name: "Supplier Advances", href: "/advances", active: true }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 shrink-0">
        <ModuleTabNav tabs={tabItems} className="border-b-0 mb-0" />
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

      <DataTable
        data={sortedAdvances}
        sortField={sortField}
        sortDirection={sortDirection}
        onRequestSort={requestSort}
        emptyMessage="No advance payments recorded."
        columns={[
          {
            key: "createdAt",
            label: "Date",
            render: (row, val) => format(new Date(val), "dd MMM yyyy, hh:mm a"),
          },
          {
            key: "supplierName",
            label: "Supplier",
            render: (row) => (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                {row.supplierName}
              </div>
            ),
          },
          {
            key: "amount",
            label: "Amount",
            className: "text-right font-bold text-primary",
            render: (row, val) => `Rs. ${Number(val).toLocaleString()}`,
          },
          {
            key: "intakeNumber",
            label: "Linked Intake",
            render: (row) =>
              row.intakeTransaction ? (
                <Link
                  href={`/intake/${row.intakeTransactionId}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                >
                  {row.intakeNumber}
                </Link>
              ) : (
                <span className="text-muted-foreground text-xs italic">Standalone</span>
              ),
          },
          {
            key: "supplierInvoiceId",
            label: "Settlement Status",
            render: (row) =>
              row.supplierInvoice ? (
                <div className="flex flex-col gap-0.5">
                  <span className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block w-fit">
                    Adjusted
                  </span>
                  <Link
                    href={`/supplier-invoices/${row.supplierInvoiceId}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs mt-0.5"
                  >
                    {row.supplierInvoice.invoiceNumber}
                  </Link>
                </div>
              ) : (
                <span className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block w-fit">
                  Outstanding
                </span>
              ),
          },
          {
            key: "notes",
            label: "Remarks",
            className: "text-muted-foreground italic",
            render: (row, val) => val || "-",
          },
        ]}
      />
    </div>
  );
}
