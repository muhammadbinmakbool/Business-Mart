"use client";

import React from "react";
import { 
  ChevronLeft, 
  Search, 
  RotateCcw, 
  User, 
  Calendar, 
  Keyboard, 
  Printer, 
  Save 
} from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DraftSuggestionCard from "@/components/sales/DraftSuggestionCard";

export default function TransactionHeader({
  router,
  buyerId,
  setBuyerId,
  setIsNewBuyer,
  buyerOptions,
  invoiceDate,
  setInvoiceDate,
  scannerInputRef,
  scannerQuery,
  setScannerQuery,
  handleScannerSearch,
  handleScannerResultsKeyDown,
  flashError,
  scannerResults,
  scannerIndex,
  setScannerIndex,
  handleSelectSearchResult,
  handleReset,
  isSubmitting,
  handleSave,
  isNewBuyer,
  newBuyerData,
  setNewBuyerData,
  loadingDraftSuggestion,
  draftSuggestion,
  handleApplyPrefill
}) {
  return (
    <>
      {/* 1. Combined Header & Customer Metadata Card */}
      <div className="relative z-20 flex flex-col gap-2 bg-card border border-border/60 rounded-xl p-2 shadow-sm backdrop-blur-md shrink-0">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
          {/* Back button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => router.push("/sales")}
              className="rounded-lg p-1.5 hover:bg-accent border hover:border-muted-foreground/10 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Back to Invoices"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 flex-1 min-w-0">
            {/* Buyer Selection */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-primary" />
                Customer / Buyer (F5)
              </label>
              <SearchableSelect
                id="pos-buyer-select"
                value={buyerId}
                onChange={(val) => {
                  setBuyerId(val);
                  setIsNewBuyer(val === "new");
                }}
                options={buyerOptions}
                placeholder="Select Buyer..."
                variant="compact"
              />
            </div>

            {/* Date Selection */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" />
                Billing Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-background border border-border hover:border-muted-foreground/30 focus:border-primary rounded-lg px-2.5 py-1 text-xs outline-none transition-colors"
              />
            </div>

            {/* Barcode Search / Scan field */}
            <div className="space-y-0.5 relative">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Keyboard className="h-3 w-3 text-primary" />
                Scan Barcode / Search (F2)
              </label>
              <form onSubmit={handleScannerSearch} className="relative">
                <input
                  ref={scannerInputRef}
                  id="scannerInput"
                  type="text"
                  placeholder="Scan item or type name..."
                  value={scannerQuery}
                  onChange={(e) => setScannerQuery(e.target.value)}
                  onKeyDown={handleScannerResultsKeyDown}
                  className={`w-full bg-background border rounded-lg pl-8 pr-2.5 py-1 text-xs outline-none transition-all font-medium focus:ring-2 focus:ring-primary/10 ${
                    flashError 
                      ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10" 
                      : "border-border hover:border-muted-foreground/30 focus:border-primary"
                  }`}
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </form>

              {/* Autocomplete Dropdown Search Overlay */}
              {scannerResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border shadow-xl rounded-xl p-2 max-h-48 overflow-y-auto space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 border-b mb-1 uppercase tracking-wider">
                    Multiple matches found. Arrow keys & Enter:
                  </div>
                  {scannerResults.map((p, idx) => {
                    const active = idx === scannerIndex;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(p)}
                        onMouseEnter={() => setScannerIndex(idx)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                          active 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span>{p.name}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                          active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          ID: {p.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Toolbar Actions */}
          <div className="flex items-center gap-1.5 shrink-0 self-end xl:self-center">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 bg-muted text-foreground border rounded-lg hover:bg-accent transition-all cursor-pointer"
              title="Clear Cart (Esc)"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true, false)}
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 bg-primary/10 hover:bg-primary/25 border border-primary/25 text-primary rounded-lg transition-all cursor-pointer"
              title="Quick Checkout (Ctrl+Space)"
            >
              Checkout & New
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true, true)}
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-600/25 text-emerald-500 rounded-lg transition-all cursor-pointer"
              title="Save & Print Receipt (F7 / Ctrl+P)"
            >
              <Printer className="h-3 w-3" />
              Save & Print
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false, false)}
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer"
              title="Save & Close Invoice (Ctrl+Enter)"
            >
              <Save className="h-3 w-3" />
              Save Bill
            </button>
          </div>
        </div>

        {/* Inline Quick Add Buyer Details */}
        {isNewBuyer && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-3 duration-250 shrink-0">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              New Buyer Quick Master Setup
            </div>
            <div className="grid gap-2 grid-cols-1 md:grid-cols-3">
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold uppercase text-muted-foreground">Buyer Name</label>
                <input
                  required
                  value={newBuyerData.name}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, name: e.target.value })}
                  placeholder="e.g. Imran Traders"
                  className="w-full bg-background border rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold uppercase text-muted-foreground">Phone Number</label>
                <input
                  required
                  value={newBuyerData.phoneNumber}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, phoneNumber: e.target.value })}
                  placeholder="e.g. 03001234567"
                  className="w-full bg-background border rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold uppercase text-muted-foreground">Address (Optional)</label>
                <input
                  value={newBuyerData.address}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, address: e.target.value })}
                  placeholder="Market name, City"
                  className="w-full bg-background border rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Draft Suggestion Alert Banner */}
      {buyerId && buyerId !== "new" && (
        <div className="space-y-2">
          {loadingDraftSuggestion ? (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full shrink-0" />
              <span>Searching for intelligent suggestions...</span>
            </div>
          ) : (
            <DraftSuggestionCard
              draftSuggestion={draftSuggestion}
              onApply={handleApplyPrefill}
              isCompact={true}
              buttonText="Use Draft"
            />
          )}
        </div>
      )}
    </>
  );
}
