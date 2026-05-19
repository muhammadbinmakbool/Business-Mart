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
import { 
  getUnitsByCategory, 
  normalizeQuantity, 
  normalizeRate, 
  convertFromBase,
  getConversionFactor 
} from "@/lib/units";

// Simple local rounding helper to keep UI values clean
const round = (val, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(val) + Number.EPSILON) * factor) / factor;
};

// Consistent abbreviated unit terminology mapping
const getUnitLabel = (unitId) => {
  const mapping = {
    KG: "KG",
    MAUND: "MND",
    PIECE: "PCS",
    BAG: "BAG",
    LITER: "LTR",
    ML: "ML",
    PACK: "PCK",
    BOX: "BOX"
  };
  return mapping[unitId] || unitId;
};

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
    netWeight: initialData.netWeight || "",
    initialTotal: initialData.initialTotal || "",
    notes: initialData.notes || ""
  });

  // Local React states to track units for each input field
  const [quantityUnit, setQuantityUnit] = useState("KG");
  const [buyingRateUnit, setBuyingRateUnit] = useState("KG");
  const [sellingRateUnit, setSellingRateUnit] = useState("KG");

  // Determine available units based on selected product category
  const selectedProd = products.find(p => p.id === parseInt(formData.productId));
  const availableUnits = selectedProd 
    ? getUnitsByCategory(selectedProd.category) 
    : [{ id: "KG", name: "Kilogram" }];

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate initialTotal when netWeight or buyingRate/sellingRate changes manually
      if (field === "netWeight" || field === "buyingRate") {
        const netW = Number(field === "netWeight" ? value : prev.netWeight) || 0;
        const rateVal = Number(field === "buyingRate" ? value : prev.buyingRate) || 0;
        updated.initialTotal = round(netW * rateVal, 2).toString();
      }
      return updated;
    });
    
    // Auto-fill logic for convenience
    if (field === "saleTransactionId") {
        if (!value) {
            setFormData(prev => ({
                ...prev,
                saleTransactionId: "",
                buyerPartyId: "",
                productId: "",
                quantity: "",
                sellingRate: ""
            }));
            return;
        }
        const sale = sales.find(s => s.id === parseInt(value));
        if (sale) {
            const firstItem = sale.items?.[0];
            setFormData(prev => ({ 
                ...prev, 
                saleTransactionId: value,
                buyerPartyId: sale.partyId,
                productId: firstItem?.productId || prev.productId,
                quantity: firstItem?.weight || sale.totalWeight || prev.quantity,
                sellingRate: firstItem?.rate || prev.sellingRate
            }));
            if (firstItem?.unit) {
                setQuantityUnit(firstItem.unit);
                setSellingRateUnit(firstItem.unit);
            } else {
                setQuantityUnit("KG");
                setSellingRateUnit("KG");
            }
        }
    }
    
    if (field === "intakeTransactionId") {
        if (!value) {
            setFormData(prev => ({
                ...prev,
                intakeTransactionId: "",
                supplierPartyId: "",
                productId: "",
                quantity: "",
                buyingRate: "",
                netWeight: "",
                initialTotal: ""
            }));
            return;
        }
        const intake = intakes.find(i => i.id === parseInt(value));
        if (intake) {
            const calculatedNetWeight = intake.netWeight !== null && intake.netWeight !== undefined ? intake.netWeight : intake.grossWeight;
            const calculatedInitialTotal = Number(calculatedNetWeight) * Number(intake.rate || 0);

            setFormData(prev => ({ 
                ...prev, 
                intakeTransactionId: value,
                supplierPartyId: intake.partyId,
                productId: intake.productId || prev.productId,
                quantity: intake.grossWeight || prev.quantity,
                buyingRate: intake.rate || prev.buyingRate,
                netWeight: calculatedNetWeight,
                initialTotal: calculatedInitialTotal
            }));
            if (intake.unit) {
                setQuantityUnit(intake.unit);
                setBuyingRateUnit(intake.unit);
            } else {
                setQuantityUnit("KG");
                setBuyingRateUnit("KG");
            }
        }
    }

    if (field === "productId") {
        const prod = products.find(p => p.id === parseInt(value));
        if (prod) {
            // Default units to product's primary/base unit
            const units = getUnitsByCategory(prod.category);
            const baseUnit = units.find(u => u.base)?.id || "KG";
            setQuantityUnit(baseUnit);
            setBuyingRateUnit(baseUnit);
            setSellingRateUnit(baseUnit);
        }
    }
  };

  // Convert raw quantity to target unit using product conversion factor
  const handleQuantityUnitChange = (newUnit) => {
    if (selectedProd && formData.quantity) {
      const baseQty = normalizeQuantity(formData.quantity, quantityUnit, selectedProd);
      const convertedQty = convertFromBase(baseQty, newUnit, selectedProd);
      setFormData(prev => ({ ...prev, quantity: round(convertedQty, 2).toString() }));
    }
    setQuantityUnit(newUnit);
  };

  // Convert raw buying rate to target unit using product conversion factor
  const handleBuyingRateUnitChange = (newUnit) => {
    if (selectedProd && formData.buyingRate) {
      const baseRate = normalizeRate(formData.buyingRate, buyingRateUnit, selectedProd);
      const targetFactor = getConversionFactor(newUnit, selectedProd);
      const convertedRate = baseRate * targetFactor;
      setFormData(prev => ({ ...prev, buyingRate: round(convertedRate, 2).toString() }));
    }
    setBuyingRateUnit(newUnit);
  };

  // Convert raw selling rate to target unit using product conversion factor
  const handleSellingRateUnitChange = (newUnit) => {
    if (selectedProd && formData.sellingRate) {
      const baseRate = normalizeRate(formData.sellingRate, sellingRateUnit, selectedProd);
      const targetFactor = getConversionFactor(newUnit, selectedProd);
      const convertedRate = baseRate * targetFactor;
      setFormData(prev => ({ ...prev, sellingRate: round(convertedRate, 2).toString() }));
    }
    setSellingRateUnit(newUnit);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const action = initialData.id ? updateTrackAction.bind(null, initialData.id) : createTrackAction;
      
      if (!selectedProd) {
        throw new Error("Please select a product first.");
      }

      // Convert quantity and rates to base units (KG/ML/PIECE) before saving to DB
      const normalizedQty = normalizeQuantity(formData.quantity, quantityUnit, selectedProd);
      const normalizedBuyingRate = formData.buyingRate ? normalizeRate(formData.buyingRate, buyingRateUnit, selectedProd) : null;
      const normalizedSellingRate = formData.sellingRate ? normalizeRate(formData.sellingRate, sellingRateUnit, selectedProd) : null;

      const payload = {
        ...formData,
        quantity: normalizedQty,
        buyingRate: normalizedBuyingRate,
        sellingRate: normalizedSellingRate,
        netWeight: formData.netWeight ? Number(formData.netWeight) : null,
        initialTotal: formData.initialTotal ? Number(formData.initialTotal) : null
      };

      const result = await action(payload);
      
      if (result.success) {
        router.push("/source-tracking");
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
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
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Quantity</label>
              <div className="relative flex items-center">
                <input 
                  type="number"
                  step="0.01"
                  required
                  value={formData.quantity}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                  className="w-full h-11 bg-card border rounded-xl pl-4 pr-24 text-lg font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="0.00"
                />
                <div className="absolute right-2">
                  <select
                    value={quantityUnit}
                    onChange={(e) => handleQuantityUnitChange(e.target.value)}
                    className="bg-muted hover:bg-muted/80 text-foreground text-xs font-bold uppercase rounded-lg px-2.5 py-1.5 border-none outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-colors"
                  >
                    {availableUnits.map(u => (
                      <option key={u.id} value={u.id} className="bg-card text-foreground">{getUnitLabel(u.id)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Buying Rate</label>
                    <div className="relative flex items-center">
                        <input 
                            type="number"
                            step="0.01"
                            value={formData.buyingRate}
                            onChange={(e) => handleChange("buyingRate", e.target.value)}
                            className="w-full h-10 bg-card border rounded-xl pl-3 pr-20 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="Rs."
                        />
                        <div className="absolute right-1.5">
                          <select
                            value={buyingRateUnit}
                            onChange={(e) => handleBuyingRateUnitChange(e.target.value)}
                            className="bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase rounded-md px-2 py-1 border-none outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-colors"
                          >
                            {availableUnits.map(u => (
                              <option key={u.id} value={u.id} className="bg-card text-foreground">/{getUnitLabel(u.id)}</option>
                            ))}
                          </select>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Selling Rate</label>
                    <div className="relative flex items-center">
                        <input 
                            type="number"
                            step="0.01"
                            value={formData.sellingRate}
                            onChange={(e) => handleChange("sellingRate", e.target.value)}
                            className="w-full h-10 bg-card border rounded-xl pl-3 pr-20 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="Rs."
                        />
                        <div className="absolute right-1.5">
                          <select
                            value={sellingRateUnit}
                            onChange={(e) => handleSellingRateUnitChange(e.target.value)}
                            className="bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase rounded-md px-2 py-1 border-none outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-colors"
                          >
                            {availableUnits.map(u => (
                              <option key={u.id} value={u.id} className="bg-card text-foreground">/{getUnitLabel(u.id)}</option>
                            ))}
                          </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Net Weight</label>
                    <div className="relative flex items-center">
                        <input 
                            type="number"
                            step="0.01"
                            value={formData.netWeight}
                            onChange={(e) => handleChange("netWeight", e.target.value)}
                            className="w-full h-10 bg-card border rounded-xl px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="0.00"
                        />
                        {formData.intakeTransactionId && (
                          <div className="absolute right-3 text-[10px] uppercase font-bold text-muted-foreground">
                            {getUnitLabel(quantityUnit)}
                          </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Initial Total Amount</label>
                    <div className="relative flex items-center">
                        <input 
                            type="number"
                            step="0.01"
                            value={formData.initialTotal}
                            onChange={(e) => handleChange("initialTotal", e.target.value)}
                            className="w-full h-10 bg-card border rounded-xl px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="Rs."
                        />
                    </div>
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
