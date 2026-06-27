"use client";

import React from "react";
import SearchableSelect from "@/components/ui/SearchableSelect";

/**
 * DocumentHeader Component
 * Purely presentation component rendering Date, Party select, Reference #, and Notes.
 */
export default function DocumentHeader({
  values = {},
  onChange,
  parties = [],
  partyLabel = "Supplier",
  isEdit = false,
  documentNumber = "",
  partyPlaceholder = "Select Party...",
}) {
  const { entryDate = "", partyId = "", referenceNumber = "", notes = "" } = values;

  // Map parties to options format expected by SearchableSelect
  const partyOptions = React.useMemo(() => {
    return parties.map((p) => ({
      value: p.id,
      label: `${p.name} ${p.phoneNumber ? `(${p.phoneNumber})` : ""}`,
    }));
  }, [parties]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm">
      {/* Document Number (if editing) */}
      {isEdit && documentNumber && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Document #
          </label>
          <div className="bg-muted px-4 py-2.5 rounded-xl font-mono font-bold text-muted-foreground border border-dashed cursor-not-allowed text-sm">
            {documentNumber}
          </div>
        </div>
      )}

      {/* Entry Date */}
      <div className="flex flex-col gap-2">
        <label htmlFor="entryDate" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Date
        </label>
        <input
          id="entryDate"
          type="date"
          required
          value={entryDate}
          onChange={(e) => onChange("entryDate", e.target.value)}
          className="rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
        />
      </div>

      {/* Supplier / Party Select */}
      <div className="flex flex-col gap-2 md:col-span-2">
        <label htmlFor="partyId" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {partyLabel}
        </label>
        <SearchableSelect
          id="partyId"
          name="partyId"
          required
          value={partyId}
          onChange={(val) => onChange("partyId", val)}
          options={partyOptions}
          placeholder={partyPlaceholder}
          disabled={isEdit}
        />
      </div>

      {/* Reference Number */}
      <div className="flex flex-col gap-2">
        <label htmlFor="referenceNumber" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Reference #
        </label>
        <input
          id="referenceNumber"
          type="text"
          value={referenceNumber}
          onChange={(e) => onChange("referenceNumber", e.target.value)}
          placeholder="e.g. INV-998"
          className="rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Notes (spanning full row) */}
      <div className="flex flex-col gap-2 md:col-span-4">
        <label htmlFor="notes" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          General Notes
        </label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Enter notes/remarks here..."
          className="rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
        />
      </div>
    </div>
  );
}
