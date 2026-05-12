"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createProductAction } from "@/modules/products/controllers/productActions";
import { UNIT_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreateProductPage() {
  const router = useRouter();
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

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
      nameInputRef.current?.focus();
    }
  }

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
          className="space-y-4"
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

          <div className="space-y-2">
            <label htmlFor="unitType" className="text-sm font-medium">Standard Unit</label>
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
