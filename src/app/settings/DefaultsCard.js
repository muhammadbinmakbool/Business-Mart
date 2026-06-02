"use client";

import React, { useState, useEffect } from "react";
import { Sliders, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getActiveProductsAction } from "@/modules/products/controllers/productActions";
import { getAdjustmentVisibilityAction, saveDefaultProductSettingsAction } from "@/modules/settings/controllers/settingsActions";
import ProductSelect from "@/components/ui/ProductSelect";

export default function DefaultsCard() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState([]);
  const [defaultProductId, setDefaultProductId] = useState(null);
  const [activeMarketProductId, setActiveMarketProductId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [prodRes, settingsRes] = await Promise.all([
        getActiveProductsAction(),
        getAdjustmentVisibilityAction()
      ]);

      if (prodRes.success) {
        setProducts(prodRes.products || []);
      } else {
        toast.error("Failed to load products list.");
      }

      if (settingsRes.success) {
        const defaults = settingsRes.settings?.defaults || {};
        setDefaultProductId(defaults.productId || null);
        setActiveMarketProductId(defaults.activeMarketProductId || null);
      } else {
        toast.error("Failed to load defaults settings.");
      }

      setMounted(true);
    }
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveDefaultProductSettingsAction(defaultProductId, activeMarketProductId);
    setSaving(false);
    
    if (res.success) {
      toast.success("Default product preferences saved successfully!");
    } else {
      toast.error(res.error || "Failed to save settings.");
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 border-b pb-3">
        <Sliders className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Default Product & Season Settings</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure automatic pre-selection preferences for transaction entry forms. These options act strictly as UI hints for new creations and do not enforce or restrict user actions, inventory math, or pricing parameters.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Default Product */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-primary" /> Default Product
            </label>
            <ProductSelect
              products={products}
              value={defaultProductId}
              onChange={setDefaultProductId}
              placeholder="Select a default product..."
            />
            <p className="text-xs text-muted-foreground">
              Pre-selected when creating sale invoices or recording new goods intakes.
            </p>
          </div>

          {/* Current Market Product */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Current Market Product
            </label>
            <ProductSelect
              products={products}
              value={activeMarketProductId}
              onChange={setActiveMarketProductId}
              placeholder="Select current season product (Optional)..."
            />
            <p className="text-xs text-muted-foreground">
              Overrides the default product selection above during active crop seasons (e.g. Wheat or Rice season).
            </p>
          </div>
        </div>

        {/* Informational Hint Banner */}
        <div className="rounded-xl bg-muted/40 p-4 border text-xs text-muted-foreground">
          <span className="font-bold text-foreground">💡 Hint Priority Rule:</span>
          {" "}When initializing forms, if the <strong>Current Market Product</strong> is set, it will be pre-selected. If unset, the <strong>Default Product</strong> is used. Users can always manually override selections at any time.
        </div>

        <div className="flex justify-end pt-2 border-t">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving Settings..." : "Save Default Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
