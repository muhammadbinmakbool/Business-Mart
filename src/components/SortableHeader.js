"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable table header component that adds sort indicators and handling.
 * Automatically aligns sort indicators based on text alignment in className.
 */
export default function SortableHeader({
  field,
  currentSortField,
  currentSortDirection,
  onRequestSort,
  children,
  className,
}) {
  const isSorted = currentSortField === field;
  
  // Align flex items based on column text alignment
  const isRightAligned = className?.includes("text-right");
  const isCenterAligned = className?.includes("text-center");

  const alignClass = isRightAligned 
    ? "justify-end text-right" 
    : isCenterAligned 
      ? "justify-center text-center" 
      : "justify-start text-left";

  return (
    <th
      onClick={() => onRequestSort(field)}
      className={cn(
        "cursor-pointer select-none px-4 py-3 font-semibold transition-colors hover:bg-muted/80 group",
        isSorted && "bg-muted/40",
        className
      )}
    >
      <div className={cn("flex items-center gap-1.5 w-full", alignClass)}>
        <span>{children}</span>
        <span className={cn(
          "text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors shrink-0",
          isSorted && "text-primary/90 opacity-100"
        )}>
          {!isSorted ? (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : currentSortDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
    </th>
  );
}
