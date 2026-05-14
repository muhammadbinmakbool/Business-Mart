export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Package } from "lucide-react";
import { ProductService } from "@/modules/products/services/ProductService";
import { cn } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deleteProductAction } from "@/modules/products/controllers/productActions";

export default async function ProductsPage() {
  const products = await ProductService.listProductsWithStock();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory / Products</h1>
          <p className="text-muted-foreground">Derived real-time stock based on Intakes and Sales.</p>
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
          placeholder="Search inventory..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-center">Unit</th>
                <th className="px-6 py-4 text-right">Available Quantity</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                    No products found in catalog.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr 
                    key={product.id} 
                    className={cn(
                      "hover:bg-muted/30 transition-colors group",
                      !product.isActive && "opacity-50"
                    )}
                  >
                    <td className="px-6 py-4 font-bold text-base flex items-center gap-3">
                       <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-4 w-4 text-primary" />
                       </div>
                       {product.name}
                    </td>
                    <td className="px-6 py-4 text-center text-muted-foreground">
                      {product.unitType}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-lg font-black text-primary">
                      {product.availableStock.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal uppercase">{product.unitType}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                        product.isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"
                      )}>
                        {product.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <DeleteButton 
                          id={product.id} 
                          deleteAction={deleteProductAction} 
                          label="Product" 
                          variant="icon" 
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
