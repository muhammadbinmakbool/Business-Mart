"use client";

import React from "react";
import { updatePartyAction } from "@/modules/parties/controllers/partyActions";
import { PARTY_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditPartyForm({ party }) {
  const router = useRouter();

  async function handleSubmit(formData) {
    const result = await updatePartyAction(party.id, formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Party updated successfully");
      router.push("/parties");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
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

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            value="true"
            defaultChecked={party.isActive}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-sm font-medium">Account Active</label>
        </div>

        <div className="flex justify-end gap-3">
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
      </div>
    </form>
  );
}
