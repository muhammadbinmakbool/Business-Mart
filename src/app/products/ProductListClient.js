"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Edit2, Package, Filter, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deleteProductAction, hardDeleteProductAction } from "@/modules/products/controllers/productActions";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import DataTable from "@/components/ui/DataTable";
import PaginationControls from "@/components/ui/PaginationControls";
import { useHeaderAction } from "@/components/layout/HeaderActionContext";
import StatusFilterTabs from "@/components/StatusFilterTabs";
import { getUnitLabel } from "@/lib/units";
import Modal from "@/components/ui/Modal";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatUnitDisplay } from "@/lib/formatters/unitFormatter";
import { formatCurrency } from "@/lib/formatters/financialFormatter";

export default function ProductListClient({
  products = [],
  totalCount = 0,
  tabCounts = { all: 0, active: 0, inactive: 0 },
  currentPage = 1,
  currentLimit = 50,
  currentSearch = "",
  currentTab = "ALL",
  currentSortField = "name",
  currentSortDirection = "asc"
}) {
  const { settings, decimalPlaces, currencySymbol } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setHeaderAction } = useHeaderAction();

  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Register the action button in the persistent tab row
  useEffect(() => {
    setHeaderAction(
      <Link
        href="/products/create"
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Add Product
      </Link>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction]);

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

  const tabs = [
    { key: "ALL", label: "All", count: tabCounts.all },
    { key: "ACTIVE", label: "Active", count: tabCounts.active },
    { key: "INACTIVE", label: "Inactive", count: tabCounts.inactive },
  ];

  return (
    <div className="space-y-4">

      {/* Search and Filter Row */}
      <div>
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <DebouncedSearchInput
              value={searchQuery}
              onChange={(val) => updateFilters({ search: val })}
              placeholder="Search inventory..."
            />
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                showFilters
                  ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  : "bg-card text-muted-foreground border-muted hover:text-foreground hover:bg-muted/10"
              )}
              title={showFilters ? "Hide Filters" : "Show Filters"}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        <div 
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            showFilters ? "opacity-100 max-h-32 mt-4" : "opacity-0 max-h-0 pointer-events-none mt-0"
          )}
        >
          <StatusFilterTabs 
            activeTab={currentTab}
            onChange={(newTab) => updateFilters({ tab: newTab })}
            tabs={tabs}
          />
        </div>
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
              key: "productCategory",
              label: "Category Group",
              className: "px-6 py-4 text-center text-sm font-semibold text-muted-foreground",
              render: (row) => {
                const groupName = row.productCategory?.name;
                const unitCat = row.unitCategory || row.category || "WEIGHT";
                return (
                  <div className="flex flex-col items-center">
                    {groupName ? (
                      <span className="font-bold text-foreground">{groupName}</span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground/75">No Category Group</span>
                    )}
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mt-0.5">
                      ({unitCat})
                    </span>
                  </div>
                );
              }
            },
            {
              key: "availableStock",
              label: "Available Quantity",
              className: "px-6 py-4 text-right font-mono text-lg font-black text-primary",
              render: (row, val) => {
                const displayQty = typeof row.displayStock === "number" ? row.displayStock : 0;
                return formatUnitDisplay(displayQty, row.primaryUnit, row, "en", null, settings);
              },
            },
            {
              key: "defaultBuyingRate",
              label: "Buying Rate",
              className: "px-6 py-4 text-right font-mono text-sm whitespace-nowrap",
              render: (row, val) => {
                if (val === null || val === undefined) return "-";
                const unitLabel = getUnitLabel(row.buyingRateUnit || "KG");
                return (
                  <>
                    <span className="font-semibold text-foreground">{formatCurrency(val, "en", currencySymbol, decimalPlaces)}</span>
                    <span className="text-[10px] text-muted-foreground uppercase ml-1">/ {unitLabel}</span>
                  </>
                );
              }
            },
            {
              key: "defaultSellingRate",
              label: "Selling Rate",
              className: "px-6 py-4 text-right font-mono text-sm whitespace-nowrap",
              render: (row, val) => {
                if (val === null || val === undefined) return "-";
                const unitLabel = getUnitLabel(row.sellingRateUnit || "KG");
                return (
                  <>
                    <span className="font-semibold text-foreground">{formatCurrency(val, "en", currencySymbol, decimalPlaces)}</span>
                    <span className="text-[10px] text-muted-foreground uppercase ml-1">/ {unitLabel}</span>
                  </>
                );
              }
            },
            {
              key: "actions",
              label: "Actions",
              className: "px-6 py-4 text-center",
              sortable: false,
              render: (row) => (
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(row)}
                    className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    title="View Product Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
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

      <Modal
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        title="Product Details"
        type="info"
        size="lg"
        cancelLabel="Close"
      >
        {selectedProduct && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center gap-4 pb-4 border-b border-border/60">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground leading-snug">{selectedProduct.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedProduct.productCategory?.name || "No Category Group"} ({selectedProduct.unitCategory || selectedProduct.category || "WEIGHT"})
                </p>
              </div>
            </div>

            {/* Two column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Stock Details */}
              <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border/50">
                <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/40 pb-1.5 mb-2">Inventory & Unit Settings</h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Available Stock:</span>
                    <span className="font-mono font-bold text-primary text-sm">
                      {formatUnitDisplay(typeof selectedProduct.displayStock === "number" ? selectedProduct.displayStock : 0, selectedProduct.primaryUnit, selectedProduct, "en", null, settings)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Primary Unit:</span>
                    <span className="text-xs font-semibold text-foreground">{selectedProduct.primaryUnit}</span>
                  </div>
                  {selectedProduct.unitConversion && (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-xs font-medium text-muted-foreground">Unit Conversion:</span>
                      <span className="text-xs font-semibold text-foreground">
                        1 BAG = {formatUnitDisplay(Number(selectedProduct.unitConversion), "KG", null, "en", null, settings)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rates Details */}
              <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border/50">
                <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/40 pb-1.5 mb-2">Default Rate Settings</h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Buying Rate:</span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedProduct.defaultBuyingRate !== null && selectedProduct.defaultBuyingRate !== undefined ? (
                        <>{formatCurrency(selectedProduct.defaultBuyingRate, "en", currencySymbol, decimalPlaces)} / {getUnitLabel(selectedProduct.buyingRateUnit || "KG")}</>
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Selling Rate:</span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedProduct.defaultSellingRate !== null && selectedProduct.defaultSellingRate !== undefined ? (
                        <>{formatCurrency(selectedProduct.defaultSellingRate, "en", currencySymbol, decimalPlaces)} / {getUnitLabel(selectedProduct.sellingRateUnit || "KG")}</>
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Selling Unit:</span>
                    <span className="text-xs font-semibold text-foreground">{selectedProduct.defaultSellingUnit || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta & System Info */}
            <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border/50">
              <h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/40 pb-1.5 mb-2">System & Audit Info</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Status:</span>
                    <span className={cn(
                      "font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border",
                      selectedProduct.isActive 
                        ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40" 
                        : "bg-rose-100/50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40"
                    )}>
                      {selectedProduct.isActive ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Sort Order:</span>
                    <span className="text-xs font-mono font-semibold text-foreground">{selectedProduct.displayOrder ?? "0"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Created At:</span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Updated At:</span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedProduct.updatedAt ? new Date(selectedProduct.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
