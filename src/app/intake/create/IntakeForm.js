"use client";

import React, { useRef, useState } from "react";

import { createIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUnitsByCategory } from "@/lib/units";
import { getPreferredWeightUnit } from "@/lib/display-units";

export default function IntakeForm({ suppliers, products }) {
  const router = useRouter();
  const formRef = useRef(null);
  const supplierRef = useRef(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));
  const compatibleUnits = selectedProduct ? getUnitsByCategory(selectedProduct.category) : [];

  const handleProductChange = (productId) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === parseInt(productId));
    if (prod) {
      const units = getUnitsByCategory(prod.category);
      const prefUnit = getPreferredWeightUnit();
      const isPrefCompatible = units.some(u => u.id === prefUnit);
      setSelectedUnit(isPrefCompatible ? prefUnit : (prod.primaryUnit || "KG"));
    } else {
      setSelectedUnit("");
    }
  };

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
      setSelectedProductId("");
      setSelectedUnit("");
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
            onChange={(e) => setIsNewSupplier(e.target.value === "new")}
            className="w-full rounded-md border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            <option value="" className="bg-background text-foreground">Select a supplier...</option>
            <option value="new" className="font-bold text-primary bg-background">➕ Add New Supplier</option>
            <hr />
            {suppliers.map(s => (
              <option key={s.id} value={s.id} className="bg-background text-foreground">
                {s.name} ({s.phoneNumber})
              </option>
            ))}
          </select>
        </div>

        {/* ... (New Supplier Fields remain unchanged) ... */}
        {isNewSupplier && (
          <div className="md:col-span-2 bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">New Supplier Details</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="newName" className="text-xs font-bold uppercase text-muted-foreground">Supplier Name</label>
                <input
                  id="newName"
                  name="newName"
                  required={isNewSupplier}
                  placeholder="e.g. Haji Ahmad"
                  className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="newPhone" className="text-xs font-bold uppercase text-muted-foreground">Phone Number</label>
                <input
                  id="newPhone"
                  name="newPhone"
                  required={isNewSupplier}
                  placeholder="e.g. 03001234567"
                  className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="newAddress" className="text-xs font-bold uppercase text-muted-foreground">Address (Optional)</label>
                <input
                  id="newAddress"
                  name="newAddress"
                  placeholder="Street, City, etc."
                  className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="newPartyNotes" className="text-xs font-bold uppercase text-muted-foreground">Supplier Notes (Optional)</label>
                <textarea
                  id="newPartyNotes"
                  name="newPartyNotes"
                  rows={2}
                  placeholder="Special instructions about this supplier..."
                  className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Product */}
        <div className="space-y-2">
          <label htmlFor="productId" className="text-sm font-medium">Product</label>
          <select
            id="productId"
            name="productId"
            required
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full rounded-md border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            <option value="" className="bg-background text-foreground">Select a product...</option>
            {products.map(p => (
              <option key={p.id} value={p.id} className="bg-background text-foreground">{p.name}</option>
            ))}
          </select>
        </div>

        {/* 3. Unit Selection */}
        <div className="space-y-2">
          <label htmlFor="unit" className="text-sm font-medium">Measurement Unit</label>
          <select
            id="unit"
            name="unit"
            required
            disabled={!selectedProductId}
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {compatibleUnits.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
            ))}
            {!selectedProductId && <option value="">Select a product first...</option>}
          </select>
        </div>

        {/* 4. Weight */}
        <div className="space-y-2">
          <label htmlFor="grossWeight" className="text-sm font-medium">Gross Weight</label>
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

        {/* 5. Bag Count */}
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

      {/* ... (Rest of the form remains unchanged) ... */}
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

