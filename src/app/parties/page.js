export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Phone, MapPin } from "lucide-react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { cn } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deletePartyAction } from "@/modules/parties/controllers/partyActions";

export default async function PartiesPage() {
  const parties = await PartyService.listParties();

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

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search parties..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {parties.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
            <p className="text-muted-foreground">No parties found. Create your first party to get started.</p>
          </div>
        ) : (
          parties.map((party) => (
            <div
              key={party.id}
              className={cn(
                "group relative rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md",
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
                <div className="flex items-center">
                  <Link
                    href={`/parties/${party.id}/edit`}
                    className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
