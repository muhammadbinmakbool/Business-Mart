"use client";

import React from "react";
import { updateIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditIntakeForm({ intake, suppliers, products }) {
  const router = useRouter();

  async function handleSubmit(formData) {
    const result = await updateIntakeAction(intake.id, formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Intake updated successfully");
      router.push(`/intake/${intake.id}`);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="partyId" className="text-sm font-medium">Supplier</label>
          <select
            id="partyId"
            name="partyId"
            required
            defaultValue={intake.partyId}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="productId" className="text-sm font-medium">Product</label>
          <select
            id="productId"
            name="productId"
            required
            defaultValue={intake.productId}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="bagCount" className="text-sm font-medium">Bag Count</label>
          <input
            id="bagCount"
            name="bagCount"
            type="number"
            defaultValue={intake.bagCount || ""}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="grossWeight" className="text-sm font-medium">Gross Weight</label>
          <input
            id="grossWeight"
            name="grossWeight"
            type="number"
            step="0.01"
            required
            defaultValue={Number(intake.grossWeight)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="entryDate" className="text-sm font-medium">Entry Date</label>
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            required
            defaultValue={new Date(intake.entryDate).toISOString().split('T')[0]}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select
            id="status"
            name="status"
            required
            defaultValue={intake.status}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={intake.notes || ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Link
          href={`/intake/${intake.id}`}
          className="px-6 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
