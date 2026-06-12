"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Edit2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deleteProductAction, hardDeleteProductAction } from "@/modules/products/controllers/productActions";
import { UnitService } from "@/modules/products/services/UnitService";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import DataTable from "@/components/ui/DataTable";
import PaginationControls from "@/components/ui/PaginationControls";

export default function ProductListClient({
  products = [],
  totalCount = 0,
  currentPage = 1,
  currentLimit = 50,
  currentSearch = "",
  currentSortField = "name",
  currentSortDirection = "asc"
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(currentSearch);

  // Sync internal search query state with URL changes
  useEffect(() => {
    setSearchQuery(currentSearch);
  }, [currentSearch]);

  const updateFilters = (updates) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    if (!("page" in updates)) {
      params.set("page", "1");
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  // Gracefully handle deleting last item on the page
  useEffect(() => {
    if (currentPage > 1 && products.length === 0) {
      updateFilters({ page: Math.max(1, currentPage - 1) });
    }
  }, [products, currentPage]);

  const handleSort = (field) => {
    let direction = "asc";
    if (currentSortField === field && currentSortDirection === "asc") {
      direction = "desc";
    }
    updateFilters({ sortField: field, sortDirection: direction });
  };

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

      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <DebouncedSearchInput
          value={searchQuery}
          onChange={(val) => updateFilters({ search: val })}
          placeholder="Search inventory..."
        />
      </div>

      <div className="space-y-4">
        <DataTable
          data={products}
          emptyMessage="No products found in catalog."
          containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
          rowClassName={(row) => cn(!row.isActive && "opacity-50")}
          sortField={currentSortField}
          sortDirection={currentSortDirection}
          onRequestSort={handleSort}
          columns={[
            {
              key: "name",
              label: "Product Name",
              className: "px-6 py-4 font-bold text-base flex items-center gap-3",
              render: (row, val) => (
                <>
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <span>{val}</span>
                </>
              ),
            },
            {
              key: "category",
              label: "Category",
              className: "px-6 py-4 text-center text-[10px] uppercase font-bold text-muted-foreground",
            },
            {
              key: "availableStock",
              label: "Available Quantity",
              className: "px-6 py-4 text-right font-mono text-lg font-black text-primary",
              render: (row, val) => {
                const displayQty = UnitService.getDisplayQuantity(val, row.primaryUnit, row);
                return (
                  <>
                    {displayQty.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    <span className="text-[10px] text-muted-foreground font-normal uppercase ml-1">
                      {row.primaryUnit}
                    </span>
                  </>
                );
              },
            },
            {
              key: "isActive",
              label: "Status",
              className: "px-6 py-4 text-center",
              render: (row, val) => (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                    val
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-rose-100 text-rose-700 border-rose-200"
                  )}
                >
                  {val ? "Active" : "Disabled"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              className: "px-6 py-4 text-center",
              sortable: false,
              render: (row) => (
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/products/${row.id}/edit`}
                    className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                  <DeleteButton
                    id={row.id}
                    deleteAction={deleteProductAction}
                    hardDeleteAction={hardDeleteProductAction}
                    label="Product"
                    variant="icon"
                  />
                </div>
              ),
            },
          ]}
        />

        <PaginationControls
          currentPage={currentPage}
          totalCount={totalCount}
          limit={currentLimit}
          onPageChange={(newPage) => updateFilters({ page: newPage })}
          onLimitChange={(newLimit) => updateFilters({ limit: newLimit })}
        />
      </div>
    </div>
  );
}
