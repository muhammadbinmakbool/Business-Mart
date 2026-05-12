"use client";

import React, { useRef } from "react";
import { recordAdvanceAction } from "@/modules/intake/controllers/advanceActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdvanceForm({ suppliers }) {
  const router = useRouter();
  const formRef = useRef(null);
  const supplierRef = useRef(null);

  async function handleSubmit(formData, shouldRedirect) {
    const result = await recordAdvanceAction(formData);
    
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Advance payment recorded successfully");
    
    if (shouldRedirect) {
      router.push("/advances");
    } else {
      formRef.current?.reset();
      supplierRef.current?.focus();
    }
  }

  return (
    <form 
      ref={formRef}
      action={(formData) => handleSubmit(formData, true)} 
      className="space-y-4"
    >
      <div className="space-y-2">
        <label htmlFor="partyId" className="text-sm font-medium">Supplier</label>
        <select
          ref={supplierRef}
          id="partyId"
          name="partyId"
          required
          autoFocus
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select a supplier...</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.phoneNumber})</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium">Amount (Rs.)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          required
          placeholder="0.00"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">Remarks (Optional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="e.g. Paid for previous pending balance"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
        <Link
          href="/advances"
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
          Record Payment
        </button>
      </div>
    </form>
  );
}
