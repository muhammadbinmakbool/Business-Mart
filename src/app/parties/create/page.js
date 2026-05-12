"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createPartyAction } from "@/modules/parties/controllers/partyActions";
import { PARTY_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreatePartyPage() {
  const router = useRouter();
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  async function handleSubmit(formData, shouldRedirect) {
    const result = await createPartyAction(formData);
    
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Party created successfully");
    
    if (shouldRedirect) {
      router.push("/parties");
    } else {
      formRef.current?.reset();
      nameInputRef.current?.focus();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/parties"
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Party</h1>
          <p className="text-sm text-muted-foreground">Create a new supplier or buyer in the system.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form 
          ref={formRef}
          action={(formData) => handleSubmit(formData, true)} 
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Party Name</label>
              <input
                ref={nameInputRef}
                id="name"
                name="name"
                required
                autoFocus
                placeholder="Enter full name"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                required
                placeholder="e.g. 0300-1234567"
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
              placeholder="Full physical address"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Any additional details"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Link
              href="/parties"
              className="px-4 py-2 text-sm text-center font-medium hover:bg-accent rounded-md transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => {
                const formData = new FormData(formRef.current);
                handleSubmit(formData, false);
              }}
              className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Save & Add Another
            </button>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Save & Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
