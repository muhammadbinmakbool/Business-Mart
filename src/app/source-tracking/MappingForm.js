"use client";

import React, { useState } from "react";
import { 
  Package, 
  User, 
  MapPin, 
  ReceiptText, 
  AlertCircle, 
  Loader2, 
  Save 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createTrackAction, updateTrackAction } from "@/modules/sales/controllers/trackActions";

export default function MappingForm({ 
  initialData = {}, 
  sales = [], 
  intakes = [], 
  parties = [], 
  products = [] 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    saleTransactionId: initialData.saleTransactionId || "",
    saleItemId: initialData.saleItemId || "",
    intakeTransactionId: initialData.intakeTransactionId || "",
    supplierPartyId: initialData.supplierPartyId || "",
    buyerPartyId: initialData.buyerPartyId || "",
    productId: initialData.productId || "",
    quantity: initialData.quantity || "",
    buyingRate: initialData.buyingRate || "",
    sellingRate: initialData.sellingRate || "",
    notes: initialData.notes || ""
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill logic for convenience
    if (field === "saleTransactionId") {
        const sale = sales.find(s => s.id === parseInt(value));
        if (sale) {
            setFormData(prev => ({ 
                ...prev, 
                buyerPartyId: sale.partyId,
                productId: sale.items?.[0]?.productId || prev.productId,
                quantity: sale.totalWeight || prev.quantity,
                sellingRate: sale.items?.[0]?.rate || prev.sellingRate
            }));
        }
    }
    
    if (field === "intakeTransactionId") {
        const intake = intakes.find(i => i.id === parseInt(value));
        if (intake) {
            setFormData(prev => ({ 
                ...prev, 
                supplierPartyId: intake.partyId,
                productId: intake.productId || prev.productId,
                quantity: intake.normalizedWeight || prev.quantity,
                buyingRate: intake.rate || prev.buyingRate
            }));
        }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const action = initialData.id ? updateTrackAction.bind(null, initialData.id) : createTrackAction;
      const result = await action(formData);
      
      if (result.success) {
        router.push("/source-tracking");
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Core Links Section */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <ReceiptText className="h-3 w-3" /> References
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Sale Transaction (Optional)</label>
              <select 
                value={formData.saleTransactionId}
                onChange={(e) => handleChange("saleTransactionId", e.target.value)}
                className="w-full h-10 bg-card border rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">No Sale Linked</option>
                {sales.map(s => (
                  <option key={s.id} value={s.id}>{s.saleNumber} - {s.party?.name} ({Number(s.totalWeight).toLocaleString()} KG)</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Intake Transaction (Optional)</label>
              <select 
                value={formData.intakeTransactionId}
                onChange={(e) => handleChange("intakeTransactionId", e.target.value)}
                className="w-full h-10 bg-card border rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">No Intake Linked</option>
                {intakes.map(i => (
                  <option key={i.id} value={i.id}>{i.intakeNumber} - {i.party?.name} ({Number(i.grossWeight).toLocaleString()} {i.unit === "MAUND" ? "MND" : i.unit})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <User className="h-3 w-3" /> Parties & Product
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Supplier</label>
              <select 
                value={formData.supplierPartyId}
                onChange={(e) => handleChange("supplierPartyId", e.target.value)}
                className="w-full h-10 bg-card border rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select Supplier...</option>
                {parties.filter(p => p.partyType === "SUPPLIER" || p.partyType === "BOTH").map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Buyer</label>
              <select 
                value={formData.buyerPartyId}
                onChange={(e) => handleChange("buyerPartyId", e.target.value)}
                className="w-full h-10 bg-card border rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select Buyer...</option>
                {parties.filter(p => p.partyType === "BUYER" || p.partyType === "BOTH").map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Product</label>
              <select 
                value={formData.productId}
                onChange={(e) => handleChange("productId", e.target.value)}
                className="w-full h-10 bg-card border rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="space-y-6">
          <div className="bg-muted/30 rounded-2xl p-6 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Package className="h-3 w-3" /> Metrics
            </h3>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Quantity (KG)</label>
              <input 
                type="number"
                step="0.01"
                required
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                className="w-full h-11 bg-card border rounded-xl px-4 text-lg font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Buying Rate</label>
                    <input 
                        type="number"
                        step="0.01"
                        value={formData.buyingRate}
                        onChange={(e) => handleChange("buyingRate", e.target.value)}
                        className="w-full h-10 bg-card border rounded-xl px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Rs."
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Selling Rate</label>
                    <input 
                        type="number"
                        step="0.01"
                        value={formData.sellingRate}
                        onChange={(e) => handleChange("sellingRate", e.target.value)}
                        className="w-full h-10 bg-card border rounded-xl px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Rs."
                    />
                </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Notes</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                className="w-full bg-card border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                placeholder="Mapping notes..."
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {initialData.id ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
