"use client";

import React, { useRef, useState, useMemo } from "react";
import { recordAdvanceAction } from "@/modules/intake/controllers/advanceActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function AdvanceForm({ suppliers, backUrl }) {
  const router = useRouter();
  const formRef = useRef(null);
  const supplierRef = useRef(null);
  const [supplierId, setSupplierId] = useState("");

  const supplierOptions = useMemo(() => suppliers.map(s => ({
    value: s.id.toString(),
    label: s.name,
    subLabel: s.phoneNumber
  })), [suppliers]);

  async function handleSubmit(formData, shouldRedirect) {
    const result = await recordAdvanceAction(formData);
    
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Advance payment recorded successfully");
    
    if (shouldRedirect) {
      router.push(backUrl || "/advances");
    } else {
      formRef.current?.reset();
      setSupplierId("");
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
        <SearchableSelect
          ref={supplierRef}
          id="partyId"
          name="partyId"
          required
          value={supplierId}
          onChange={setSupplierId}
          options={supplierOptions}
          placeholder="Select a supplier..."
        />
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
          href={backUrl || "/advances"}
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
