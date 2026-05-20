"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deleteProductAction } from "@/modules/products/controllers/productActions";
import { UnitService } from "@/modules/products/services/UnitService";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";

export default function ProductListClient({ products = [] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase();
      const matchName = product.name?.toLowerCase().includes(query);
      const matchCategory = product.category?.toLowerCase().includes(query);
      return matchName || matchCategory;
    });
  }, [products, searchQuery]);

  const {
    sortedData: sortedProducts,
    sortField,
    sortDirection,
    requestSort,
  } = useTableSorting(filteredProducts, "name", "asc");

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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search inventory..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                <SortableHeader
                  field="name"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="px-6"
                >
                  Product Name
                </SortableHeader>
                <SortableHeader
                  field="category"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-center px-6"
                >
                  Category
                </SortableHeader>
                <SortableHeader
                  field="availableStock"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right px-6"
                >
                  Available Quantity
                </SortableHeader>
                <SortableHeader
                  field="isActive"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-center px-6"
                >
                  Status
                </SortableHeader>
                <th className="px-6 py-3 font-semibold text-center select-none">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                    No products found in catalog.
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => {
                  const displayQty = UnitService.getDisplayQuantity(
                    product.availableStock,
                    product.primaryUnit,
                    product
                  );

                  return (
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
                      <td className="px-6 py-4 text-center text-[10px] uppercase font-bold text-muted-foreground">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-lg font-black text-primary">
                        {displayQty.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-[10px] text-muted-foreground font-normal uppercase ml-1">
                          {product.primaryUnit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                            product.isActive
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-rose-100 text-rose-700 border-rose-200"
                          )}
                        >
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
