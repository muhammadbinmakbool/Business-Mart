"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { createProductAction } from "@/modules/products/controllers/productActions";
import { UNIT_CATEGORIES, UNITS, getUnitsByCategory, isProductSpecific, BASE_UNITS } from "@/lib/units";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreateProductPage() {
  const router = useRouter();
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  const [category, setCategory] = useState(UNIT_CATEGORIES.WEIGHT);
  const [primaryUnit, setPrimaryUnit] = useState("KG");

  async function handleSubmit(formData, shouldRedirect) {
    const result = await createProductAction(formData);
    
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Product created successfully");
    
    if (shouldRedirect) {
      router.push("/products");
    } else {
      formRef.current?.reset();
      setCategory(UNIT_CATEGORIES.WEIGHT);
      setPrimaryUnit("KG");
      nameInputRef.current?.focus();
    }
  }

  const compatibleUnits = getUnitsByCategory(category);
  const showConversion = isProductSpecific(primaryUnit);
  const baseUnit = BASE_UNITS[category];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-sm text-muted-foreground">Define a new item in your inventory catalog.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form 
          ref={formRef}
          action={(formData) => handleSubmit(formData, true)} 
          className="space-y-6"
        >
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Product Name</label>
            <input
              ref={nameInputRef}
              id="name"
              name="name"
              required
              autoFocus
              placeholder="e.g. Basmati Rice, Wheat, etc."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) => {
                    const newCat = e.target.value;
                    setCategory(newCat);
                    setPrimaryUnit(BASE_UNITS[newCat]);
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.values(UNIT_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="primaryUnit" className="text-sm font-medium">Primary Unit</label>
              <select
                id="primaryUnit"
                name="primaryUnit"
                value={primaryUnit}
                onChange={(e) => setPrimaryUnit(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {compatibleUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                ))}
              </select>
            </div>
          </div>

          {showConversion && (
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border animate-in fade-in slide-in-from-top-1">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <label htmlFor="unitConversion" className="text-sm font-bold">Unit Conversion</label>
                  <p className="text-xs text-muted-foreground">
                    Define how many <strong>{baseUnit}</strong> are in one <strong>{primaryUnit}</strong>.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium whitespace-nowrap">1 {primaryUnit} =</span>
                    <input
                        id="unitConversion"
                        name="unitConversion"
                        type="number"
                        step="0.0001"
                        required
                        placeholder="e.g. 50, 100"
                        className="w-32 rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-bold">{baseUnit}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Link
              href="/products"
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

