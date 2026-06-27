"use client";

import React from "react";
import DocumentHeader from "./ui/document-editor/DocumentHeader";
import DocumentItemsGrid from "./ui/document-editor/DocumentItemsGrid";
import DocumentTotals from "./ui/document-editor/DocumentTotals";
import DocumentSettlement from "./ui/document-editor/DocumentSettlement";
import DocumentActions from "./ui/document-editor/DocumentActions";

/**
 * DocumentLayout Component
 * Form layout manager. Displays transaction header, grid of items,
 * financial totals, settlement details, and transaction actions.
 */
export default function DocumentLayout({
  // Header Props
  headerValues,
  onHeaderChange,
  parties,
  partyLabel,
  partyPlaceholder,
  isEdit,
  documentNumber,

  // Grid Props
  items,
  products,
  unitRegistry,
  onCellChange,
  onKeyDown,
  onAddRow,
  onDeleteRow,

  // Totals Props
  baseAmount,
  adjustmentsTotal,
  grandTotal,

  // Settlement Props
  settlementValues,
  onSettlementChange,

  // Actions Props
  isSubmitting,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
}) {
  return (
    <div className="space-y-6">
      {/* 1. Transaction Document Header */}
      <DocumentHeader
        values={headerValues}
        onChange={onHeaderChange}
        parties={parties}
        partyLabel={partyLabel}
        partyPlaceholder={partyPlaceholder}
        isEdit={isEdit}
        documentNumber={documentNumber}
      />

      {/* 2. Main Content: Grid & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items Table */}
        <div className="lg:col-span-2">
          <DocumentItemsGrid
            items={items}
            products={products}
            unitRegistry={unitRegistry}
            onCellChange={onCellChange}
            onKeyDown={onKeyDown}
            onAddRow={onAddRow}
            onDeleteRow={onDeleteRow}
          />
        </div>

        {/* Right Column: Totals & Settlement */}
        <div className="space-y-6">
          <DocumentTotals
            baseAmount={baseAmount}
            adjustmentsTotal={adjustmentsTotal}
            grandTotal={grandTotal}
          />

          <DocumentSettlement
            values={settlementValues}
            onChange={onSettlementChange}
          />
        </div>
      </div>

      {/* 3. Transaction Actions */}
      <DocumentActions
        isSubmitting={isSubmitting}
        onSave={onSave}
        onCancel={onCancel}
        saveLabel={saveLabel}
        cancelLabel={cancelLabel}
      />
    </div>
  );
}
