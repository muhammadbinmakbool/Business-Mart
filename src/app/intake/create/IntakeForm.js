"use client";

import React, { useRef } from "react";
import { createIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function IntakeForm({ suppliers, products }) {
  const router = useRouter();
  const formRef = useRef(null);
  const supplierRef = useRef(null);

  async function handleSubmit(formData, shouldRedirect) {
    const result = await createIntakeAction(formData);
    
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Intake recorded successfully");
    
    if (shouldRedirect) {
      router.push("/intake");
    } else {
      formRef.current?.reset();
      supplierRef.current?.focus();
    }
  }

  return (
    <form 
      ref={formRef}
      action={(formData) => handleSubmit(formData, true)} 
      className="space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Supplier */}
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

        {/* 2. Product */}
        <div className="space-y-2">
          <label htmlFor="productId" className="text-sm font-medium">Product</label>
          <select
            id="productId"
            name="productId"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a product...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.unitType})</option>
            ))}
          </select>
        </div>

        {/* 3. Bag Count */}
        <div className="space-y-2">
          <label htmlFor="bagCount" className="text-sm font-medium">Bag Count (Optional)</label>
          <input
            id="bagCount"
            name="bagCount"
            type="number"
            placeholder="e.g. 50"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 4. Weight */}
        <div className="space-y-2">
          <label htmlFor="grossWeight" className="text-sm font-medium">Gross Weight</label>
          <div className="relative">
            <input
              id="grossWeight"
              name="grossWeight"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="entryDate" className="text-sm font-medium">Entry Date</label>
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* 5. Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Truck number, location, etc."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* 6. Advance Payment */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-4 border">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Advance Payment (Optional)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="advanceAmount" className="text-sm font-medium">Amount Paid</label>
            <input
              id="advanceAmount"
              name="advanceAmount"
              type="number"
              placeholder="0.00"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="advanceNotes" className="text-sm font-medium">Advance Remarks</label>
            <input
              id="advanceNotes"
              name="advanceNotes"
              placeholder="e.g. Paid via Cash"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
        <Link
          href="/intake"
          className="px-6 py-2 text-sm text-center font-medium hover:bg-accent rounded-md transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => {
            const formData = new FormData(formRef.current);
            handleSubmit(formData, false);
          }}
          className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-6 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Save & Add Another
        </button>
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Complete Intake
        </button>
      </div>
    </form>
  );
}
