import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createProductAction } from "@/modules/products/controllers/productActions";
import { UNIT_TYPES } from "@/lib/constants";

export default function CreateProductPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Product</h1>
          <p className="text-sm text-muted-foreground">Add a new item to your catalog.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form action={createProductAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Product Name</label>
            <input
              id="name"
              name="name"
              required
              placeholder="e.g. Wheat, Rice, Empty Bag"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="unitType" className="text-sm font-medium">Unit Type</label>
            <select
              id="unitType"
              name="unitType"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={UNIT_TYPES.BAG}>Bag</option>
              <option value={UNIT_TYPES.KG}>KG</option>
              <option value={UNIT_TYPES.MAUND}>Maund</option>
              <option value={UNIT_TYPES.PIECE}>Piece</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
