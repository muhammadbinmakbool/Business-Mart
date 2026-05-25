"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Printer, Download, Edit2, MoreHorizontal, ChevronDown } from "lucide-react";
import { triggerPrint, triggerDownloadPDF } from "@/print/utils/printUtils";
import DeleteButton from "@/components/DeleteButton";
import { cn } from "@/lib/utils";

export default function ResponsiveActions({
  containerWidth = 1000,
  editUrl,
  printType,
  printData,
  printFilename,
  deleteId,
  deleteAction,
  deleteLabel = "Item",
  deleteRedirect,
  extraActions, // Node for custom buttons (e.g. RegenerateButton, StatusUpdateButtons)
  statusBadge,   // Node for displaying status badge
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrint = () => {
    triggerPrint(printType, printData);
    setIsOpen(false);
  };

  const handleDownload = () => {
    triggerDownloadPDF(printType, printData, printFilename);
    setIsOpen(false);
  };

  // Define precise container width thresholds for progressive collapse
  const showExtra = containerWidth >= 880;
  const showDelete = containerWidth >= 780;
  const showDownload = containerWidth >= 680;
  const showPrint = containerWidth >= 540;
  const showEdit = containerWidth >= 420;

  // Determine if the dropdown trigger button needs to be displayed
  const hasCollapsedActions = 
    (editUrl && !showEdit) ||
    (printType && (!showPrint || !showDownload)) ||
    (deleteId && deleteAction && !showDelete) ||
    (extraActions && !showExtra);

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* ========================================================================= */}
      {/* 💻 INLINE BUTTONS: Shown outside the dropdown depending on containerWidth */}
      {/* ========================================================================= */}
      {editUrl && showEdit && (
        <Link
          href={editUrl}
          className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors bg-background shrink-0"
        >
          <Edit2 className="h-4 w-4" />
          <span>Edit</span>
        </Link>
      )}

      {printType && (
        <>
          {showPrint && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors font-medium text-sm text-foreground bg-background cursor-pointer shrink-0"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print</span>
            </button>
          )}
          {showDownload && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors font-medium text-sm text-foreground bg-background cursor-pointer shrink-0"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Download PDF</span>
            </button>
          )}
        </>
      )}

      {deleteId && deleteAction && showDelete && (
        <div className="shrink-0">
          <DeleteButton
            id={deleteId}
            deleteAction={deleteAction}
            redirectPath={deleteRedirect}
            label={deleteLabel}
            buttonText="Delete"
          />
        </div>
      )}

      {extraActions && showExtra && (
        <div className="flex items-center gap-2 shrink-0">
          {extraActions}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 ACTION DROPDOWN: Triggered on smaller screens as buttons collapse */}
      {/* ========================================================================= */}
      {hasCollapsedActions && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center gap-1.5 border px-3 py-2 rounded-lg text-sm font-medium bg-background transition-all active:scale-[0.98] shrink-0",
              isOpen ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span>Actions</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-popover text-popover-foreground shadow-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="space-y-1">
                {/* Edit shows in dropdown ONLY if collapsed */}
                {editUrl && !showEdit && (
                  <Link
                    href={editUrl}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-left transition-colors"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                    <span>Edit</span>
                  </Link>
                )}

                {printType && (
                  <>
                    {/* Print shows in dropdown ONLY if collapsed */}
                    {!showPrint && (
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-left transition-colors"
                      >
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        <span>Print</span>
                      </button>
                    )}
                    {/* Download PDF shows in dropdown ONLY if collapsed */}
                    {!showDownload && (
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent text-left transition-colors"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span>Download PDF</span>
                      </button>
                    )}
                  </>
                )}

                {/* Delete shows in dropdown ONLY if collapsed */}
                {deleteId && deleteAction && !showDelete && (
                  <div className="px-1 py-1 border-t my-1">
                    <DeleteButton
                      id={deleteId}
                      deleteAction={deleteAction}
                      redirectPath={deleteRedirect}
                      label={deleteLabel}
                      buttonText="Delete"
                      className="w-full justify-start border-none px-2 py-1.5 hover:bg-destructive/10 hover:text-destructive"
                    />
                  </div>
                )}

                {/* Extra actions show in dropdown ONLY if collapsed */}
                {extraActions && !showExtra && (
                  <div className="px-1 py-1 border-t my-1 flex-col gap-1">
                    {extraActions}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status badge always stays inline next to the actions */}
      {statusBadge && <div className="flex items-center shrink-0">{statusBadge}</div>}
    </div>
  );
}
