"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { Trash2, CornerDownRight } from "lucide-react";
import { getUnitsByCategory } from "@/lib/units";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function TransactionProductTable({
  items = [],
  products = [],
  onChangeItem,
  onAddItem,
  onRemoveItem,
  focusedRowIndex,
  setFocusedRowIndex,
  unitRegistry = null
}) {
  const tableRef = useRef(null);

  // Memoize product options for SearchableSelect
  const productOptions = useMemo(() => {
    return products.map(p => ({
      value: p.id.toString(),
      label: p.name,
      subLabel: p.sku || `ID: ${p.id}`
    }));
  }, [products]);

  // Focus utility helper
  const focusCell = (rowIndex, fieldName) => {
    // For SearchableSelect, the focused button has id cell-rowIndex-productId
    const input = document.getElementById(`cell-${rowIndex}-${fieldName}`);
    if (input) {
      input.focus();
      if (input.select) input.select();
      setFocusedRowIndex(rowIndex);
      return true;
    }
    return false;
  };

  // Keyboard navigation logic
  const handleKeyDown = (e, index, field) => {
    if (e.key === "Escape") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(index + 1, field);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(index - 1, field);
    } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      if (field === "productId") {
        focusCell(index, "weight");
      } else if (field === "weight") {
        focusCell(index, "unit");
      } else if (field === "unit") {
        focusCell(index, "rate");
      } else if (field === "rate") {
        if (index < items.length - 1) {
          focusCell(index + 1, "productId");
        }
      }
    }
  };

  // Keyboard handler specifically for SearchableSelect inside row cells
  const handleProductSelectKeyDown = (e, index, isOpen) => {
    if (isOpen) return; // Let SearchableSelect handle dropdown list navigation

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(index + 1, "productId");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(index - 1, "productId");
    } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      focusCell(index, "weight");
    }
  };

  return (
    <div ref={tableRef} className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm backdrop-blur-md flex flex-col flex-1 min-h-0">
      <div className="overflow-y-auto flex-1 min-h-0">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
            <tr className="border-b text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
              <th className="px-3 py-1.5 w-[8%] text-center">#</th>
              <th className="px-3 py-1.5 w-[35%]">Product Name</th>
              <th className="px-3 py-1.5 w-[15%]">Quantity</th>
              <th className="px-3 py-1.5 w-[12%]">Unit</th>
              <th className="px-3 py-1.5 w-[15%]">Rate (PKR)</th>
              <th className="px-3 py-1.5 w-[15%] text-right">Amount</th>
              <th className="px-3 py-1.5 w-[5%] text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {items.map((item, index) => {
              const selectedProduct = products.find(p => p.id === parseInt(item.productId));
              const isProdBag = selectedProduct && (
                unitRegistry
                  ? unitRegistry.units[selectedProduct.primaryUnit]?.isCustom === true
                  : (selectedProduct.primaryUnit === "BAG" || selectedProduct.category === "BAG")
              );
              const compatibleUnits = selectedProduct
                ? (isProdBag
                    ? (unitRegistry
                        ? Object.values(unitRegistry.units).filter(u => u.code === selectedProduct.primaryUnit).map(u => ({ id: u.code, name: u.name }))
                        : getUnitsByCategory(selectedProduct.category).filter(u => u.id === selectedProduct.primaryUnit))
                    : (unitRegistry
                        ? Object.values(unitRegistry.units).filter(u => u.unitCategoryCode === (selectedProduct.unitCategory || selectedProduct.category)).map(u => ({ id: u.code, name: u.name }))
                        : getUnitsByCategory(selectedProduct.category)))
                : [];
              
              const isFocused = focusedRowIndex === index;

              return (
                <tr 
                  key={item.id}
                  className={`transition-colors group ${
                    isFocused 
                      ? "bg-primary/5 border-l-2 border-l-primary" 
                      : "hover:bg-muted/30 border-l-2 border-l-transparent"
                  }`}
                  onClick={() => setFocusedRowIndex(index)}
                >
                  {/* Row index indicator */}
                  <td className="px-3 py-1 text-center text-[11px] font-mono text-muted-foreground">
                    {index + 1}
                  </td>

                  {/* Product Column */}
                  <td className="px-2 py-0.5">
                    <SearchableSelect
                      id={`cell-${index}-productId`}
                      value={item.productId}
                      onChange={(val) => onChangeItem(index, "productId", val)}
                      options={productOptions}
                      placeholder="Search product..."
                      variant="compact"
                      onKeyDown={(e, isOpen) => handleProductSelectKeyDown(e, index, isOpen)}
                    />
                  </td>

                  <td className="px-2 py-0.5">
                    <div className="flex items-center gap-1 w-full">
                      <input
                        id={`cell-${index}-weight`}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={item.weight}
                        onFocus={(e) => {
                          e.target.select();
                          setFocusedRowIndex(index);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index, "weight")}
                        onChange={(e) => onChangeItem(index, "weight", e.target.value)}
                        className="flex-1 bg-transparent border-0 focus:ring-1 focus:ring-primary rounded-md px-1.5 py-1 text-xs text-foreground outline-none font-mono font-medium"
                        readOnly={item.useHelper}
                      />
                      <label className="inline-flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase cursor-pointer select-none shrink-0 px-1">
                        <input
                          type="checkbox"
                          checked={item.useHelper || false}
                          onChange={(e) => onChangeItem(index, "useHelper", e.target.checked)}
                          className="rounded border-muted text-primary focus:ring-primary h-3 w-3"
                        />
                        Helper
                      </label>
                    </div>
                    {item.useHelper && (
                      <div className="mt-1 px-1.5">
                        <div className="grid grid-cols-3 gap-0.5 bg-muted/30 p-1 rounded border border-border">
                          <input
                            type="text"
                            placeholder="Type"
                            value={item.helperUnitLabel || ""}
                            onChange={(e) => onChangeItem(index, "helperUnitLabel", e.target.value)}
                            className="w-full bg-background border-none rounded px-1 py-0.5 text-[9px] font-medium outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.helperQuantity || ""}
                            onChange={(e) => onChangeItem(index, "helperQuantity", e.target.value)}
                            className="w-full bg-background border-none rounded px-1 py-0.5 text-[9px] font-mono outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Size"
                            value={item.helperSizePerUnit || ""}
                            onChange={(e) => onChangeItem(index, "helperSizePerUnit", e.target.value)}
                            className="w-full bg-background border-none rounded px-1 py-0.5 text-[9px] font-mono outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Unit Column */}
                  <td className="px-2 py-0.5">
                    <select
                      id={`cell-${index}-unit`}
                      value={selectedProduct ? item.unit : ""}
                      disabled={!selectedProduct}
                      onFocus={() => setFocusedRowIndex(index)}
                      onKeyDown={(e) => handleKeyDown(e, index, "unit")}
                      onChange={(e) => onChangeItem(index, "unit", e.target.value)}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary rounded-md px-1.5 py-1 text-xs text-foreground outline-none font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {selectedProduct ? (
                        compatibleUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.id}
                          </option>
                        ))
                      ) : (
                        <option value="">--</option>
                      )}
                    </select>
                  </td>

                  {/* Rate Column */}
                  <td className="px-2 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        id={`cell-${index}-rate`}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={item.rate}
                        onFocus={(e) => {
                          e.target.select();
                          setFocusedRowIndex(index);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index, "rate")}
                        onChange={(e) => onChangeItem(index, "rate", e.target.value)}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary rounded-md px-1.5 py-1 text-xs text-foreground outline-none font-mono font-medium"
                      />
                      <select
                        id={`cell-${index}-rateUnit`}
                        value={selectedProduct ? (item.rateUnit || item.unit) : ""}
                        disabled={!selectedProduct}
                        onFocus={() => setFocusedRowIndex(index)}
                        onChange={(e) => onChangeItem(index, "rateUnit", e.target.value)}
                        className="bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase rounded px-1.5 py-1 border-none outline-none focus:ring-1 focus:ring-primary shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedProduct ? (
                          compatibleUnits.map((u) => (
                            <option key={u.id} value={u.id} className="bg-background text-foreground">
                              / {u.id}
                            </option>
                          ))
                        ) : (
                          <option value="">--</option>
                        )}
                      </select>
                    </div>
                  </td>

                  {/* Amount Column (Computed, read-only) */}
                  <td className="px-3 py-1 text-right text-[11px] font-mono font-bold text-foreground">
                    PKR {item.amount ? Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </td>

                  {/* Actions Column */}
                  <td className="px-2 py-0.5 text-center">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => onRemoveItem(index)}
                      className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer opacity-40 group-hover:opacity-100 focus:opacity-100"
                      title="Remove Row"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Helper */}
      <div className="border-t border-border/40 px-3 py-1.5 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground font-medium shrink-0">
        <div className="flex items-center gap-1.5">
          <CornerDownRight className="h-3 w-3 text-muted-foreground/75" />
          <span>Press <kbd className="px-1 py-0.5 bg-background border rounded text-[9px]">Enter</kbd> to traverse cells; product selection automatically appends empty rows.</span>
        </div>
        <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[9.5px]">
          <span><kbd className="px-1 py-0.5 bg-background border rounded text-[8px] font-bold">F2</kbd> Scan</span>
          <span><kbd className="px-1 py-0.5 bg-background border rounded text-[8px] font-bold">F3</kbd> Cash</span>
          <span><kbd className="px-1 py-0.5 bg-background border rounded text-[8px] font-bold">F4</kbd> Table</span>
          <span><kbd className="px-1 py-0.5 bg-background border rounded text-[8px] font-bold">F5</kbd> Buyer</span>
          <span><kbd className="px-1 py-0.5 bg-background border rounded text-[8px] font-bold">F7</kbd> / <kbd className="px-1 py-0.5 bg-background border rounded text-[8px] font-bold">Ctrl+P</kbd> Print</span>
          <span><kbd className="px-1 py-0.5 bg-background border rounded text-[8px] font-bold">Ctrl+Space</kbd> Checkout</span>
          <span><kbd className="px-1 py-0.5 bg-background border rounded text-[8px] font-bold">Ctrl+Enter</kbd> Save</span>
        </div>
      </div>
    </div>
  );
}
