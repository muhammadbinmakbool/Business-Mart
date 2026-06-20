"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Edit2, Eye, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deletePartyAction, hardDeletePartyAction } from "@/modules/parties/controllers/partyActions";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import DataTable from "@/components/ui/DataTable";
import PaginationControls from "@/components/ui/PaginationControls";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatCurrency } from "@/lib/formatters/financialFormatter";

export default function PartyListClient({
  parties = [],
  totalCount = 0,
  tabCounts = { all: 0, buyer: 0, supplier: 0, both: 0, inactive: 0 },
  currentPage = 1,
  currentLimit = 50,
  currentSearch = "",
  currentTab = "ALL",
  currentSortField = "name",
  currentSortDirection = "asc"
}) {
  const { decimalPlaces, currencySymbol } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [showFilters, setShowFilters] = useState(true);

  // Sync internal search query state with URL changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(currentSearch);
  }, [currentSearch]);

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
    if (currentPage > 1 && parties.length === 0) {
      updateFilters({ page: Math.max(1, currentPage - 1) });
    }
  }, [parties, currentPage]);

  const handleSort = (field) => {
    // If the field is not sortable (like netBalance), ignore
    if (field === "netBalance") return;

    let direction = "asc";
    if (currentSortField === field && currentSortDirection === "asc") {
      direction = "desc";
    }
    updateFilters({ sortField: field, sortDirection: direction });
  };

  const columns = useMemo(() => [
    {
      key: "name",
      label: "Name",
      className: "font-semibold text-slate-900 dark:text-slate-100",
      render: (party) => (
        <div className="flex items-center gap-2.5">
          <span>{party.name}</span>
          {!party.isActive && (
            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 uppercase tracking-wider">
              Inactive
            </span>
          )}
        </div>
      )
    },
    {
      key: "partyType",
      label: "Type",
      render: (party) => (
        <span className={cn(
          "text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border shadow-sm",
          party.partyType === "SUPPLIER" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900" :
          party.partyType === "BUYER" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900" :
          "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900"
        )}>
          {party.partyType}
        </span>
      )
    },
    {
      key: "phoneNumber",
      label: "Phone",
      className: "font-mono text-muted-foreground",
      render: (party) => party.phoneNumber || "—"
    },
    {
      key: "address",
      label: "Address",
      className: "text-muted-foreground truncate max-w-[200px]",
      render: (party) => party.address ? (
        <span title={party.address}>{party.address}</span>
      ) : "—"
    },
    {
      key: "notes",
      label: "Notes",
      className: "text-muted-foreground truncate max-w-[200px]",
      render: (party) => party.notes ? (
        <span title={party.notes}>{party.notes}</span>
      ) : "—"
    },
    {
      key: "netBalance",
      label: "Net Balance",
      sortable: false,
      className: "text-right font-mono font-semibold",
      render: (party) => {
        const bal = party.netBalance || 0;
        if (bal === 0) return <span className="text-muted-foreground">—</span>;
        const formatted = formatCurrency(Math.abs(bal), "en", currencySymbol, decimalPlaces);
        return (
          <span className={bal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
            {formatted} {bal > 0 ? "DR" : "CR"}
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right",
      sortable: false,
      render: (party) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/parties/${party.id}`}
            className="rounded-full p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            title="View Profile"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`/parties/${party.id}/edit`}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Edit Party"
          >
            <Edit2 className="h-4 w-4" />
          </Link>
          <DeleteButton 
            id={party.id} 
            deleteAction={deletePartyAction} 
            hardDeleteAction={hardDeletePartyAction}
            label="Party" 
            variant="icon" 
          />
        </div>
      )
    }
  ], [decimalPlaces, currencySymbol]);

  const tabs = [
    { key: "ALL", label: "All", count: tabCounts.all },
    { key: "BUYER", label: "Buyer", count: tabCounts.buyer },
    { key: "SUPPLIER", label: "Supplier", count: tabCounts.supplier },
    { key: "BOTH", label: "Both", count: tabCounts.both },
    { key: "INACTIVE", label: "Inactive", count: tabCounts.inactive },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Parties Registry</h1>
        <Link
          href="/parties/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Party
        </Link>
      </div>

      <div>
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <DebouncedSearchInput
              value={searchQuery}
              onChange={(val) => updateFilters({ search: val })}
              placeholder="Search parties by name, phone or address..."
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
          data={parties}
          columns={columns}
          sortField={currentSortField}
          sortDirection={currentSortDirection}
          onRequestSort={handleSort}
          rowClassName={(party) => !party.isActive ? "opacity-50" : ""}
          onRowClick={(party) => router.push(`/parties/${party.id}`)}
          emptyMessage="No parties found matching the criteria."
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
