"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

export default function PaginationControls({
  currentPage = 1,
  totalCount = 0,
  limit = 50,
  onPageChange,
  onLimitChange,
  className
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const startEntry = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endEntry = Math.min(currentPage * limit, totalCount);

  // Generate sliding window of pages
  const getPageRange = () => {
    const range = [];
    const maxVisible = 5; // number of pages around current to show

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      // Always show page 1
      range.push(1);

      if (currentPage > 4) {
        range.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust to keep visible count consistent
      let adjustStart = start;
      let adjustEnd = end;
      if (currentPage <= 3) {
        adjustEnd = 4;
      }
      if (currentPage >= totalPages - 2) {
        adjustStart = totalPages - 3;
      }

      for (let i = Math.max(2, adjustStart); i <= Math.min(totalPages - 1, adjustEnd); i++) {
        range.push(i);
      }

      if (currentPage < totalPages - 3) {
        range.push("...");
      }

      // Always show last page
      range.push(totalPages);
    }
    return range;
  };

  const pages = getPageRange();

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-border bg-card/50", className)}>
      {/* Entries Info */}
      <div className="text-sm text-muted-foreground font-medium select-none">
        Showing <span className="font-semibold text-foreground">{startEntry}</span> to{" "}
        <span className="font-semibold text-foreground">{endEntry}</span> of{" "}
        <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> entries
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Page Size Select */}
        {onLimitChange && (
          <div className="flex items-center gap-2 mr-2">
            <span className="text-xs text-muted-foreground font-medium select-none">Show</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-8 px-2 py-1 text-sm bg-background border border-input rounded-md font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Navigation Buttons */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md border border-input bg-background text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background transition-all shadow-sm"
            title="First Page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md border border-input bg-background text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background transition-all shadow-sm"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page Numbers */}
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2.5 py-1 text-sm text-muted-foreground select-none"
                >
                  ...
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p)}
                className={cn(
                  "px-3 py-1 text-sm font-semibold rounded-md border transition-all shadow-sm",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary pointer-events-none"
                    : "border-input bg-background text-foreground hover:bg-muted/80"
                )}
              >
                {p}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-input bg-background text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background transition-all shadow-sm"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-input bg-background text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background transition-all shadow-sm"
            title="Last Page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
