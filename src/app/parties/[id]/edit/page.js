import React from "react";
import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { updatePartyAction } from "@/modules/parties/controllers/partyActions";
import { PARTY_TYPES } from "@/lib/constants";
import { notFound } from "next/navigation";

export default async function EditPartyPage({ params }) {
  const { id } = await params;
  const party = await PartyService.getParty(id);

  if (!party) {
    notFound();
  }

  const updateActionWithId = updatePartyAction.bind(null, id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/parties"
            className="rounded-full p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Party</h1>
            <p className="text-sm text-muted-foreground">Modify party details or status.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form action={updateActionWithId} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Party Name</label>
              <input
                id="name"
                name="name"
                required
                defaultValue={party.name}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                required
                defaultValue={party.phoneNumber}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="partyType" className="text-sm font-medium">Party Type</label>
              <select
                id="partyType"
                name="partyType"
                required
                defaultValue={party.partyType}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={PARTY_TYPES.BUYER}>Buyer</option>
                <option value={PARTY_TYPES.SUPPLIER}>Supplier</option>
                <option value={PARTY_TYPES.BOTH}>Both (Supplier & Buyer)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="isActive" className="text-sm font-medium">Account Status</label>
              <select
                id="isActive"
                name="isActive"
                required
                defaultValue={party.isActive ? "true" : "false"}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="true">Active</option>
                <option value="false">Inactive (Soft Disable)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium">Address (Optional)</label>
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={party.address || ""}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={party.notes || ""}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              href="/parties"
              className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Update Party
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
