"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Edit2, Trash2, Scale, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUnitAction,
  updateUnitAction,
  deleteUnitAction
} from "@/modules/products/controllers/unitActions";
import DataTable from "@/components/ui/DataTable";

export default function UnitListClient({ initialUnits = [], categories = [] }) {
  const router = useRouter();

  const [units, setUnits] = useState(initialUnits);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  // Form States
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unitCategoryId, setUnitCategoryId] = useState("");
  const [isBase, setIsBase] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [conversionRate, setConversionRate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef(null);

  // Sync isBase / isCustom behavior
  useEffect(() => {
    if (isBase) {
      setIsCustom(false);
      setConversionRate("1.0");
    }
  }, [isBase]);

  useEffect(() => {
    if (isCustom) {
      setIsBase(false);
      setConversionRate("");
    }
  }, [isCustom]);

  const openCreateMode = () => {
    setEditingUnit(null);
    setName("");
    setCode("");
    setUnitCategoryId(categories[0]?.id || "");
    setIsBase(false);
    setIsCustom(false);
    setConversionRate("");
    setIsActive(true);
    setIsFormOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const openEditMode = (unit) => {
    setEditingUnit(unit);
    setName(unit.name);
    setCode(unit.code);
    setUnitCategoryId(unit.unitCategoryId);
    setIsBase(unit.isBase);
    setIsCustom(unit.isCustom);
    setConversionRate(unit.conversionRate !== null ? String(unit.conversionRate) : "");
    setIsActive(unit.isActive);
    setIsFormOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUnit(null);
    setName("");
    setCode("");
    setUnitCategoryId("");
    setIsBase(false);
    setIsCustom(false);
    setConversionRate("");
    setIsActive(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Unit name is required");
      return;
    }
    if (!code.trim()) {
      toast.error("Unit code is required");
      return;
    }
    if (!unitCategoryId) {
      toast.error("Category selection is required");
      return;
    }

    // Rate validation
    let rateNum = null;
    if (!isBase && !isCustom) {
      rateNum = Number(conversionRate);
      if (isNaN(rateNum) || rateNum <= 0) {
        toast.error("Conversion rate must be a valid positive number");
        return;
      }
    } else if (isBase) {
      rateNum = 1.0;
    }

    setIsSubmitting(true);
    const data = {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      unitCategoryId: Number(unitCategoryId),
      isBase,
      isCustom,
      conversionRate: rateNum,
      isActive
    };

    let result;
    if (editingUnit) {
      result = await updateUnitAction(editingUnit.id, data);
    } else {
      result = await createUnitAction(data);
    }

    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        editingUnit ? "Unit updated successfully" : "Unit created successfully"
      );
      closeForm();
      router.refresh();
      window.location.reload();
    } else {
      toast.error(result.error || "Something went wrong");
    }
  };

  const handleDelete = async (unit) => {
    if (!confirm(`Are you sure you want to delete the unit "${unit.name}" (${unit.code})?`)) {
      return;
    }

    const result = await deleteUnitAction(unit.id);
    if (result.success) {
      toast.success("Unit deleted successfully");
      router.refresh();
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to delete unit");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href="/settings"
              className="p-1 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors mr-1 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Units of Measure</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-8">
            Manage physical units, base conversions, and custom scales across the ERP system.
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={openCreateMode}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Unit
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-xl border bg-card p-6 shadow-md animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {editingUnit ? `Edit Unit: ${editingUnit.name}` : "Create Unit of Measure"}
            </h2>
            <button
              onClick={closeForm}
              className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="unit-name" className="text-sm font-medium">
                  Unit Name
                </label>
                <input
                  id="unit-name"
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kilogram, Maund, Litre"
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="unit-code" className="text-sm font-medium">
                  Unit Code ID
                </label>
                <input
                  id="unit-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. KG, MAUND, LTR"
                  required
                  disabled={!!editingUnit}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="unit-category" className="text-sm font-medium">
                  Unit Category
                </label>
                <select
                  id="unit-category"
                  value={unitCategoryId}
                  onChange={(e) => setUnitCategoryId(e.target.value)}
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-accent/20 p-4 rounded-lg border">
              <div className="space-y-2">
                <div className="flex items-center h-10">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBase}
                      onChange={(e) => setIsBase(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-medium text-foreground">
                      Is Category Base Unit
                    </span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Baseline unit (factor = 1.0) for conversion math in this category.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center h-10">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustom}
                      onChange={(e) => setIsCustom(e.target.checked)}
                      disabled={isBase}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
                    <span className="ml-3 text-sm font-medium text-foreground">
                      Is Custom Override Unit
                    </span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  E.g. BAG or PACK. Conversion factor is product-specific rather than global.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="conversion-rate" className="text-sm font-medium">
                  Conversion Rate
                </label>
                <input
                  id="conversion-rate"
                  type="number"
                  step="any"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(e.target.value)}
                  placeholder={isBase ? "1.0" : isCustom ? "Defined on Product" : "e.g. 40.0"}
                  disabled={isBase || isCustom}
                  required={!isBase && !isCustom}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  How many baseline units equal 1 unit (e.g. 1 Maund = 40.0 KG).
                </p>
              </div>
            </div>

            <div className="flex items-center h-10">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-medium text-muted-foreground">
                  Active (Show in transactions)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : editingUnit ? "Update Unit" : "Save Unit"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <DataTable
          data={units}
          emptyMessage="No units of measure configured yet."
          containerClassName="w-full"
          columns={[
            {
              key: "name",
              label: "Unit Name",
              className: "px-6 py-4 font-bold text-base flex items-center gap-3",
              render: (row, val) => (
                <>
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <span>{val}</span>
                </>
              )
            },
            {
              key: "code",
              label: "Code",
              className: "px-6 py-4 font-mono text-sm font-bold text-muted-foreground",
              render: (row, val) => val
            },
            {
              key: "unitCategory",
              label: "Category",
              className: "px-6 py-4 text-muted-foreground font-medium",
              render: (row) => row.unitCategory?.name || "N/A"
            },
            {
              key: "type",
              label: "Unit Type",
              className: "px-6 py-4",
              render: (row) => {
                if (row.isBase) return <span className="text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold">Base Unit</span>;
                if (row.isCustom) return <span className="text-xs bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold">Product-Specific</span>;
                return <span className="text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-full font-bold font-mono">Rate-Based</span>;
              }
            },
            {
              key: "conversionRate",
              label: "Multiplier Factor",
              className: "px-6 py-4 font-mono font-bold text-right",
              render: (row, val) => {
                if (row.isBase) return "1.00 (Base)";
                if (row.isCustom) return "Custom Conversion";
                return val !== null ? Number(val).toFixed(4) : "N/A";
              }
            },
            {
              key: "isActive",
              label: "Status",
              className: "px-6 py-4 text-center",
              render: (row, val) => (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border",
                    val
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-rose-100 text-rose-700 border-rose-200"
                  )}
                >
                  {val ? "Active" : "Inactive"}
                </span>
              )
            },
            {
              key: "actions",
              label: "Actions",
              className: "px-6 py-4 text-right",
              render: (row) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditMode(row)}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit Unit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(row)}
                    className="p-1.5 rounded-md hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
                    title="Delete Unit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}
