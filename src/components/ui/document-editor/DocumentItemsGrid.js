"use client";

import React, { useMemo } from "react";
import { Trash2, Plus } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";

/**
 * DocumentItemsGrid Component
 * Presentation-only grid of items. Renders a table of editable cells,
 * forwarding value changes and keyboard events to the parent controller.
 */
export default function DocumentItemsGrid({
  items = [],
  products = [],
  unitRegistry = null,
  onCellChange,
  onKeyDown,
  onAddRow,
  onDeleteRow,
}) {
  // Memoize product options for SearchableSelect
  const productOptions = useMemo(() => {
    return products.map((p) => ({
      value: p.id.toString(),
      label: p.name,
      subLabel: p.sku || `ID: ${p.id}`,
    }));
  }, [products]);

  // Helper to resolve compatible units for a selected product
  const getCompatibleUnits = (productId) => {
    const selectedProduct = products.find((p) => p.id === parseInt(productId));
    if (!selectedProduct) return [{ id: "KG", name: "Kilogram" }];

    const isProdBag =
      unitRegistry && selectedProduct.primaryUnit
        ? unitRegistry.units[selectedProduct.primaryUnit]?.isCustom === true
        : selectedProduct.primaryUnit === "BAG" || selectedProduct.category === "BAG";

    if (isProdBag) {
      if (unitRegistry) {
        return Object.values(unitRegistry.units)
          .filter((u) => u.code === selectedProduct.primaryUnit)
          .map((u) => ({ id: u.code, name: u.name }));
      }
      return [{ id: selectedProduct.primaryUnit, name: selectedProduct.primaryUnit }];
    }

    if (unitRegistry) {
      const targetCategory = selectedProduct.unitCategory || selectedProduct.category;
      return Object.values(unitRegistry.units)
        .filter((u) => u.unitCategoryCode === targetCategory)
        .map((u) => ({ id: u.code, name: u.name }));
    }

    return [{ id: "KG", name: "Kilogram" }];
  };

  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              <th className="px-4 py-3 w-[6%] text-center">#</th>
              <th className="px-4 py-3 w-[35%]">Product</th>
              <th className="px-4 py-3 w-[15%]">Qty / Weight</th>
              <th className="px-4 py-3 w-[12%]">Unit</th>
              <th className="px-4 py-3 w-[16%]">Rate</th>
              <th className="px-4 py-3 w-[12%] text-right">Amount</th>
              <th className="px-4 py-3 w-[4%] text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {items.map((item, index) => {
              const compatibleUnits = getCompatibleUnits(item.productId);

              return (
                <tr key={item.id || index} className="hover:bg-muted/10 transition-colors">
                  {/* # Index */}
                  <td className="px-4 py-2 text-center text-xs font-mono text-muted-foreground">
                    {index + 1}
                  </td>

                  {/* Product Selector */}
                  <td className="px-3 py-1.5">
                    <SearchableSelect
                      id={`cell-${index}-productId`}
                      value={item.productId}
                      onChange={(val) => onCellChange(index, "productId", val)}
                      options={productOptions}
                      placeholder="Search product..."
                      variant="compact"
                      onKeyDown={(e, isOpen) => onKeyDown(index, "productId", e, isOpen)}
                    />
                  </td>

                  {/* Weight/Quantity Input */}
                  <td className="px-3 py-1.5">
                    <input
                      id={`cell-${index}-weight`}
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={item.weight}
                      onChange={(e) => onCellChange(index, "weight", e.target.value)}
                      onKeyDown={(e) => onKeyDown(index, "weight", e)}
                      className="w-full bg-background border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-1.5 text-xs text-foreground outline-none font-mono font-medium transition-all"
                    />
                  </td>

                  {/* Unit Selector */}
                  <td className="px-3 py-1.5">
                    <select
                      id={`cell-${index}-unit`}
                      value={item.unit}
                      onChange={(e) => onCellChange(index, "unit", e.target.value)}
                      onKeyDown={(e) => onKeyDown(index, "unit", e)}
                      className="w-full bg-background border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-1.5 text-xs text-foreground outline-none font-semibold transition-all cursor-pointer"
                    >
                      <option value="" disabled>Unit</option>
                      {compatibleUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.id}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Rate Input & Rate Unit Selector */}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        id={`cell-${index}-rate`}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={item.rate}
                        onChange={(e) => onCellChange(index, "rate", e.target.value)}
                        onKeyDown={(e) => onKeyDown(index, "rate", e)}
                        className="w-full bg-background border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-1.5 text-xs text-foreground outline-none font-mono font-medium transition-all"
                      />
                      <select
                        id={`cell-${index}-rateUnit`}
                        value={item.rateUnit || item.unit || ""}
                        onChange={(e) => onCellChange(index, "rateUnit", e.target.value)}
                        className="bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase rounded-xl px-2.5 py-2 border-none outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer shrink-0"
                      >
                        <option value="" disabled>/</option>
                        {compatibleUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            /{u.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Subtotal (Precalculated) */}
                  <td className="px-4 py-2 text-right font-mono text-xs font-bold text-foreground">
                    {item.amount
                      ? Number(item.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "0.00"}
                  </td>

                  {/* Delete Button */}
                  <td className="px-3 py-1.5 text-center">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => onDeleteRow(index)}
                      className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl transition-colors cursor-pointer"
                      title="Remove Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Empty State */}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic bg-muted/5">
                  No items added. Click below or scan to add products.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Row Bar */}
      <div className="p-3 border-t border-border/40 bg-muted/10 flex justify-between items-center">
        <button
          type="button"
          onClick={onAddRow}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer border border-primary/20 bg-background px-3.5 py-1.5 rounded-xl hover:bg-primary/5 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
          Press Enter or Tab to navigate cells
        </span>
      </div>
    </div>
  );
}
