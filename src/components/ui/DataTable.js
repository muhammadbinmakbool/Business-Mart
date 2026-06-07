"use client";

import React from "react";
import SortableHeader from "@/components/SortableHeader";
import { getNestedValue } from "@/hooks/useTableSorting";
import { cn } from "@/lib/utils";

/**
 * A highly reusable, display-only table component.
 * Adheres strictly to container styling standards and integrates with existing SortableHeader logic.
 */
export default function DataTable({
  data = [],
  columns = [],
  sortField,
  sortDirection,
  onRequestSort,
  containerClassName,
  className,
  rowClassName,
  emptyMessage = "No records found.",
  rowKey = "id",
}) {
  const getRowKey = (row, index) => {
    if (typeof rowKey === "function") return rowKey(row);
    return row[rowKey] !== undefined ? row[rowKey] : index;
  };

  return (
    <div className={cn("rounded-xl border bg-card shadow-sm overflow-hidden", containerClassName)}>
      <div className="overflow-x-auto">
        <table className={cn("w-full text-left text-sm border-collapse", className)}>
          <thead>
            <tr className="border-b bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest transition-colors">
              {columns.map((col) => {
                const isSortable = col.sortable !== false && onRequestSort && col.key;

                if (isSortable) {
                  return (
                    <SortableHeader
                      key={col.key}
                      field={col.key}
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onRequestSort={onRequestSort}
                      className={col.className}
                    >
                      {col.label}
                    </SortableHeader>
                  );
                }

                return (
                  <th
                    key={col.key || col.label}
                    className={cn(
                      "px-4 py-3 font-semibold select-none text-muted-foreground",
                      col.className
                    )}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground italic"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = getRowKey(row, index);

                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b hover:bg-muted/30 transition-colors",
                      rowClassName && rowClassName(row)
                    )}
                  >
                    {columns.map((col) => {
                      const cellValue = col.key ? getNestedValue(row, col.key) : undefined;
                      return (
                        <td
                          key={col.key || col.label}
                          className={cn("px-4 py-3 whitespace-nowrap", col.className)}
                        >
                          {col.render ? col.render(row, cellValue) : (cellValue ?? "—")}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
