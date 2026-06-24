"use client";

import React, { useState, useEffect } from "react";
import { updateProductAction } from "@/modules/products/controllers/productActions";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { createCategoryAction } from "@/modules/products/controllers/productCategoryActions";
import { UNIT_CATEGORIES, getUnitsByCategory, isProductSpecific, BASE_UNITS } from "@/lib/units";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";

export default function EditProductForm({ product, categories = [] }) {
  const router = useRouter();
  
  // Field States
  const [unitCategory, setUnitCategory] = useState(product.unitCategory || product.category || UNIT_CATEGORIES.WEIGHT);
  const [productCategoryId, setProductCategoryId] = useState(product.productCategoryId || "");
  const [primaryUnit, setPrimaryUnit] = useState(product.primaryUnit || "KG");
  const [defaultBuyingRate, setDefaultBuyingRate] = useState(product.defaultBuyingRate !== null && product.defaultBuyingRate !== undefined ? product.defaultBuyingRate : "");
  const [defaultSellingRate, setDefaultSellingRate] = useState(product.defaultSellingRate !== null && product.defaultSellingRate !== undefined ? product.defaultSellingRate : "");
  const [buyingRateUnit, setBuyingRateUnit] = useState(product.buyingRateUnit || "KG");
  const [sellingRateUnit, setSellingRateUnit] = useState(product.sellingRateUnit || "KG");
  const [defaultSellingUnit, setDefaultSellingUnit] = useState(product.defaultSellingUnit || "KG");
  const [displayOrder, setDisplayOrder] = useState(product.displayOrder !== null && product.displayOrder !== undefined ? product.displayOrder : "0");
  const [unitRegistry, setUnitRegistry] = useState(null);

  // Category List state for updates
  const [categoryList, setCategoryList] = useState(categories);

  // Inline Category Creation
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Load Unit Registry on mount
  useEffect(() => {
    async function loadRegistry() {
      const res = await getUnitRegistryAction();
      if (res.success) {
        setUnitRegistry(res.data);
      }
    }
    loadRegistry();
  }, []);

  async function handleCreateCategoryInline() {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const result = await createCategoryAction({ name: newCategoryName.trim() });
      if (result.success) {
        toast.success(`Category "${newCategoryName}" created`);
        setCategoryList(prev => [...prev, result.data]);
        setProductCategoryId(result.data.id.toString());
        setIsNewCategory(false);
        setNewCategoryName("");
      } else {
        toast.error(result.error || "Failed to create category");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsCreatingCategory(false);
    }
  }

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

  async function handleSubmit(formData) {
    // Inject the selected values into the formData object
    formData.set("unitCategory", unitCategory);
    formData.set("productCategoryId", productCategoryId);
    formData.set("primaryUnit", primaryUnit);
    formData.set("buyingRateUnit", buyingRateUnit);
    formData.set("sellingRateUnit", sellingRateUnit);
    formData.set("defaultSellingUnit", defaultSellingUnit);
    formData.set("displayOrder", displayOrder);
    
    // Fallback deprecated category column for coexistence compatibility
    formData.set("category", unitCategory);

    const result = await updateProductAction(product.id, formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Product updated successfully");
      router.push("/products");
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
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Product Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={product.name}
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
            onChange={(e) => {
              if (e.target.value === "new") {
                setIsNewCategory(true);
                setProductCategoryId("");
              } else {
                setProductCategoryId(e.target.value);
                setIsNewCategory(false);
              }
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled hidden>-- Select Category --</option>
            <option value="new">➕ Add New Category...</option>
            {categoryList.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {isNewCategory && (
            <div className="flex gap-2 items-center mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                type="text"
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleCreateCategoryInline}
                disabled={!newCategoryName.trim() || isCreatingCategory}
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isCreatingCategory ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewCategory(false);
                  setProductCategoryId("");
                  setNewCategoryName("");
                }}
                className="border hover:bg-accent px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
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
                  defaultValue={product.unitConversion ? Number(product.unitConversion) : ""}
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

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            value="true"
            defaultChecked={product.isActive}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-sm font-medium">Product Active</label>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/products"
            className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Update Product
          </button>
        </div>
      </div>
    </form>
  );
}
