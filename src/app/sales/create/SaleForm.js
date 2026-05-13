"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Calculator, ReceiptText, Loader2, PlusCircle, X } from "lucide-react";
import { createSaleAction } from "@/modules/sales/controllers/saleActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { round, calculateAdjustment } from "@/lib/financial";

export default function SaleForm({ buyers, products }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [partyId, setPartyId] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ productId: "", weight: "", rate: "", amount: 0 }]);
  const [adjustments, setAdjustments] = useState([]);
  
  // UI State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [currentAdjustment, setCurrentAdjustment] = useState({ 
    adjustmentType: "Commission", 
    method: "PERCENTAGE", 
    value: "", 
    direction: "ADD" 
  });

  // Totals State
  const [totals, setTotals] = useState({ baseAmount: 0, totalWeight: 0, totalAdjustments: 0, finalAmount: 0 });

  // Calculation Logic
  const updateTotals = useCallback(() => {
    let totalWeight = 0;
    let baseAmount = 0;

    const updatedItems = items.map(item => {
      const amount = round(Number(item.weight || 0) * Number(item.rate || 0));
      totalWeight += Number(item.weight || 0);
      baseAmount += amount;
      return { ...item, amount };
    });

    let totalAdjustments = 0;
    adjustments.forEach(adj => {
      const calcAmt = calculateAdjustment(adj.method, adj.value, { baseAmount, totalWeight });
      if (adj.direction === "SUBTRACT") {
        totalAdjustments -= calcAmt;
      } else {
        totalAdjustments += calcAmt;
      }
    });

    setTotals({
      baseAmount: round(baseAmount),
      totalWeight: round(totalWeight),
      totalAdjustments: round(totalAdjustments),
      finalAmount: round(baseAmount + totalAdjustments)
    });
  }, [items, adjustments]);

  useEffect(() => {
    updateTotals();
  }, [updateTotals]);

  // Handlers
  const addItem = () => setItems([...items, { productId: "", weight: "", rate: "", amount: 0 }]);
  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-calculate amount for visual feedback
    if (field === "weight" || field === "rate") {
      const w = Number(field === "weight" ? value : newItems[index].weight || 0);
      const r = Number(field === "rate" ? value : newItems[index].rate || 0);
      newItems[index].amount = round(w * r);
    }
    
    setItems(newItems);
  };

  const addAdjustment = () => {
    if (!currentAdjustment.value) return;
    setAdjustments([...adjustments, { ...currentAdjustment }]);
    setIsAdjustmentModalOpen(false);
    setCurrentAdjustment({ adjustmentType: "Commission", method: "PERCENTAGE", value: "", direction: "ADD" });
  };

  const removeAdjustment = (index) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!partyId) return toast.error("Please select a buyer");
    if (items.some(i => !i.productId || !i.weight || !i.rate)) {
      return toast.error("Please fill all item fields");
    }

    setIsSubmitting(true);
    try {
      const result = await createSaleAction({
        partyId,
        entryDate,
        notes,
        items,
        adjustments
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Sale invoice created successfully");
        
        if (e.nativeEvent.submitter?.name === "saveAndAnother") {
          // Reset form for next entry
          setPartyId("");
          setItems([{ productId: "", weight: "", rate: "", amount: 0 }]);
          setAdjustments([]);
          setNotes("");
          toast.info("Form reset for next entry");
          // Focus back on party selector
          document.querySelector('select')?.focus();
        } else {
          router.push("/sales");
        }
      }
    } catch (error) {
      toast.error("Failed to create sale");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Buyer (Party)</label>
          <select
            autoFocus
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            className="w-full bg-background border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            required
          >
            <option value="">Select Buyer...</option>
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.name} {buyer.phoneNumber ? `(${buyer.phoneNumber})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Entry Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full bg-background border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            required
          />
        </div>
      </div>

      {/* 2. Items Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Products & Rates
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-bold bg-primary/10 text-primary px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add Row
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b">
                <th className="px-4 py-3 w-[40%]">Product</th>
                <th className="px-4 py-3 text-right">Weight (KG)</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={index} className="group">
                  <td className="px-2 py-2">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                      className="w-full bg-transparent border-none rounded-lg px-2 py-2 focus:ring-1 focus:ring-primary/50 outline-none"
                      required
                    >
                      <option value="">Select Product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.weight}
                      onChange={(e) => updateItem(index, "weight", e.target.value)}
                      className="w-full bg-transparent border-none text-right font-mono px-2 py-2 focus:ring-1 focus:ring-primary/50 outline-none"
                      required
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.rate}
                      onChange={(e) => updateItem(index, "rate", e.target.value)}
                      className="w-full bg-transparent border-none text-right font-mono px-2 py-2 focus:ring-1 focus:ring-primary/50 outline-none"
                      required
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">
                    {item.amount.toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Adjustments / Charges Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Billing Adjustments</h3>
            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="text-xs font-bold border border-primary/30 text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Adjustment
            </button>
          </div>
          
          <div className="space-y-2">
            {adjustments.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed rounded-xl opacity-40">
                <p className="text-xs">No adjustments added.</p>
              </div>
            ) : (
              adjustments.map((adj, index) => {
                const amount = calculateAdjustment(adj.method, adj.value, { 
                  baseAmount: totals.baseAmount, 
                  totalWeight: totals.totalWeight 
                });
                return (
                  <div key={index} className="flex items-center justify-between bg-muted/30 px-4 py-3 rounded-lg border group">
                    <div>
                      <div className="font-bold text-sm">{adj.adjustmentType}</div>
                      <div className="text-[10px] uppercase text-muted-foreground font-semibold">
                        {adj.method === "PERCENTAGE" ? `${adj.value}%` : 
                         adj.method === "PER_WEIGHT" ? `Rs. ${adj.value} per KG` : 
                         `Fixed Rs. ${adj.value}`} 
                        {" • "} 
                        <span className={adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}>
                          {adj.direction}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "font-mono font-bold text-sm",
                        adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {adj.direction === "ADD" ? "+" : "-"} {amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAdjustment(index)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 space-y-2">
             <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Internal Notes</label>
             <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special billing notes or instructions..."
                className="w-full bg-background border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
             />
          </div>
        </div>

        {/* 4. Invoice Summary */}
        <div className="bg-primary/5 rounded-2xl p-8 space-y-6 border border-primary/10">
          <h3 className="font-bold text-xl flex items-center gap-2 border-b border-primary/20 pb-4">
            <ReceiptText className="h-6 w-6 text-primary" />
            Billing Summary
          </h3>
          
          <div className="space-y-4 font-medium">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Weight</span>
              <span className="font-mono">{totals.totalWeight.toLocaleString()} KG</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Base Amount</span>
              <span className="text-lg">Rs. {totals.baseAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-y border-primary/10">
              <span className="text-muted-foreground">Total Adjustments</span>
              <span className={cn(
                "text-lg",
                totals.totalAdjustments > 0 ? "text-emerald-600" : totals.totalAdjustments < 0 ? "text-rose-600" : ""
              )}>
                {totals.totalAdjustments > 0 ? "+" : ""} {totals.totalAdjustments.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-end pt-4">
              <span className="font-bold text-lg">Final Total</span>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1 opacity-60">Total Receivable</div>
                <span className="text-4xl font-black text-primary tracking-tighter">
                  Rs. {totals.finalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <button
              type="submit"
              name="saveAndClose"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <ReceiptText className="h-6 w-6" />
                  GENERATE & CLOSE
                </>
              )}
            </button>

            <button
              type="submit"
              name="saveAndAnother"
              disabled={isSubmitting}
              className="w-full bg-background border-2 border-primary/20 text-primary py-3 rounded-xl font-bold text-sm hover:bg-primary/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              SAVE & ADD ANOTHER
            </button>

            <p className="text-[10px] text-center text-muted-foreground mt-4 font-bold uppercase tracking-widest">
              Review all items and charges before saving
            </p>
          </div>
        </div>
      </div>

      {/* 5. Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/50">
              <h3 className="font-bold">Add Billing Adjustment</h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="p-1 hover:bg-background rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Type</label>
                <select 
                  value={currentAdjustment.adjustmentType}
                  onChange={e => setCurrentAdjustment({...currentAdjustment, adjustmentType: e.target.value})}
                  className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Commission">Commission</option>
                  <option value="Labour">Labour</option>
                  <option value="Rent">Rent</option>
                  <option value="Market Fee">Market Fee</option>
                  <option value="Transport">Transport</option>
                  <option value="Unloading">Unloading</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Method</label>
                  <select 
                    value={currentAdjustment.method}
                    onChange={e => setCurrentAdjustment({...currentAdjustment, method: e.target.value})}
                    className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="PERCENTAGE">% Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                    <option value="PER_WEIGHT">Per Weight (KG)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Direction</label>
                  <select 
                    value={currentAdjustment.direction}
                    onChange={e => setCurrentAdjustment({...currentAdjustment, direction: e.target.value})}
                    className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="ADD">Add (+)</option>
                    <option value="SUBTRACT">Subtract (-)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Value</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentAdjustment.value}
                  onChange={e => setCurrentAdjustment({...currentAdjustment, value: e.target.value})}
                  className="w-full bg-background border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-lg"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={addAdjustment}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold mt-4 hover:opacity-90 transition-opacity"
              >
                Add to Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
