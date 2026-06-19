"use client";

import React, { useRef, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { createProductAction } from "@/modules/products/controllers/productActions";
import { getCategoriesAction } from "@/modules/products/controllers/productCategoryActions";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { UNIT_CATEGORIES, getUnitsByCategory, isProductSpecific, BASE_UNITS } from "@/lib/units";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

function CreateProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backUrl = searchParams.get("backUrl") || "/products";

  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  // Categories Lookup
  const [categories, setCategories] = useState([]);
  const [unitRegistry, setUnitRegistry] = useState(null);

  // Form Field States
  const [unitCategory, setUnitCategory] = useState(UNIT_CATEGORIES.WEIGHT);
  const [productCategoryId, setProductCategoryId] = useState("");
  const [primaryUnit, setPrimaryUnit] = useState("KG");
  const [defaultBuyingRate, setDefaultBuyingRate] = useState("");
  const [defaultSellingRate, setDefaultSellingRate] = useState("");
  const [buyingRateUnit, setBuyingRateUnit] = useState("KG");
  const [sellingRateUnit, setSellingRateUnit] = useState("KG");
  const [defaultSellingUnit, setDefaultSellingUnit] = useState("KG");
  const [displayOrder, setDisplayOrder] = useState("0");

  // Load Categories and Unit Registry on mount
  useEffect(() => {
    async function loadData() {
      const [catRes, unitRes] = await Promise.all([
        getCategoriesAction(),
        getUnitRegistryAction()
      ]);
      if (catRes.success) {
        setCategories(catRes.data || []);
      }
      if (unitRes.success) {
        setUnitRegistry(unitRes.data);
      }
    }
    loadData();
  }, []);

  const handleUnitCategoryChange = (newCat) => {
    setUnitCategory(newCat);
    const base = unitRegistry
      ? unitRegistry.baseUnits[newCat]
      : BASE_UNITS[newCat] || "KG";
    setPrimaryUnit(base);
    setBuyingRateUnit(base);
    setSellingRateUnit(base);
    setDefaultSellingUnit(base);
  };

  async function handleSubmit(formData, shouldRedirect) {
    // Inject the selected values into the formData object
    formData.set("unitCategory", unitCategory);
    formData.set("productCategoryId", productCategoryId);
    formData.set("primaryUnit", primaryUnit);
    formData.set("buyingRateUnit", buyingRateUnit);
    formData.set("sellingRateUnit", sellingRateUnit);
    formData.set("defaultSellingUnit", defaultSellingUnit);
    
    // Fallback deprecated category column for coexistence compatibility
    formData.set("category", unitCategory);

    const result = await createProductAction(formData);
    
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Product created successfully");
    
    if (shouldRedirect) {
      router.push(backUrl);
    } else {
      formRef.current?.reset();
      handleUnitCategoryChange(UNIT_CATEGORIES.WEIGHT);
      setProductCategoryId("");
      setDefaultBuyingRate("");
      setDefaultSellingRate("");
      setDisplayOrder("0");
      nameInputRef.current?.focus();
    }
  }

  const compatibleUnits = unitRegistry
    ? Object.values(unitRegistry.units)
        .filter(u => u.unitCategoryCode === unitCategory)
        .map(u => ({ id: u.code, name: u.name }))
    : getUnitsByCategory(unitCategory);

  const showConversion = unitRegistry
    ? unitRegistry.units[primaryUnit]?.isCustom === true
    : isProductSpecific(primaryUnit);

  const baseUnit = unitRegistry
    ? unitRegistry.baseUnits[unitCategory]
    : BASE_UNITS[unitCategory] || "KG";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={backUrl}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-sm text-muted-foreground">Define a new item in your inventory catalog.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form 
          ref={formRef}
          action={(formData) => handleSubmit(formData, true)} 
          className="space-y-6"
        >
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Product Name</label>
            <input
              ref={nameInputRef}
              id="name"
              name="name"
              required
              autoFocus
              placeholder="e.g. Basmati Rice, Wheat, etc."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="productCategoryId" className="text-sm font-medium">Category Group</label>
              <select
                id="productCategoryId"
                name="productCategoryId"
                value={productCategoryId}
                onChange={(e) => setProductCategoryId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select Category --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="unitCategory" className="text-sm font-medium">Unit Category</label>
              <select
                id="unitCategory"
                name="unitCategory"
                value={unitCategory}
                onChange={(e) => handleUnitCategoryChange(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.values(UNIT_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="primaryUnit" className="text-sm font-medium">Primary Inventory Unit</label>
              <select
                id="primaryUnit"
                name="primaryUnit"
                required
                value={primaryUnit}
                onChange={(e) => setPrimaryUnit(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {compatibleUnits.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="displayOrder" className="text-sm font-medium">Display Sort Order</label>
              <input
                id="displayOrder"
                name="displayOrder"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {showConversion && (
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border animate-in fade-in slide-in-from-top-1">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <label htmlFor="unitConversion" className="text-sm font-bold">Unit Conversion</label>
                  <p className="text-xs text-muted-foreground">
                    Define how many <strong>{baseUnit}</strong> are in one <strong>{primaryUnit}</strong>.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium whitespace-nowrap">1 {primaryUnit} =</span>
                    <input
                      id="unitConversion"
                      name="unitConversion"
                      type="number"
                      step="0.0001"
                      required
                      placeholder="e.g. 50, 100"
                      className="w-32 rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-bold">{baseUnit}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Defaults & Rates */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-lg font-bold">Business Defaults & Rates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="defaultBuyingRate" className="text-sm font-medium">Default Buying Rate</label>
                <div className="flex gap-2">
                  <input
                    id="defaultBuyingRate"
                    name="defaultBuyingRate"
                    type="number"
                    step="0.01"
                    value={defaultBuyingRate}
                    onChange={(e) => setDefaultBuyingRate(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    id="buyingRateUnit"
                    name="buyingRateUnit"
                    required
                    value={buyingRateUnit}
                    onChange={(e) => setBuyingRateUnit(e.target.value)}
                    className="w-32 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {compatibleUnits.map(u => (
                      <option key={u.id} value={u.id}>{u.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="defaultSellingRate" className="text-sm font-medium">Default Selling Rate</label>
                <div className="flex gap-2">
                  <input
                    id="defaultSellingRate"
                    name="defaultSellingRate"
                    type="number"
                    step="0.01"
                    value={defaultSellingRate}
                    onChange={(e) => setDefaultSellingRate(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    id="sellingRateUnit"
                    name="sellingRateUnit"
                    required
                    value={sellingRateUnit}
                    onChange={(e) => setSellingRateUnit(e.target.value)}
                    className="w-32 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {compatibleUnits.map(u => (
                      <option key={u.id} value={u.id}>{u.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="defaultSellingUnit" className="text-sm font-medium">Default Selling Unit</label>
                <select
                  id="defaultSellingUnit"
                  name="defaultSellingUnit"
                  required
                  value={defaultSellingUnit}
                  onChange={(e) => setDefaultSellingUnit(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {compatibleUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Link
              href={backUrl}
              className="px-4 py-2 text-sm text-center font-medium hover:bg-accent rounded-md transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => {
                const formData = new FormData(formRef.current);
                handleSubmit(formData, false);
              }}
              className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Save & Add Another
            </button>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Save & Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading product form...</div>}>
      <CreateProductContent />
    </Suspense>
  );
}
