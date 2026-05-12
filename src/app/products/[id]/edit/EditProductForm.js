"use client";

import React from "react";
import { updateProductAction } from "@/modules/products/controllers/productActions";
import { UNIT_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditProductForm({ product }) {
  const router = useRouter();

  async function handleSubmit(formData) {
    const result = await updateProductAction(product.id, formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Product updated successfully");
      router.push("/products");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
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

      <div className="space-y-2">
        <label htmlFor="unitType" className="text-sm font-medium">Standard Unit</label>
        <select
          id="unitType"
          name="unitType"
          required
          defaultValue={product.unitType}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={UNIT_TYPES.BAG}>Bag</option>
          <option value={UNIT_TYPES.KG}>KG</option>
          <option value={UNIT_TYPES.MAUND}>Maund</option>
          <option value={UNIT_TYPES.PIECE}>Piece</option>
        </select>
      </div>

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
