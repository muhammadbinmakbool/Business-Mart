export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Package } from "lucide-react";
import { ProductService } from "@/modules/products/services/ProductService";
import { cn } from "@/lib/utils";

export default async function ProductsPage() {
  const products = await ProductService.listProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog and unit types.</p>
        </div>
        <Link
          href="/products/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search products..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
            <p className="text-muted-foreground">No products found. Add your first product.</p>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className={cn(
                "group relative rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
                !product.isActive && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <Link
                  href={`/products/${product.id}/edit`}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Link>
              </div>
              <h3 className="font-semibold text-base mb-1">{product.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Unit: {product.unitType}</span>
                {!product.isActive && (
                  <span className="text-[10px] font-bold text-destructive uppercase">Disabled</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
