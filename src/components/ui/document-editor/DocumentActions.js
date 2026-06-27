"use client";

import React from "react";
import { Loader2, Save, X } from "lucide-react";

/**
 * DocumentActions Component
 * Standard layout containing cancel/save buttons for transaction submission.
 */
export default function DocumentActions({
  isSubmitting = false,
  onSave,
  onCancel,
  saveLabel = "Save Document",
  cancelLabel = "Cancel",
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      {/* Cancel button */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onCancel}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-all font-semibold text-sm cursor-pointer disabled:opacity-50"
      >
        <X className="h-4 w-4" />
        {cancelLabel}
      </button>

      {/* Save button */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onSave}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            {saveLabel}
          </>
        )}
      </button>
    </div>
  );
}
