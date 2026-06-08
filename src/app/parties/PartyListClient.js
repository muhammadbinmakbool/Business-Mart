"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit2, Phone, MapPin, Eye, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deletePartyAction } from "@/modules/parties/controllers/partyActions";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import DataTable from "@/components/ui/DataTable";

export default function PartyListClient({ parties = [] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [showFilters, setShowFilters] = useState(true);

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
      className: "text-right font-mono font-semibold",
      render: (party) => {
        const bal = party.netBalance || 0;
        const formatted = Number(Math.abs(bal)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        if (bal === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={bal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
            Rs. {formatted} {bal > 0 ? "DR" : "CR"}
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
            label="Party" 
            variant="icon" 
          />
        </div>
      )
    }
  ], []);

  const filteredParties = useMemo(() => {
    return parties.filter((party) => {
      // 1. Active/Inactive status filter
      if (activeTab === "INACTIVE") {
        if (party.isActive) return false;
      } else {
        if (!party.isActive) return false;
      }

      // 2. Party Type Filter
      if (activeTab === "BUYER" && party.partyType !== "BUYER" && party.partyType !== "BOTH") return false;
      if (activeTab === "SUPPLIER" && party.partyType !== "SUPPLIER" && party.partyType !== "BOTH") return false;
      if (activeTab === "BOTH" && party.partyType !== "BOTH") return false;

      // 3. Search Query Filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchName = party.name?.toLowerCase().includes(query);
        const matchPhone = party.phoneNumber?.toLowerCase().includes(query);
        const matchAddress = party.address?.toLowerCase().includes(query);
        return matchName || matchPhone || matchAddress;
      }

      return true;
    });
  }, [parties, activeTab, searchQuery]);

  // Calculate dynamic tab counts based on active status
  const tabs = [
    { key: "ALL", label: "All", count: parties.filter(p => p.isActive).length },
    { key: "BUYER", label: "Buyer", count: parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH")).length },
    { key: "SUPPLIER", label: "Supplier", count: parties.filter(p => p.isActive && (p.partyType === "SUPPLIER" || p.partyType === "BOTH")).length },
    { key: "BOTH", label: "Both", count: parties.filter(p => p.isActive && p.partyType === "BOTH").length },
    { key: "INACTIVE", label: "Inactive", count: parties.filter(p => !p.isActive).length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parties</h1>
          <p className="text-muted-foreground">Manage your suppliers and buyers.</p>
        </div>
        <Link
          href="/parties/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Party
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <DebouncedSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
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
        data={filteredParties}
        columns={columns}
        rowClassName={(party) => !party.isActive ? "opacity-50" : ""}
        onRowClick={(party) => router.push(`/parties/${party.id}`)}
        emptyMessage="No parties found matching the criteria."
      />
    </div>
  );
}
