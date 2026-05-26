"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit2, Phone, MapPin, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deletePartyAction } from "@/modules/parties/controllers/partyActions";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";

export default function PartyListClient({ parties = [] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  const filteredParties = useMemo(() => {
    return parties.filter((party) => {
      // 1. Party Type Filter
      if (activeTab === "BUYER" && party.partyType !== "BUYER" && party.partyType !== "BOTH") return false;
      if (activeTab === "SUPPLIER" && party.partyType !== "SUPPLIER" && party.partyType !== "BOTH") return false;
      if (activeTab === "BOTH" && party.partyType !== "BOTH") return false;

      // 2. Search Query Filter
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

  // Calculate dynamic tab counts
  const tabs = [
    { key: "ALL", label: "All", count: parties.length },
    { key: "BUYER", label: "Buyer", count: parties.filter(p => p.partyType === "BUYER" || p.partyType === "BOTH").length },
    { key: "SUPPLIER", label: "Supplier", count: parties.filter(p => p.partyType === "SUPPLIER" || p.partyType === "BOTH").length },
    { key: "BOTH", label: "Both", count: parties.filter(p => p.partyType === "BOTH").length },
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
        <DebouncedSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search parties by name, phone or address..."
        />
      </div>

      <StatusFilterTabs 
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={tabs}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredParties.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
            <p className="text-muted-foreground">No parties found matching the criteria.</p>
          </div>
        ) : (
          filteredParties.map((party) => (
            <div
              key={party.id}
              onClick={() => router.push(`/parties/${party.id}`)}
              className={cn(
                "group relative rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md cursor-pointer",
                !party.isActive && "opacity-60 grayscale-[0.5]"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{party.name}</h3>
                    <span className={cn(
                      "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm border",
                      party.partyType === "SUPPLIER" ? "bg-blue-600 text-white border-blue-700" :
                      party.partyType === "BUYER" ? "bg-emerald-600 text-white border-emerald-700" :
                      "bg-violet-600 text-white border-violet-700"
                    )}>
                      {party.partyType}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {party.phoneNumber}
                    </div>
                    {party.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{party.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/parties/${party.id}`}
                    className="rounded-full p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    title="View Profile"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/parties/${party.id}/edit`}
                    className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={(e) => { e.stopPropagation(); }}
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
              </div>
              
              {!party.isActive && (
                <div className="mt-3 text-[10px] font-bold text-destructive uppercase tracking-wider">
                  Inactive
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
