"use client";

import React, { useState } from "react";
import { updateProductAction } from "@/modules/products/controllers/productActions";
import { UNIT_CATEGORIES, UNITS, getUnitsByCategory, isProductSpecific, BASE_UNITS } from "@/lib/units";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";

export default function EditProductForm({ product }) {
  const router = useRouter();
  const [category, setCategory] = useState(product.category || UNIT_CATEGORIES.WEIGHT);
  const [primaryUnit, setPrimaryUnit] = useState(product.primaryUnit || "KG");

  async function handleSubmit(formData) {
    const result = await updateProductAction(product.id, formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Product updated successfully");
      router.push("/products");
    }
  }

  const compatibleUnits = getUnitsByCategory(category);
  const showConversion = isProductSpecific(primaryUnit);
  const baseUnit = BASE_UNITS[category];

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Product Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={product.name}
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
                    defaultValue={product.unitConversion ? Number(product.unitConversion) : ""}
                    placeholder="e.g. 50, 100"
                    className="w-32 rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-bold">{baseUnit}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            value="true"
            defaultChecked={product.isActive}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-sm font-medium">Product Active</label>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/products"
            className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Update Product
          </button>
        </div>
      </div>
    </form>
  );
}

